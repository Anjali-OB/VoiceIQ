from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from supabase import create_client
from config import Config

recordings_bp = Blueprint("recordings_api", __name__)
supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)

@recordings_bp.route("/", methods=["POST"])
@jwt_required()
def save_recording():
    try:
        data = request.json
        result = supabase.table("recordings").insert({
            "contact_id": data.get("contact_id"),
            "campaign_id": data.get("campaign_id"),
            "transcript_id": data.get("transcript_id"),
            "audio_data": data.get("audio_data"),
            "duration": data.get("duration", 0)
        }).execute()
        return jsonify(result.data[0]), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@recordings_bp.route("/campaign/<campaign_id>", methods=["GET"])
@jwt_required()
def get_recordings(campaign_id):
    try:
        result = supabase.table("recordings")\
            .select("*, contacts(name, phone)")\
            .eq("campaign_id", campaign_id)\
            .order("created_at", desc=True)\
            .execute()
        return jsonify(result.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@recordings_bp.route("/all", methods=["GET"])
@jwt_required()
def get_all_recordings():
    try:
        result = supabase.table("recordings")\
            .select("*, contacts(name, phone), campaigns(name)")\
            .order("created_at", desc=True)\
            .execute()
        return jsonify(result.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@recordings_bp.route("/<recording_id>", methods=["DELETE"])
@jwt_required()
def delete_recording(recording_id):
    try:
        supabase.table("recordings").delete().eq("id", recording_id).execute()
        return jsonify({"message": "Deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500