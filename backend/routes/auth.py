from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from supabase import create_client
from config import Config
import hashlib

auth_bp = Blueprint("auth", __name__)
supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

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
            "email": email,
            "password": password,
            "name": name
        }).execute()

        token = create_access_token(identity=user.data[0]["id"])
        return jsonify({"token": token, "user": {"id": user.data[0]["id"], "email": email, "name": name}}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = hash_password(data.get("password"))

    try:
        user = supabase.table("users").select("*").eq("email", email).eq("password", password).execute()

        if not user.data:
            return jsonify({"error": "Invalid credentials"}), 401

        token = create_access_token(identity=user.data[0]["id"])
        return jsonify({"token": token, "user": {"id": user.data[0]["id"], "email": email, "name": user.data[0]["name"]}}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500