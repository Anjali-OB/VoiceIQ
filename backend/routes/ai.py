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
    lang_map = {
    "hi-IN": "Respond in Hindi.",
    "mr-IN": "Respond in Marathi.",
    "en-US": "Respond in English."
}
    language = data.get("language", "en-US")
    lang_instruction = lang_map.get(language, "Respond in English.")
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

@ai_bp.route("/generate-script", methods=["POST"])
@jwt_required()
def generate_script():
    try:
        data = request.json
        goal = data.get("goal", "")
        language = data.get("language", "en-US")

        lang_instruction = {
            "hi-IN": "Write the script in Hindi (Devanagari script).",
            "mr-IN": "Write the script in Marathi (Devanagari script).",
            "en-US": "Write the script in English."
        }.get(language, "Write the script in English.")

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": f"""You are an expert call center script writer.
{lang_instruction}
Write a professional, friendly, and natural AI phone call script based on the user's goal.
The script should be conversational, 4-6 sentences as instructions for the AI agent.
Return only the script text, nothing else."""
                },
                {
                    "role": "user",
                    "content": f"Write a call script for this goal: {goal}"
                }
            ],
            max_tokens=300,
            temperature=0.7
        )

        script = response.choices[0].message.content.strip()
        return jsonify({"script": script}), 200

    except Exception as e:
        print(f"ERROR in generate_script: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@ai_bp.route("/detect-emotion", methods=["POST"])
@jwt_required()
def detect_emotion():
    try:
        data = request.json
        text = data.get("text", "")

        if not text or text in ["(no response)", "(could not hear)", "(mic error)"]:
            return jsonify({"emotion": "neutral", "score": 50, "suggestion": "normal"}), 200

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """Analyze the emotion in this text from a phone call.
Respond ONLY with valid JSON, no extra text:
{
  "emotion": "happy|angry|sad|confused|interested|neutral|frustrated",
  "score": 0-100,
  "suggestion": "normal|slower|faster|empathetic|enthusiastic|apologetic"
}
Where score is emotional intensity (0=very negative, 50=neutral, 100=very positive)
suggestion is how the AI should adapt its response style."""
                },
                {"role": "user", "content": f"Analyze emotion: {text}"}
            ],
            max_tokens=100,
            temperature=0.3
        )

        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()

        try:
            result = json.loads(raw)
        except Exception:
            match = re.search(r'\{.*?\}', raw, re.DOTALL)
            result = json.loads(match.group()) if match else {
                "emotion": "neutral", "score": 50, "suggestion": "normal"
            }

        print(f"Emotion detected: {result}")
        return jsonify(result), 200

    except Exception as e:
        print(f"Emotion detection error: {str(e)}")
        return jsonify({"emotion": "neutral", "score": 50, "suggestion": "normal"}), 200


@ai_bp.route("/adaptive-respond", methods=["POST"])
@jwt_required()
def adaptive_respond():
    try:
        data = request.json
        script = data.get("script", "")
        conversation = data.get("conversation", [])
        user_message = data.get("user_message", "")
        emotion = data.get("emotion", "neutral")
        suggestion = data.get("suggestion", "normal")
        language = data.get("language", "en-US")

        lang_map = {
            "hi-IN": "Respond in Hindi.",
            "mr-IN": "Respond in Marathi.",
            "en-US": "Respond in English."
        }
        lang_instruction = lang_map.get(language, "Respond in English.")

        style_instructions = {
            "normal": "Use a professional and friendly tone.",
            "slower": "The contact seems confused. Use simple words, speak slowly, be very clear.",
            "faster": "The contact is engaged and positive. Be upbeat and concise.",
            "empathetic": "The contact seems sad or upset. Be warm, caring, and understanding.",
            "enthusiastic": "The contact is happy and interested. Match their energy, be enthusiastic.",
            "apologetic": "The contact is angry or frustrated. Be apologetic, calm, and solution-focused."
        }

        style = style_instructions.get(suggestion, style_instructions["normal"])
        emotion_context = f"The contact appears to be feeling {emotion}. {style}"

        messages = [
            {
                "role": "system",
                "content": f"""You are an emotionally intelligent AI call agent.
Campaign goal: {script}
{lang_instruction}
Emotional adaptation: {emotion_context}
Keep response to 1-2 sentences. Be natural and conversational."""
            }
        ]

        for turn in conversation:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if role in ["user", "assistant"] and content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": user_message})

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=150,
            temperature=0.7
        )

        reply = response.choices[0].message.content
        print(f"Adaptive reply ({emotion}/{suggestion}): {reply}")
        return jsonify({"reply": reply}), 200

    except Exception as e:
        print(f"Adaptive respond error: {str(e)}")
        return jsonify({"reply": "Thank you for sharing that. Could you tell me more?"}), 200    
    
@ai_bp.route("/predict-outcomes", methods=["POST"])
@jwt_required()
def predict_outcomes():
    try:
        data = request.json
        contacts = data.get("contacts", [])
        script = data.get("script", "")
        campaign_name = data.get("campaign_name", "")

        if not contacts:
            return jsonify({"predictions": []}), 200

        contacts_text = "\n".join([
            f"- ID: {c['id']}, Name: {c.get('name','Unknown')}, Group: {c.get('group_name','General')}"
            for c in contacts
        ])

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """You are an AI sales predictor. Analyze contacts and predict call outcomes.
For each contact predict:
- success_score: 0-100 likelihood of positive response
- predicted_emotion: likely first emotion
- best_opening: personalized opening line
- reason: brief reason for score

Respond ONLY with valid JSON array:
[{"id": "...", "success_score": 75, "predicted_emotion": "neutral", "best_opening": "...", "reason": "..."}]
No extra text."""
                },
                {
                    "role": "user",
                    "content": f"""Campaign: {campaign_name}
Script goal: {script}
Contacts to analyze:
{contacts_text}

Predict outcome for each contact."""
                }
            ],
            max_tokens=800,
            temperature=0.4
        )

        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()

        try:
            predictions = json.loads(raw)
        except Exception:
            match = re.search(r'\[.*?\]', raw, re.DOTALL)
            predictions = json.loads(match.group()) if match else []

        # Sort by success score descending
        predictions.sort(key=lambda x: x.get("success_score", 0), reverse=True)

        print(f"Predictions generated for {len(predictions)} contacts")
        return jsonify({"predictions": predictions}), 200

    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({"error": str(e), "predictions": []}), 500    