from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

vision_bp = Blueprint("vision_api", __name__)


def get_vision():
    from ml.face_verifier import (
        analyze_image, register_face, verify_face,
        get_registered_contacts, delete_face, get_system_info
    )
    return analyze_image, register_face, verify_face, get_registered_contacts, delete_face, get_system_info


@vision_bp.route("/info", methods=["GET"])
@jwt_required()
def info():
    try:
        _, __, ___, ____, _____, get_system_info = get_vision()
        return jsonify(get_system_info()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@vision_bp.route("/analyze", methods=["POST"])
@jwt_required()
def analyze():
    try:
        analyze_image, _, __, ___, ____, _____ = get_vision()
        data = request.json
        image = data.get("image", "")
        if not image:
            return jsonify({"error": "No image provided"}), 400
        result = analyze_image(image)
        return jsonify(result), 200
    except Exception as e:
        print(f"Vision analyze error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@vision_bp.route("/register", methods=["POST"])
@jwt_required()
def register():
    try:
        _, register_face, __, ___, ____, _____ = get_vision()
        data = request.json
        contact_id = data.get("contact_id", "")
        contact_name = data.get("contact_name", "Unknown")
        image = data.get("image", "")
        if not image or not contact_id:
            return jsonify({"error": "contact_id and image required"}), 400
        result = register_face(contact_id, contact_name, image)
        return jsonify(result), 200
    except Exception as e:
        print(f"Vision register error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@vision_bp.route("/verify", methods=["POST"])
@jwt_required()
def verify():
    try:
        _, __, verify_face, ___, ____, _____ = get_vision()
        data = request.json
        contact_id = data.get("contact_id", "")
        image = data.get("image", "")
        threshold = float(data.get("threshold", 0.75))
        if not image or not contact_id:
            return jsonify({"error": "contact_id and image required"}), 400
        result = verify_face(contact_id, image, threshold)
        return jsonify(result), 200
    except Exception as e:
        print(f"Vision verify error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@vision_bp.route("/registered", methods=["GET"])
@jwt_required()
def registered():
    try:
        _, __, ___, get_registered_contacts, ____, _____ = get_vision()
        return jsonify(get_registered_contacts()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@vision_bp.route("/delete/<contact_id>", methods=["DELETE"])
@jwt_required()
def delete(contact_id):
    try:
        _, __, ___, ____, delete_face, _____ = get_vision()
        return jsonify(delete_face(contact_id)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500