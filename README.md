# VoiceIQ — AI Bulk Call Simulator

> An AI-powered bulk outbound calling simulation system with emotion detection, outcome prediction, and real-time analytics.

![VoiceIQ](https://img.shields.io/badge/VoiceIQ-v1.0-indigo)
![React](https://img.shields.io/badge/React-18-blue)
![Flask](https://img.shields.io/badge/Flask-Python-green)
![Groq](https://img.shields.io/badge/Groq-LLaMA3.3-orange)
![Supabase](https://img.shields.io/badge/Database-Supabase-emerald)

---

## 🚀 Live Demo

- **Frontend:** https://voiceiq.vercel.app
- **Backend API:** https://voiceiq-backend.onrender.com

---

## 🧠 What is VoiceIQ?

VoiceIQ lets you upload a CSV of contacts, create an AI-powered calling campaign, and simulate bulk outbound calls — entirely in the browser. The AI speaks to each contact using Text-to-Speech, listens using Speech-to-Text, and holds a full natural conversation powered by Groq LLaMA 3.3.

---

## ✅ 14 Modules

| # | Module | Description |
|---|---|---|
| 1 | User Authentication | JWT-based register/login/logout |
| 2 | Contact Management | CSV/Excel upload with SheetJS |
| 3 | Campaign Engine | Create, schedule, manage campaigns |
| 4 | AI Call Simulator | Web Speech API TTS + STT + Groq |
| 5 | Transcript Storage | Save full conversations to Supabase |
| 6 | Analytics Dashboard | Charts, stats, sentiment breakdown |
| 7 | AI Script Builder | Groq generates call scripts from goal |
| 8 | Call Scheduling | Schedule campaigns for future time |
| 9 | Contact Groups | Tag contacts — VIP, Follow-up, etc |
| 10 | Campaign PDF Report | Full report with sentiment bar chart |
| 11 | Multi-language | English, Hindi, Marathi support |
| 12 | Settings & Profile | Update name, password, preferences |
| 13 | 🧠 Emotion-Adaptive AI | Detects emotion, adapts tone in real-time |
| 14 | 🔮 Outcome Predictor | Predicts call success before dialing |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Python Flask, REST API |
| AI Engine | Groq LLaMA 3.3 70B |
| Voice | Web Speech API (TTS + STT) |
| Database | Supabase (PostgreSQL) |
| Auth | Flask-JWT-Extended |
| Deployment | Vercel + Render |
| DevOps | Docker + GitHub Actions |

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- Groq API key (free at console.groq.com)
- Supabase project (free at supabase.com)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

Create `backend/.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
JWT_SECRET_KEY=your_secret_key
```

```bash
python app.py
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```
VITE_API_URL=http://127.0.0.1:5000
```

```bash
npm run dev
```

Open Chrome → `http://localhost:5173`

---

---

## 👩‍💻 Developed by

**Anjali** — SPPU Final Year Project 2026

Built with ❤️ using React, Flask, and Groq AI