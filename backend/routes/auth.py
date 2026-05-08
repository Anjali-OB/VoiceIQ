from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from supabase import create_client
from config import Config
import hashlib
import random
import string

auth_bp = Blueprint("auth", __name__)
supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_temp_password():
    chars = string.ascii_letters + string.digits
    return 'VIQ' + ''.join(random.choices(chars, k=7))

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    email = data.get("email")
    password = hash_password(data.get("password"))
    name = data.get("name")
    try:
        existing = supabase.table("users").select("*").eq("email", email).execute()
        if existing.data:
            return jsonify({"error": "Email already exists"}), 400
        user = supabase.table("users").insert({
            "email": email, "password": password, "name": name
        }).execute()
        token = create_access_token(identity=user.data[0]["id"])
        return jsonify({
            "token": token,
            "user": {"id": user.data[0]["id"], "email": email, "name": name}
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = hash_password(data.get("password"))
    try:
        user = supabase.table("users").select("*")\
            .eq("email", email).eq("password", password).execute()
        if not user.data:
            return jsonify({"error": "Invalid credentials"}), 401
        token = create_access_token(identity=user.data[0]["id"])
        return jsonify({
            "token": token,
            "user": {"id": user.data[0]["id"], "email": email, "name": user.data[0]["name"]}
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json
    email = data.get("email")
    try:
        user = supabase.table("users").select("*").eq("email", email).execute()
        if not user.data:
            return jsonify({"error": "No account found with this email"}), 404
        temp_password = generate_temp_password()
        hashed = hash_password(temp_password)
        supabase.table("users").update({"password": hashed}).eq("email", email).execute()
        return jsonify({
            "message": "Password reset successful",
            "temp_password": temp_password
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    try:
        result = supabase.table("users").select("id, email, name, created_at")\
            .eq("id", user_id).execute()
        if not result.data:
            return jsonify({"error": "User not found"}), 404
        return jsonify(result.data[0]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.json
    try:
        update_data = {}
        if data.get("name"):
            update_data["name"] = data["name"]
        if data.get("password"):
            update_data["password"] = hash_password(data["password"])
        result = supabase.table("users").update(update_data).eq("id", user_id).execute()
        return jsonify({
            "message": "Profile updated successfully",
            "user": {"id": user_id, "name": update_data.get("name")}
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_stats():
    user_id = get_jwt_identity()
    try:
        campaigns = supabase.table("campaigns").select("*").eq("user_id", user_id).execute()
        campaign_ids = [c["id"] for c in campaigns.data]
        total_contacts = 0
        total_transcripts = 0
        if campaign_ids:
            contacts = supabase.table("contacts").select("id")\
                .in_("campaign_id", campaign_ids).execute()
            transcripts = supabase.table("transcripts").select("id")\
                .in_("campaign_id", campaign_ids).execute()
            total_contacts = len(contacts.data)
            total_transcripts = len(transcripts.data)
        return jsonify({
            "total_campaigns": len(campaigns.data),
            "total_contacts": total_contacts,
            "total_calls": total_transcripts,
            "completed_campaigns": len([c for c in campaigns.data if c["status"] == "completed"])
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500