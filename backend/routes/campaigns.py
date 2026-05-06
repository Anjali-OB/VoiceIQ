from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from supabase import create_client
from config import Config
from datetime import datetime, timezone

campaigns_bp = Blueprint("campaigns", __name__)
supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)

@campaigns_bp.route("/", methods=["GET"])
@jwt_required()
def get_campaigns():
    user_id = get_jwt_identity()
    result = supabase.table("campaigns")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .execute()
    return jsonify(result.data), 200

@campaigns_bp.route("/", methods=["POST"])
@jwt_required()
def create_campaign():
    user_id = get_jwt_identity()
    data = request.json

    scheduled_at = data.get("scheduled_at")
    status = "scheduled" if scheduled_at else "draft"

    result = supabase.table("campaigns").insert({
        "user_id": user_id,
        "name": data.get("name"),
        "script": data.get("script"),
        "language": data.get("language", "en-US"),
        "scheduled_at": scheduled_at,
        "status": status
    }).execute()
    return jsonify(result.data[0]), 201

@campaigns_bp.route("/<campaign_id>", methods=["PUT"])
@jwt_required()
def update_campaign(campaign_id):
    data = request.json
    result = supabase.table("campaigns")\
        .update(data)\
        .eq("id", campaign_id)\
        .execute()
    return jsonify(result.data[0]), 200

@campaigns_bp.route("/<campaign_id>", methods=["DELETE"])
@jwt_required()
def delete_campaign(campaign_id):
    try:
        supabase.table("campaigns").delete().eq("id", campaign_id).execute()
        return jsonify({"message": "Deleted"}), 200
    except Exception as e:
        print(f"Delete error: {str(e)}")
        return jsonify({"error": str(e)}), 500