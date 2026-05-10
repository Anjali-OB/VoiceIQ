# VoiceIQ — AI-Powered Bulk Call Simulator

> An emotion-adaptive AI calling platform that simulates outbound campaigns, detects respondent emotion in real time, adapts conversation tone, records every call, and provides deep ML analytics — entirely in the browser.

![VoiceIQ](https://img.shields.io/badge/VoiceIQ-v2.0-6366f1)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Flask](https://img.shields.io/badge/Flask-Python-000000?logo=flask)
![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3-F97316)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![Scikit--learn](https://img.shields.io/badge/Scikit--learn-ML-F7931E?logo=scikit-learn)

---

## What is VoiceIQ?

VoiceIQ lets you upload a CSV of contacts, write or AI-generate a call script, and run a fully automated outbound campaign — where an AI agent speaks to each contact using Text-to-Speech, listens using Speech Recognition, detects the contact's emotional state, and adapts its tone accordingly. Every call is transcribed, summarised, and recorded. Six ML modules provide post-campaign analytics and pre-campaign contact optimisation.

**No telephony required.** Everything runs in Chrome using the Web Speech API.

---

## Modules

### Core Modules (7)

| # | Module | Description |
|---|---|---|
| 1 | **Authentication** | JWT login/register, Google OAuth, forgot password, route protection |
| 2 | **Campaign Management** | Create/edit/delete campaigns with script, language, voice gender settings |
| 3 | **Contact Management** | Bulk CSV upload, per-contact status tracking, group tagging |
| 4 | **AI Call Simulator** | Emotion-adaptive multi-turn AI conversations via Groq LLaMA 3.3 + Web Speech API |
| 5 | **Transcripts** | Searchable transcript list with AI summaries, sentiment labels, and conversation replay |
| 6 | **Recordings** | Audio playback for every call, stored in Supabase, searchable by contact or campaign |
| 7 | **Settings & Profile** | Update profile, change password, notification preferences |

### ML & AI Modules (6)

| # | Module | Description |
|---|---|---|
| ML-1 | **Sentiment Analyser** | SVM + TF-IDF classifier; predicts positive/neutral/negative per call and campaign-wide |
| ML-2 | **RF Outcome Predictor** | Random Forest predicts call success probability; batch-ranks contacts before dialling |
| ML-3 | **NLP Transcript Analytics** | Keyword extraction, LDA topic modelling, conversation quality metrics across campaigns |
| ML-4 | **Churn Predictor** | Identifies contacts at risk of disengagement based on call response patterns |
| ML-5 | **LSTM Call Quality Scorer** | LSTM sequence model scores call quality 0–100 from emotion progression and empathy data |
| ML-6 | **Face Verifier** | OpenCV + face_recognition for webcam-based agent identity verification |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, Recharts |
| Backend | Python Flask, Flask-JWT-Extended, Flask-CORS |
| AI Engine | Groq API — LLaMA 3.3 70B Versatile |
| Voice I/O | Web Speech API (SpeechSynthesis + SpeechRecognition) |
| Audio Recording | MediaRecorder API (WebM) |
| Database | Supabase (PostgreSQL) |
| Authentication | JWT + Google OAuth (@react-oauth/google) |
| ML Libraries | Scikit-learn, TensorFlow/Keras, OpenCV, NumPy |
| Charts | Recharts |

---

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- Google Chrome (required for Web Speech API)
- [Groq API key](https://console.groq.com) — free
- [Supabase project](https://supabase.com) — free tier is sufficient

---

### 1. Supabase Database Setup

Run the following SQL in your **Supabase SQL Editor** to create all required tables:

```sql
-- Campaigns
CREATE TABLE campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  script text,
  language text DEFAULT 'en-US',
  voice_gender text DEFAULT 'female',
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

-- Contacts
CREATE TABLE contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  name text,
  phone text,
  email text,
  group_name text DEFAULT 'General',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Transcripts
CREATE TABLE transcripts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id),
  conversation jsonb,
  summary text,
  sentiment text DEFAULT 'neutral',
  duration integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Recordings
CREATE TABLE recordings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id),
  audio_data text,
  duration integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

---

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...   # anon/public key from Supabase → Settings → API
GROQ_API_KEY=gsk_...
JWT_SECRET_KEY=your_random_secret_key
FLASK_ENV=development
```

> **Important:** `SUPABASE_KEY` must be the **anon public** key (starts with `eyJ`), not the `sb_publishable_` key.

```bash
python app.py
```

Flask runs on `http://127.0.0.1:5000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:5000
```

```bash
npm run dev
```

Open **Google Chrome** → `http://localhost:5173`

> VoiceIQ requires Chrome or Edge. Firefox does not support the Web Speech API SpeechRecognition.

---

### 4. Google OAuth Setup (optional)

To enable Google Sign-In:

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Under **Authorized JavaScript origins** add: `http://localhost:5173`
4. Under **Authorized redirect URIs** add: `http://localhost:5173`
5. Copy the Client ID into `frontend/src/main.jsx`:
   ```js
   const GOOGLE_CLIENT_ID = "your-client-id.apps.googleusercontent.com"
   ```

---

## Running a Campaign

1. **Register / Log in** at `http://localhost:5173`
2. Go to **Campaigns** → Create a new campaign (set script, language, voice)
3. Click **Upload contacts** → import a CSV with columns: `name`, `phone`, `email`
4. Optionally go to **RF Predictor** → select campaign → **Load & Rank Contacts** to sort by predicted success
5. Click **Start Simulator** on the campaign card
6. Click **▶ Start calls** — the AI will call each contact automatically
7. After the campaign completes, view **Transcripts** and **Recordings** for results
8. Use the ML modules (**NLP**, **Churn**, **LSTM**) for deeper analytics

---

## CSV Contact Format

```csv
name,phone,email
Rahul Sharma,9876543210,rahul@example.com
Priya Patil,9123456789,priya@example.com
Ashwin Kumar,9988776655,ashwin@example.com
```

---

## Project Structure

```
VoiceIQ/
├── backend/
│   ├── app.py                  # Flask app entry point, blueprint registration
│   ├── config.py               # Environment variable loader
│   ├── requirements.txt
│   ├── .env                    # Backend secrets (not committed)
│   ├── routes/
│   │   ├── auth.py             # Register, login, Google OAuth, profile
│   │   ├── campaigns.py        # Campaign CRUD
│   │   ├── contacts.py         # Contact management, bulk CSV insert
│   │   ├── transcripts.py      # Transcript save/fetch (user-isolated)
│   │   ├── recordings.py       # Recording save/fetch/delete
│   │   ├── ai.py               # Groq: respond, summarize, detect-emotion, adaptive-respond
│   │   └── ml.py               # All 6 ML module endpoints
│   └── ml/
│       ├── sentiment_model.py
│       ├── rf_success_model.py
│       ├── nlp_analytics.py
│       ├── churn_model.py
│       ├── lstm_quality.py
│       └── vision_model.py
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── .env                    # VITE_API_URL (not committed)
    └── src/
        ├── main.jsx            # App entry, GoogleOAuthProvider, AuthProvider
        ├── App.jsx             # React Router routes
        ├── index.css
        ├── context/
        │   └── AuthContext.jsx # Global auth state
        ├── components/
        │   ├── Navbar.jsx
        │   ├── Layout.jsx
        │   ├── ProtectedRoute.jsx
        │   └── Upload.jsx      # CSV upload component (used inside Campaigns)
        ├── services/
        │   └── api.js          # Axios instance + all exported API functions
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── ForgotPassword.jsx
            ├── Dashboard.jsx
            ├── Campaigns.jsx
            ├── Simulator.jsx   # Core AI call engine
            ├── Transcripts.jsx
            ├── Recordings.jsx
            ├── Report.jsx
            ├── Predictor.jsx
            ├── Settings.jsx
            ├── MLAnalytics.jsx
            ├── RFPredictor.jsx
            ├── NLPAnalytics.jsx
            ├── ChurnPredictor.jsx
            ├── LSTMQuality.jsx
            └── FaceVerifier.jsx
```

---

## Known Limitations

- **Chrome/Edge only** — Web Speech API SpeechRecognition is not supported in Firefox or Safari
- **Hindi/Marathi STT** — Browser speech recognition has limited accuracy for regional languages; a manual text input field is provided as fallback
- **Recordings size** — Each WebM recording is ~1–3MB. Supabase free tier provides 500MB storage
- **No real telephony** — VoiceIQ simulates calls in the browser; it does not dial actual phone numbers

---

## Developed By

**Anjali P K** — MCA Final Year, SPPU — 2025–2026

Built with React, Flask, Groq LLaMA 3.3, Supabase, and Web Speech API.