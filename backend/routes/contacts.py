from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from supabase import create_client
from config import Config

contacts_bp = Blueprint("contacts", __name__)
supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)

@contacts_bp.route("/<campaign_id>", methods=["GET"])
@jwt_required()
def get_contacts(campaign_id):
    result = supabase.table("contacts")\
        .select("*")\
        .eq("campaign_id", campaign_id)\
        .order("created_at", desc=True)\
        .execute()
    return jsonify(result.data), 200

@contacts_bp.route("/bulk", methods=["POST"])
@jwt_required()
def bulk_create_contacts():
    data = request.json
    campaign_id = data.get("campaign_id")
    contacts = data.get("contacts", [])
    group_name = data.get("group_name", "General")

    rows = [{
        "campaign_id": campaign_id,
        "name": c.get("name", ""),
        "phone": c.get("phone", ""),
        "group_name": c.get("group_name", group_name),
        "status": "pending"
    } for c in contacts]

    result = supabase.table("contacts").insert(rows).execute()
    return jsonify({"inserted": len(result.data)}), 201

@contacts_bp.route("/<contact_id>/status", methods=["PUT"])
@jwt_required()
def update_status(contact_id):
    data = request.json
    result = supabase.table("contacts")\
        .update({"status": data.get("status")})\
        .eq("id", contact_id)\
        .execute()
    return jsonify(result.data[0]), 200

@contacts_bp.route("/<contact_id>/tag", methods=["PUT"])
@jwt_required()
def update_tag(contact_id):
    data = request.json
    result = supabase.table("contacts")\
        .update({"group_name": data.get("group_name")})\
        .eq("id", contact_id)\
        .execute()
    return jsonify(result.data[0]), 200