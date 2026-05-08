from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from supabase import create_client
from config import Config
import sys
import os
from ml.rf_success_model import (
    train_rf_model, predict_success,
    predict_batch_success, get_rf_stats
)
from ml.nlp_extractor import full_nlp_analysis

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from ml.sentiment_model import (
    predict_sentiment, train_model,
    get_model_stats, predict_batch,
    extract_conversation_text
)

ml_bp = Blueprint("ml", __name__)
supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)


@ml_bp.route("/train", methods=["POST"])
@jwt_required()
def train():
    try:
        user_id = get_jwt_identity()
        custom_data = []

        # Fetch real call data from Supabase to augment training
        try:
            campaigns = supabase.table("campaigns")\
                .select("id")\
                .eq("user_id", user_id)\
                .execute()

            if campaigns.data:
                campaign_ids = [c["id"] for c in campaigns.data]
                transcripts = supabase.table("transcripts")\
                    .select("conversation, sentiment")\
                    .in_("campaign_id", campaign_ids)\
                    .execute()

                for t in transcripts.data:
                    conversation = t.get("conversation", [])
                    sentiment = t.get("sentiment", "")
                    text = extract_conversation_text(conversation)

                    if text and sentiment in ["positive", "neutral", "negative"]:
                        custom_data.append((text, sentiment))

                print(f"Found {len(custom_data)} real call samples for training")
        except Exception as e:
            print(f"Could not fetch real data: {e}")

        stats = train_model(custom_data if custom_data else None)
        return jsonify(stats), 200

    except Exception as e:
        print(f"Training error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/predict-sentiment", methods=["POST"])
@jwt_required()
def predict():
    try:
        data = request.json
        text = data.get("text", "")
        if not text:
            return jsonify({"error": "Text is required"}), 400
        result = predict_sentiment(text)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/stats", methods=["GET"])
@jwt_required()
def stats():
    try:
        result = get_model_stats()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/analyze-campaign", methods=["POST"])
@jwt_required()
def analyze_campaign():
    try:
        data = request.json
        campaign_id = data.get("campaign_id")

        if not campaign_id:
            return jsonify({"error": "campaign_id required"}), 400

        transcripts = supabase.table("transcripts")\
            .select("*, contacts(name, phone)")\
            .eq("campaign_id", campaign_id)\
            .execute()

        if not transcripts.data:
            return jsonify({
                "results": [],
                "sentiment_counts": {"positive": 0, "neutral": 0, "negative": 0},
                "total": 0,
                "agreement_with_groq": 0,
                "message": "No transcripts found for this campaign"
            }), 200

        results = []
        sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}
        agreements = 0

        for t in transcripts.data:
            conversation = t.get("conversation", [])

            # Extract ONLY the contact's actual spoken words
            contact_text = extract_conversation_text(conversation)

            print(f"Contact: {t.get('contacts', {})}")
            print(f"Extracted text: '{contact_text}'")

            if not contact_text or len(contact_text.strip()) < 3:
                # No meaningful speech detected
                results.append({
                    "contact": t["contacts"]["name"] if t.get("contacts") else "Unknown",
                    "phone": t["contacts"]["phone"] if t.get("contacts") else "",
                    "contact_speech": "(no speech detected)",
                    "ml_sentiment": "neutral",
                    "confidence": 50.0,
                    "probabilities": {"negative": 33.3, "neutral": 33.4, "positive": 33.3},
                    "groq_sentiment": t.get("sentiment", "neutral"),
                    "agreement": True,
                    "turns": len(conversation)
                })
                continue

            # Run ML prediction on this contact's actual words
            ml_result = predict_sentiment(contact_text)
            groq_sentiment = t.get("sentiment", "neutral")
            agree = ml_result["sentiment"] == groq_sentiment

            if agree:
                agreements += 1

            sentiment_counts[ml_result["sentiment"]] = \
                sentiment_counts.get(ml_result["sentiment"], 0) + 1

            # Count turns
            user_turns = [turn for turn in conversation
                         if isinstance(turn, dict) and turn.get("role") == "user"]

            results.append({
                "contact": t["contacts"]["name"] if t.get("contacts") else "Unknown",
                "phone": t["contacts"]["phone"] if t.get("contacts") else "",
                "contact_speech": contact_text[:200] + "..." if len(contact_text) > 200 else contact_text,
                "ml_sentiment": ml_result["sentiment"],
                "confidence": ml_result["confidence"],
                "probabilities": ml_result["probabilities"],
                "groq_sentiment": groq_sentiment,
                "agreement": agree,
                "turns": len(user_turns),
                "word_count": len(contact_text.split())
            })

        total = len(results)
        agreement_pct = round((agreements / total * 100) if total > 0 else 0, 1)

        # Dominant sentiment
        dominant = max(sentiment_counts, key=sentiment_counts.get)

        return jsonify({
            "results": results,
            "sentiment_counts": sentiment_counts,
            "total": total,
            "agreement_with_groq": agreement_pct,
            "dominant_sentiment": dominant,
            "high_confidence": len([r for r in results if r["confidence"] > 70])
        }), 200

    except Exception as e:
        print(f"Campaign analysis error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@ml_bp.route("/rf/train", methods=["POST"])
@jwt_required()
def train_rf():
    try:
        user_id = get_jwt_identity()
        real_data = []

        try:
            campaigns = supabase.table("campaigns")\
                .select("id, script, language, created_at")\
                .eq("user_id", user_id).execute()

            if campaigns.data:
                campaign_map = {c["id"]: c for c in campaigns.data}
                campaign_ids = list(campaign_map.keys())

                transcripts = supabase.table("transcripts")\
                    .select("*, contacts(name, phone, group_name)")\
                    .in_("campaign_id", campaign_ids).execute()

                for t in transcripts.data:
                    camp = campaign_map.get(t["campaign_id"], {})
                    contact = t.get("contacts") or {}
                    sentiment = t.get("sentiment", "neutral")
                    label = 1 if sentiment == "positive" else 0

                    real_data.append({
                        "name": contact.get("name", ""),
                        "phone": contact.get("phone", ""),
                        "group_name": contact.get("group_name", "General"),
                        "language": camp.get("language", "en-US"),
                        "script": camp.get("script", ""),
                        "created_at": camp.get("created_at", ""),
                        "past_success_rate": 0.5,
                        "label": label
                    })

                print(f"Found {len(real_data)} real samples for RF training")
        except Exception as e:
            print(f"Could not fetch real data: {e}")

        stats = train_rf_model(real_data if real_data else None)
        return jsonify(stats), 200

    except Exception as e:
        print(f"RF Training error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/rf/stats", methods=["GET"])
@jwt_required()
def rf_stats():
    try:
        result = get_rf_stats()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/rf/predict", methods=["POST"])
@jwt_required()
def rf_predict():
    try:
        data = request.json
        result = predict_success(data)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/rf/predict-batch", methods=["POST"])
@jwt_required()
def rf_predict_batch():
    try:
        data = request.json
        contacts = data.get("contacts", [])
        campaign = data.get("campaign", {})

        # Enrich contacts with campaign data
        for c in contacts:
            c["language"] = campaign.get("language", "en-US")
            c["script"] = campaign.get("script", "")
            c["created_at"] = campaign.get("created_at", "")

            # Calculate past success rate from existing transcripts
            c["past_success_rate"] = 0.5  # default

        results = predict_batch_success(contacts)
        return jsonify({"predictions": results, "total": len(results)}), 200

    except Exception as e:
        print(f"RF batch predict error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/rf/campaign-analysis", methods=["POST"])
@jwt_required()
def rf_campaign_analysis():
    try:
        data = request.json
        campaign_id = data.get("campaign_id")

        campaign = supabase.table("campaigns")\
            .select("*").eq("id", campaign_id).execute()
        contacts = supabase.table("contacts")\
            .select("*").eq("campaign_id", campaign_id).execute()
        transcripts = supabase.table("transcripts")\
            .select("contact_id, sentiment")\
            .eq("campaign_id", campaign_id).execute()

        if not campaign.data:
            return jsonify({"error": "Campaign not found"}), 404

        camp_data = campaign.data[0]

        # Build actual outcome map
        actual_outcomes = {}
        for t in transcripts.data:
            actual_outcomes[t["contact_id"]] = 1 if t["sentiment"] == "positive" else 0

        total_positive = sum(actual_outcomes.values())
        actual_success_rate = total_positive / len(actual_outcomes) if actual_outcomes else 0

        # Predict for all contacts
        contact_list = []
        for c in contacts.data:
            c["language"] = camp_data.get("language", "en-US")
            c["script"] = camp_data.get("script", "")
            c["created_at"] = camp_data.get("created_at", "")
            c["past_success_rate"] = actual_success_rate
            contact_list.append(c)

        predictions = predict_batch_success(contact_list)

        # Calculate prediction accuracy for completed contacts
        correct = 0
        total_compared = 0
        for pred in predictions:
            contact_id = pred["id"]
            if contact_id in actual_outcomes:
                actual = actual_outcomes[contact_id]
                predicted = 1 if pred["score"] >= 50 else 0
                if actual == predicted:
                    correct += 1
                total_compared += 1

        prediction_accuracy = round((correct / total_compared * 100) if total_compared > 0 else 0, 1)

        return jsonify({
            "predictions": predictions,
            "campaign": camp_data,
            "actual_success_rate": round(actual_success_rate * 100, 1),
            "prediction_accuracy": prediction_accuracy,
            "total_contacts": len(contacts.data),
            "total_with_outcomes": len(actual_outcomes)
        }), 200

    except Exception as e:
        print(f"RF campaign analysis error: {str(e)}")
        return jsonify({"error": str(e)}), 500  

@ml_bp.route("/nlp/analyze", methods=["POST"])
@jwt_required()
def nlp_analyze():
    try:
        data = request.json
        campaign_id = data.get("campaign_id")

        if not campaign_id:
            return jsonify({"error": "campaign_id required"}), 400

        # Fetch transcripts with conversation data
        transcripts = supabase.table("transcripts")\
            .select("conversation, sentiment, contacts(name, phone)")\
            .eq("campaign_id", campaign_id)\
            .execute()

        if not transcripts.data:
            return jsonify({"error": "No transcripts found for this campaign"}), 404

        print(f"Running NLP on {len(transcripts.data)} transcripts...")
        result = full_nlp_analysis(transcripts.data)
        return jsonify(result), 200

    except Exception as e:
        print(f"NLP analysis error: {str(e)}")
        return jsonify({"error": str(e)}), 500      
    
    