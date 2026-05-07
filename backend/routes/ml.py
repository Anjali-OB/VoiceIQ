from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from supabase import create_client
from config import Config
import sys
import os

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