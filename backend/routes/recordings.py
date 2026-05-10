from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from supabase import create_client
from config import Config

recordings_bp = Blueprint("recordings", __name__)
supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)


@recordings_bp.route("/", methods=["POST"])
@jwt_required()
def save_recording():
    data = request.json
    try:
        result = supabase.table("recordings").insert({
            "contact_id": data.get("contact_id"),
            "campaign_id": data.get("campaign_id"),
            "audio_data": data.get("audio_data"),
            "duration": data.get("duration", 0)
        }).execute()
        return jsonify(result.data[0]), 201
    except Exception as e:
        print("Save recording error:", str(e))
        return jsonify({"error": str(e)}), 500


@recordings_bp.route("/all", methods=["GET"])
@jwt_required()
def get_all_recordings():
    user_id = get_jwt_identity()
    try:
        # Only return recordings for campaigns owned by this user
        campaigns = supabase.table("campaigns") \
            .select("id") \
            .eq("user_id", user_id) \
            .execute()
        campaign_ids = [c["id"] for c in campaigns.data]

        if not campaign_ids:
            return jsonify([]), 200

        result = supabase.table("recordings") \
            .select("*, contacts(name, phone), campaigns(name)") \
            .in_("campaign_id", campaign_ids) \
            .order("created_at", desc=True) \
            .execute()
        return jsonify(result.data), 200
    except Exception as e:
        print("Get recordings error:", str(e))
        return jsonify({"error": str(e)}), 500


@recordings_bp.route("/campaign/<campaign_id>", methods=["GET"])
@jwt_required()
def get_by_campaign(campaign_id):
    user_id = get_jwt_identity()
    try:
        # Verify campaign belongs to this user
        campaign = supabase.table("campaigns") \
            .select("id") \
            .eq("id", campaign_id) \
            .eq("user_id", user_id) \
            .execute()
        if not campaign.data:
            return jsonify([]), 200

        result = supabase.table("recordings") \
            .select("*, contacts(name, phone)") \
            .eq("campaign_id", campaign_id) \
            .order("created_at", desc=True) \
            .execute()
        return jsonify(result.data), 200
    except Exception as e:
        print("Get recordings by campaign error:", str(e))
        return jsonify({"error": str(e)}), 500


@recordings_bp.route("/<recording_id>", methods=["DELETE"])
@jwt_required()
def delete_recording(recording_id):
    user_id = get_jwt_identity()
    try:
        # Verify ownership via campaign before deleting
        rec = supabase.table("recordings") \
            .select("campaign_id") \
            .eq("id", recording_id) \
            .execute()
        if not rec.data:
            return jsonify({"error": "Not found"}), 404

        campaign = supabase.table("campaigns") \
            .select("id") \
            .eq("id", rec.data[0]["campaign_id"]) \
            .eq("user_id", user_id) \
            .execute()
        if not campaign.data:
            return jsonify({"error": "Unauthorized"}), 403

        supabase.table("recordings").delete().eq("id", recording_id).execute()
        return jsonify({"deleted": True}), 200
    except Exception as e:
        print("Delete recording error:", str(e))
        return jsonify({"error": str(e)}), 500