from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from supabase import create_client
from config import Config
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

ml_bp = Blueprint("ml", __name__)
supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)

def get_churn_model():
    from ml.churn_model import train_churn_model, predict_churn, predict_churn_batch, get_churn_stats
    return train_churn_model, predict_churn, predict_churn_batch, get_churn_stats

def get_lstm_model():
    from ml.lstm_quality import train_lstm_model, predict_quality, get_lstm_stats
    return train_lstm_model, predict_quality, get_lstm_stats

def get_sentiment_model():
    from ml.sentiment_model import predict_sentiment, train_model, get_model_stats, extract_conversation_text
    return predict_sentiment, train_model, get_model_stats, extract_conversation_text

def get_rf_model():
    from ml.rf_success_model import train_rf_model, predict_success, predict_batch_success, get_rf_stats
    return train_rf_model, predict_success, predict_batch_success, get_rf_stats

def get_nlp_model():
    from ml.nlp_extractor import full_nlp_analysis
    return full_nlp_analysis

# ── SENTIMENT ROUTES ──────────────────────────────────────────────

@ml_bp.route("/train", methods=["POST"])
@jwt_required()
def train():
    try:
        predict_sentiment, train_model, get_model_stats, extract_conversation_text = get_sentiment_model()
        user_id = get_jwt_identity()
        custom_data = []
        try:
            campaigns = supabase.table("campaigns").select("id").eq("user_id", user_id).execute()
            if campaigns.data:
                campaign_ids = [c["id"] for c in campaigns.data]
                transcripts = supabase.table("transcripts").select("conversation, sentiment").in_("campaign_id", campaign_ids).execute()
                for t in transcripts.data:
                    text = extract_conversation_text(t.get("conversation", []))
                    sentiment = t.get("sentiment", "")
                    if text and sentiment in ["positive", "neutral", "negative"]:
                        custom_data.append((text, sentiment))
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
        predict_sentiment, _, __, ___ = get_sentiment_model()
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
        _, __, get_model_stats, ___ = get_sentiment_model()
        return jsonify(get_model_stats()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ml_bp.route("/analyze-campaign", methods=["POST"])
@jwt_required()
def analyze_campaign():
    try:
        predict_sentiment, _, __, extract_conversation_text = get_sentiment_model()
        data = request.json
        campaign_id = data.get("campaign_id")
        transcripts = supabase.table("transcripts").select("*, contacts(name, phone)").eq("campaign_id", campaign_id).execute()
        results = []
        sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}
        agreements = 0
        for t in transcripts.data:
            contact_text = extract_conversation_text(t.get("conversation", []))
            groq_sentiment = t.get("sentiment", "neutral")
            if not contact_text or len(contact_text.strip()) < 3:
                results.append({
                    "contact": t["contacts"]["name"] if t.get("contacts") else "Unknown",
                    "phone": t["contacts"]["phone"] if t.get("contacts") else "",
                    "contact_speech": "(no speech detected)",
                    "ml_sentiment": "neutral",
                    "confidence": 50.0,
                    "probabilities": {"negative": 33.3, "neutral": 33.4, "positive": 33.3},
                    "groq_sentiment": groq_sentiment,
                    "agreement": groq_sentiment == "neutral",
                    "turns": len(t.get("conversation", []))
                })
                continue
            ml_result = predict_sentiment(contact_text)
            agree = ml_result["sentiment"] == groq_sentiment
            if agree:
                agreements += 1
            sentiment_counts[ml_result["sentiment"]] = sentiment_counts.get(ml_result["sentiment"], 0) + 1
            results.append({
                "contact": t["contacts"]["name"] if t.get("contacts") else "Unknown",
                "phone": t["contacts"]["phone"] if t.get("contacts") else "",
                "contact_speech": contact_text[:200],
                "ml_sentiment": ml_result["sentiment"],
                "confidence": ml_result["confidence"],
                "probabilities": ml_result["probabilities"],
                "groq_sentiment": groq_sentiment,
                "agreement": agree,
                "turns": len([x for x in t.get("conversation", []) if isinstance(x, dict) and x.get("role") == "user"]),
                "word_count": len(contact_text.split())
            })
        total = len(results)
        return jsonify({
            "results": results,
            "sentiment_counts": sentiment_counts,
            "total": total,
            "agreement_with_groq": round((agreements / total * 100) if total > 0 else 0, 1),
            "dominant_sentiment": max(sentiment_counts, key=sentiment_counts.get),
            "high_confidence": len([r for r in results if r.get("confidence", 0) > 70])
        }), 200
    except Exception as e:
        print(f"Campaign analysis error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ── RF ROUTES ──────────────────────────────────────────────────────

@ml_bp.route("/rf/train", methods=["POST"])
@jwt_required()
def train_rf():
    try:
        train_rf_model, _, __, ___ = get_rf_model()
        user_id = get_jwt_identity()
        real_data = []
        try:
            campaigns = supabase.table("campaigns").select("id, script, language, created_at").eq("user_id", user_id).execute()
            if campaigns.data:
                campaign_map = {c["id"]: c for c in campaigns.data}
                transcripts = supabase.table("transcripts").select("*, contacts(name, phone, group_name)").in_("campaign_id", list(campaign_map.keys())).execute()
                for t in transcripts.data:
                    camp = campaign_map.get(t["campaign_id"], {})
                    contact = t.get("contacts") or {}
                    real_data.append({
                        "name": contact.get("name", ""),
                        "phone": contact.get("phone", ""),
                        "group_name": contact.get("group_name", "General"),
                        "language": camp.get("language", "en-US"),
                        "script": camp.get("script", ""),
                        "created_at": camp.get("created_at", ""),
                        "past_success_rate": 0.5,
                        "label": 1 if t.get("sentiment") == "positive" else 0
                    })
        except Exception as e:
            print(f"Could not fetch real data: {e}")
        return jsonify(train_rf_model(real_data if real_data else None)), 200
    except Exception as e:
        print(f"RF Training error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ml_bp.route("/rf/stats", methods=["GET"])
@jwt_required()
def rf_stats():
    try:
        _, __, ___, get_rf_stats = get_rf_model()
        return jsonify(get_rf_stats()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ml_bp.route("/rf/predict", methods=["POST"])
@jwt_required()
def rf_predict():
    try:
        _, predict_success, __, ___ = get_rf_model()
        return jsonify(predict_success(request.json)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ml_bp.route("/rf/predict-batch", methods=["POST"])
@jwt_required()
def rf_predict_batch():
    try:
        _, __, predict_batch_success, ___ = get_rf_model()
        data = request.json
        contacts = data.get("contacts", [])
        campaign = data.get("campaign", {})
        if not contacts:
            return jsonify({"predictions": [], "total": 0}), 200
        enriched = []
        for c in contacts:
            ec = dict(c)
            ec["language"] = campaign.get("language", "en-US")
            ec["script"] = campaign.get("script", "")
            ec["created_at"] = campaign.get("created_at", "")
            ec["past_success_rate"] = 0.5
            enriched.append(ec)
        results = predict_batch_success(enriched)
        return jsonify({"predictions": results, "total": len(results)}), 200
    except Exception as e:
        print(f"RF batch error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ml_bp.route("/rf/campaign-analysis", methods=["POST"])
@jwt_required()
def rf_campaign_analysis():
    try:
        _, __, predict_batch_success, ___ = get_rf_model()
        campaign_id = request.json.get("campaign_id")
        campaign = supabase.table("campaigns").select("*").eq("id", campaign_id).execute()
        contacts = supabase.table("contacts").select("*").eq("campaign_id", campaign_id).execute()
        transcripts = supabase.table("transcripts").select("contact_id, sentiment").eq("campaign_id", campaign_id).execute()
        if not campaign.data:
            return jsonify({"error": "Campaign not found"}), 404
        camp_data = campaign.data[0]
        actual_outcomes = {t["contact_id"]: 1 if t["sentiment"] == "positive" else 0 for t in transcripts.data}
        actual_success_rate = sum(actual_outcomes.values()) / len(actual_outcomes) if actual_outcomes else 0.5
        contact_list = []
        for c in contacts.data:
            ec = dict(c)
            ec["language"] = camp_data.get("language", "en-US")
            ec["script"] = camp_data.get("script", "")
            ec["created_at"] = camp_data.get("created_at", "")
            ec["past_success_rate"] = actual_success_rate
            contact_list.append(ec)
        predictions = predict_batch_success(contact_list)
        correct = sum(1 for p in predictions if p["id"] in actual_outcomes and
                     (1 if p["score"] >= 50 else 0) == actual_outcomes[p["id"]])
        total_compared = len([p for p in predictions if p["id"] in actual_outcomes])
        return jsonify({
            "predictions": predictions,
            "campaign": camp_data,
            "actual_success_rate": round(actual_success_rate * 100, 1),
            "prediction_accuracy": round((correct / total_compared * 100) if total_compared > 0 else 0, 1),
            "total_contacts": len(contacts.data),
            "total_with_outcomes": len(actual_outcomes)
        }), 200
    except Exception as e:
        print(f"RF campaign analysis error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ── NLP ROUTES ─────────────────────────────────────────────────────

@ml_bp.route("/nlp/analyze", methods=["POST"])
@jwt_required()
def nlp_analyze():
    try:
        full_nlp_analysis = get_nlp_model()
        campaign_id = request.json.get("campaign_id")
        if not campaign_id:
            return jsonify({"error": "campaign_id required"}), 400
        transcripts = supabase.table("transcripts")\
            .select("conversation, sentiment, contacts(name, phone)")\
            .eq("campaign_id", campaign_id).execute()
        if not transcripts.data:
            return jsonify({"error": "No transcripts found. Run some calls first."}), 404
        print(f"Running NLP on {len(transcripts.data)} transcripts...")
        result = full_nlp_analysis(transcripts.data)
        return jsonify(result), 200
    except Exception as e:
        print(f"NLP analysis error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ── CHURN ROUTES (Module 18) ──────────────────────────────────────

@ml_bp.route("/churn/train", methods=["POST"])
@jwt_required()
def train_churn():
    try:
        train_churn_model, _, __, ___ = get_churn_model()
        user_id = get_jwt_identity()
        real_contacts = []
        try:
            campaigns = supabase.table("campaigns").select("id").eq("user_id", user_id).execute()
            if campaigns.data:
                campaign_ids = [c["id"] for c in campaigns.data]
                contacts = supabase.table("contacts").select("*").in_("campaign_id", campaign_ids).execute()
                transcripts = supabase.table("transcripts").select("contact_id, sentiment, duration").in_("campaign_id", campaign_ids).execute()

                t_map = {}
                for t in transcripts.data:
                    cid = t["contact_id"]
                    if cid not in t_map:
                        t_map[cid] = {'sentiments': [], 'durations': []}
                    t_map[cid]['sentiments'].append(t.get("sentiment", "neutral"))
                    t_map[cid]['durations'].append(t.get("duration", 0))

                for c in contacts.data:
                    t_data = t_map.get(c["id"], {})
                    sentiments = t_data.get('sentiments', [])
                    durations = t_data.get('durations', [])
                    s_map = {'positive': 1.0, 'neutral': 0.0, 'negative': -1.0}
                    avg_s = np.mean([s_map.get(s, 0) for s in sentiments]) if sentiments else 0.0
                    pos = sum(1 for s in sentiments if s == 'positive')
                    neg = sum(1 for s in sentiments if s == 'negative')
                    no_resp = 0
                    real_contacts.append({
                        'id': c['id'],
                        'name': c.get('name', ''),
                        'phone': c.get('phone', ''),
                        'group_name': c.get('group_name', 'General'),
                        'call_count': max(len(sentiments), 1),
                        'avg_sentiment': float(avg_s),
                        'response_rate': pos / max(len(sentiments), 1),
                        'no_response_count': no_resp,
                        'avg_duration': float(np.mean(durations)) if durations else 30.0,
                        'positive_calls': pos,
                        'negative_calls': neg,
                        'churn_risk': neg > pos
                    })
        except Exception as e:
            print(f"Could not fetch real contacts: {e}")

        import numpy as np
        stats = train_churn_model(real_contacts if real_contacts else None)
        return jsonify(stats), 200
    except Exception as e:
        print(f"Churn training error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/churn/stats", methods=["GET"])
@jwt_required()
def churn_stats():
    try:
        _, __, ___, get_churn_stats = get_churn_model()
        return jsonify(get_churn_stats()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/churn/predict", methods=["POST"])
@jwt_required()
def churn_predict():
    try:
        _, predict_churn, __, ___ = get_churn_model()
        return jsonify(predict_churn(request.json)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/churn/campaign", methods=["POST"])
@jwt_required()
def churn_campaign():
    try:
        _, __, predict_churn_batch, ___ = get_churn_model()
        import numpy as np
        campaign_id = request.json.get("campaign_id")
        contacts = supabase.table("contacts").select("*").eq("campaign_id", campaign_id).execute()
        transcripts = supabase.table("transcripts").select("contact_id, sentiment, duration").eq("campaign_id", campaign_id).execute()

        t_map = {}
        for t in transcripts.data:
            cid = t["contact_id"]
            if cid not in t_map:
                t_map[cid] = {'sentiments': [], 'durations': []}
            t_map[cid]['sentiments'].append(t.get("sentiment", "neutral"))
            t_map[cid]['durations'].append(t.get("duration", 0))

        enriched = []
        s_map = {'positive': 1.0, 'neutral': 0.0, 'negative': -1.0}
        for c in contacts.data:
            t_data = t_map.get(c["id"], {})
            sentiments = t_data.get('sentiments', [])
            durations = t_data.get('durations', [])
            avg_s = float(np.mean([s_map.get(s, 0) for s in sentiments])) if sentiments else 0.0
            pos = sum(1 for s in sentiments if s == 'positive')
            neg = sum(1 for s in sentiments if s == 'negative')
            enriched.append({
                'id': c['id'], 'name': c.get('name', ''), 'phone': c.get('phone', ''),
                'group_name': c.get('group_name', 'General'),
                'call_count': max(len(sentiments), 1),
                'avg_sentiment': avg_s,
                'response_rate': pos / max(len(sentiments), 1),
                'no_response_count': 0,
                'avg_duration': float(np.mean(durations)) if durations else 30.0,
                'positive_calls': pos, 'negative_calls': neg
            })

        results = predict_churn_batch(enriched)
        return jsonify({"results": results, "total": len(results)}), 200
    except Exception as e:
        print(f"Churn campaign error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ── LSTM ROUTES (Module 19) ───────────────────────────────────────

@ml_bp.route("/lstm/train", methods=["POST"])
@jwt_required()
def lstm_train():
    try:
        train_lstm_model, _, __ = get_lstm_model()
        user_id = get_jwt_identity()
        transcripts_data = []
        try:
            campaigns = supabase.table("campaigns").select("id").eq("user_id", user_id).execute()
            if campaigns.data:
                campaign_ids = [c["id"] for c in campaigns.data]
                result = supabase.table("transcripts").select("conversation, sentiment").in_("campaign_id", campaign_ids).execute()
                transcripts_data = result.data
                print(f"Found {len(transcripts_data)} real transcripts for LSTM training")
        except Exception as e:
            print(f"Could not fetch transcripts: {e}")

        stats = train_lstm_model(transcripts_data if transcripts_data else None)
        return jsonify(stats), 200
    except Exception as e:
        print(f"LSTM training error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/lstm/stats", methods=["GET"])
@jwt_required()
def lstm_stats():
    try:
        _, __, get_lstm_stats = get_lstm_model()
        result = get_lstm_stats()
        if not result:
            return jsonify({"error": "Model not trained yet"}), 404
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/lstm/predict", methods=["POST"])
@jwt_required()
def lstm_predict():
    try:
        _, predict_quality, __ = get_lstm_model()
        data = request.json
        conversation = data.get("conversation", [])
        sentiment = data.get("sentiment", "neutral")
        result = predict_quality(conversation, sentiment)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ml_bp.route("/lstm/score-campaign", methods=["POST"])
@jwt_required()
def lstm_score_campaign():
    try:
        _, predict_quality, __ = get_lstm_model()
        campaign_id = request.json.get("campaign_id")
        transcripts = supabase.table("transcripts").select("*, contacts(name, phone)").eq("campaign_id", campaign_id).execute()

        if not transcripts.data:
            return jsonify({"error": "No transcripts found"}), 404

        results = []
        scores = []
        for t in transcripts.data:
            result = predict_quality(t.get("conversation", []), t.get("sentiment", "neutral"))
            scores.append(result['score'])
            results.append({
                "contact": t["contacts"]["name"] if t.get("contacts") else "Unknown",
                "phone": t["contacts"]["phone"] if t.get("contacts") else "",
                "score": result['score'],
                "label": result['label'],
                "color": result['color'],
                "sentiment": t.get("sentiment", "neutral"),
                "features": result.get("features", {})
            })

        results.sort(key=lambda x: x['score'], reverse=True)

        import numpy as np
        return jsonify({
            "results": results,
            "avg_score": round(float(np.mean(scores)), 1),
            "max_score": round(float(np.max(scores)), 1),
            "min_score": round(float(np.min(scores)), 1),
            "excellent": len([r for r in results if r['score'] >= 85]),
            "good": len([r for r in results if 70 <= r['score'] < 85]),
            "average": len([r for r in results if 50 <= r['score'] < 70]),
            "poor": len([r for r in results if r['score'] < 50])
        }), 200
    except Exception as e:
        print(f"LSTM score campaign error: {str(e)}")
        return jsonify({"error": str(e)}), 500        