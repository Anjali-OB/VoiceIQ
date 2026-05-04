from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

CORS(app, origins=["http://localhost:5173"])
jwt = JWTManager(app)

from routes.auth import auth_bp
from routes.campaigns import campaigns_bp
from routes.contacts import contacts_bp
from routes.transcripts import transcripts_bp
from routes.ai import ai_bp

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(campaigns_bp, url_prefix="/api/campaigns")
app.register_blueprint(contacts_bp, url_prefix="/api/contacts")
app.register_blueprint(transcripts_bp, url_prefix="/api/transcripts")
app.register_blueprint(ai_bp, url_prefix="/api/ai")

@app.route("/")
def index():
    return {"message": "VoiceIQ API is running!"}

if __name__ == "__main__":
    app.run(debug=True, port=5000)