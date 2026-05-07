from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from supabase import create_client
from config import Config
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from ml.sentiment_model import predict_sentiment, train_model, get_model_stats

ml_bp = Blueprint("ml", __name__)
supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)


@ml_bp.route("/train", methods=["POST"])
@jwt_required()
def train():
    try:
        stats = train_model()
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
        print(f"Prediction error: {str(e)}")
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

        transcripts = supabase.table("transcripts")\
            .select("*, contacts(name, phone)")\
            .eq("campaign_id", campaign_id)\
            .execute()

        results = []
        sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}

        for t in transcripts.data:
            conversation = t.get("conversation", [])
            contact_text = " ".join([
                turn["content"] for turn in conversation
                if turn.get("role") == "user" and turn.get("content")
            ])

            if not contact_text:
                continue

            ml_result = predict_sentiment(contact_text)
            sentiment_counts[ml_result["sentiment"]] += 1

            results.append({
                "contact": t["contacts"]["name"] if t.get("contacts") else "Unknown",
                "phone": t["contacts"]["phone"] if t.get("contacts") else "",
                "ml_sentiment": ml_result["sentiment"],
                "confidence": ml_result["confidence"],
                "probabilities": ml_result["probabilities"],
                "groq_sentiment": t.get("sentiment", "neutral")
            })

        total = len(results)
        agreement = len([r for r in results if r["ml_sentiment"] == r["groq_sentiment"]])
        agreement_pct = round((agreement / total * 100) if total > 0 else 0, 1)

        return jsonify({
            "results": results,
            "sentiment_counts": sentiment_counts,
            "total": total,
            "agreement_with_groq": agreement_pct
        }), 200

    except Exception as e:
        print(f"Campaign analysis error: {str(e)}")
        return jsonify({"error": str(e)}), 500