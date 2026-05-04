from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
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
    result = supabase.table("transcripts").select("*, contacts(name, phone)").eq("campaign_id", campaign_id).order("created_at", desc=True).execute()
    return jsonify(result.data), 200

@transcripts_bp.route("/", methods=["GET"])
@jwt_required()
def get_all():
    result = supabase.table("transcripts").select("*, contacts(name, phone), campaigns(name)").order("created_at", desc=True).execute()
    return jsonify(result.data), 200