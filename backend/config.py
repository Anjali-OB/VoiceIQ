import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

class Config:
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback_secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=30)
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")

print("SUPABASE_URL:", Config.SUPABASE_URL)
print("GROQ_API_KEY starts with:", Config.GROQ_API_KEY[:10] if Config.GROQ_API_KEY else "MISSING")