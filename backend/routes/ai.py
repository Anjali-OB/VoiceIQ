from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from groq import Groq
from config import Config

ai_bp = Blueprint("ai", __name__)
client = Groq(api_key=Config.GROQ_API_KEY)

@ai_bp.route("/respond", methods=["POST"])
@jwt_required()
def respond():
    data = request.json
    script = data.get("script", "You are a helpful survey assistant.")
    conversation = data.get("conversation", [])
    user_message = data.get("user_message", "")

    messages = [
        {"role": "system", "content": f"""You are an AI call agent conducting a phone call simulation.
Campaign script/goal: {script}
Keep responses short (1-2 sentences), natural, and conversational.
If the person seems done talking, wrap up politely."""}
    ]

    for turn in conversation:
        messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=messages,
        max_tokens=150,
        temperature=0.7
    )

    reply = response.choices[0].message.content

    return jsonify({"reply": reply}), 200

@ai_bp.route("/summarize", methods=["POST"])
@jwt_required()
def summarize():
    data = request.json
    conversation = data.get("conversation", [])

    convo_text = "\n".join([f"{t['role'].upper()}: {t['content']}" for t in conversation])

    response = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {"role": "system", "content": "Summarize this phone call in 2 sentences. Also classify sentiment as: positive, neutral, or negative. Reply in JSON format: {\"summary\": \"...\", \"sentiment\": \"...\"}"},
            {"role": "user", "content": convo_text}
        ],
        max_tokens=200
    )

    import json
    try:
        result = json.loads(response.choices[0].message.content)
    except:
        result = {"summary": response.choices[0].message.content, "sentiment": "neutral"}

    return jsonify(result), 200