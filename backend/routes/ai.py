from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from groq import Groq
from config import Config
import json
import re

ai_bp = Blueprint("ai", __name__)
client = Groq(api_key=Config.GROQ_API_KEY)

@ai_bp.route("/respond", methods=["POST"])
@jwt_required()
def ai_respond():
    data = request.json
    script = data.get("script", "You are a helpful survey assistant.")
    conversation = data.get("conversation", [])
    user_message = data.get("user_message", "")

    messages = [
        {
            "role": "system",
            "content": f"""You are an AI call agent conducting a phone call simulation.
Campaign script/goal: {script}
Keep responses short (1-2 sentences), natural, and conversational.
If the person seems done talking, wrap up politely."""
        }
    ]

    for turn in conversation:
        messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=150,
        temperature=0.7
    )

    reply = response.choices[0].message.content
    return jsonify({"reply": reply}), 200


@ai_bp.route("/summarize", methods=["POST"])
@jwt_required()
def ai_summarize():
    data = request.json
    conversation = data.get("conversation", [])

    convo_text = "\n".join([
        f"{t['role'].upper()}: {t['content']}"
        for t in conversation
    ])

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """Summarize this phone call in 2 sentences.
Classify sentiment as exactly one of: positive, neutral, negative.
You MUST respond with only valid JSON in this exact format, nothing else:
{"summary": "your summary here", "sentiment": "positive"}"""
            },
            {"role": "user", "content": convo_text}
        ],
        max_tokens=200,
        temperature=0.3
    )

    raw = response.choices[0].message.content.strip()
    print("Groq raw response:", raw)

    try:
        result = json.loads(raw)
    except Exception:
        try:
            match = re.search(r'\{.*?\}', raw, re.DOTALL)
            if match:
                result = json.loads(match.group())
            else:
                raise ValueError("No JSON found")
        except Exception:
            result = {"summary": raw, "sentiment": "neutral"}

    if result.get("sentiment") not in ["positive", "neutral", "negative"]:
        result["sentiment"] = "neutral"

    print("Final result:", result)
    return jsonify(result), 200