from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from supabase import create_client
from config import Config

transcripts_bp = Blueprint("transcripts", __name__)
supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)

@transcripts_bp.route("/", methods=["POST"])
@jwt_required()
def save_transcript():
    data = request.json
    result = supabase.table("transcripts").insert({
        "contact_id": data.get("contact_id"),
        "campaign_id": data.get("campaign_id"),
        "conversation": data.get("conversation"),
        "summary": data.get("summary"),
        "sentiment": data.get("sentiment", "neutral"),
        "duration": data.get("duration", 0)
    }).execute()
    return jsonify(result.data[0]), 201

@transcripts_bp.route("/campaign/<campaign_id>", methods=["GET"])
@jwt_required()
def get_by_campaign(campaign_id):
    result = supabase.table("transcripts")\
        .select("*, contacts(name, phone)")\
        .eq("campaign_id", campaign_id)\
        .order("created_at", desc=True)\
        .execute()
    return jsonify(result.data), 200

@transcripts_bp.route("/", methods=["GET"])
@jwt_required()
def get_all():
    try:
        result = supabase.table("transcripts")\
            .select("*, contacts(name, phone), campaigns(name)")\
            .order("created_at", desc=True)\
            .execute()
        return jsonify(result.data), 200
    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"error": str(e)}), 500

@transcripts_bp.route("/report/<campaign_id>", methods=["GET"])
@jwt_required()
def get_campaign_report(campaign_id):
    try:
        # Get campaign details
        campaign = supabase.table("campaigns")\
            .select("*")\
            .eq("id", campaign_id)\
            .execute()

        if not campaign.data:
            return jsonify({"error": "Campaign not found"}), 404

        # Get all transcripts with contact info
        transcripts = supabase.table("transcripts")\
            .select("*, contacts(name, phone)")\
            .eq("campaign_id", campaign_id)\
            .order("created_at", desc=True)\
            .execute()

        # Get all contacts
        contacts = supabase.table("contacts")\
            .select("*")\
            .eq("campaign_id", campaign_id)\
            .execute()

        t_data = transcripts.data
        c_data = contacts.data

        # Calculate stats
        total = len(c_data)
        completed = len([c for c in c_data if c['status'] == 'completed'])
        pending = len([c for c in c_data if c['status'] == 'pending'])
        positive = len([t for t in t_data if t['sentiment'] == 'positive'])
        neutral = len([t for t in t_data if t['sentiment'] == 'neutral'])
        negative = len([t for t in t_data if t['sentiment'] == 'negative'])

        return jsonify({
            "campaign": campaign.data[0],
            "stats": {
                "total_contacts": total,
                "calls_completed": completed,
                "calls_pending": pending,
                "completion_rate": round((completed / total * 100) if total > 0 else 0, 1),
                "positive": positive,
                "neutral": neutral,
                "negative": negative,
            },
            "transcripts": t_data
        }), 200

    except Exception as e:
        print(f"Report error: {str(e)}")
        return jsonify({"error": str(e)}), 500