import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getProfile, updateProfile, getStats } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { loginUser, user, logoutUser, darkMode, toggleDarkMode } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState({ name: '', email: '', created_at: '' })
  const [stats, setStats] = useState(null)
  const [form, setForm] = useState({ name: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [activeTab, setActiveTab] = useState('profile')
  const [prefSaved, setPrefSaved] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('voiceiq_notifications')
      return saved ? JSON.parse(saved) : {
        emailAlerts: true,
        campaignComplete: true,
        weeklyReport: false,
        sentimentAlerts: true
      }
    } catch { return { emailAlerts: true, campaignComplete: true, weeklyReport: false, sentimentAlerts: true } }
  })

  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('voiceiq_preferences')
      return saved ? JSON.parse(saved) : {
        defaultLanguage: 'en-US',
        defaultVoice: 'female',
        autoSummarize: true,
        showEmotionTimeline: true
      }
    } catch { return { defaultLanguage: 'en-US', defaultVoice: 'female', autoSummarize: true, showEmotionTimeline: true } }
  })

  useEffect(() => {
    getProfile()
      .then(r => {
        setProfile(r.data)
        setForm(prev => ({ ...prev, name: r.data.name || '' }))
      })
      .catch(() => {})

    getStats()
      .then(r => setStats(r.data))
      .catch(() => {})
  }, [])

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (form.password && form.password !== form.confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' })
      return
    }
    if (form.password && form.password.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters', type: 'error' })
      return
    }
    setLoading(true)
    setMessage({ text: '', type: '' })
    try {
      const payload = { name: form.name }
      if (form.password) payload.password = form.password
      await updateProfile(payload)
      const updatedUser = { ...user, name: form.name }
      loginUser(updatedUser, localStorage.getItem('token'))
      setMessage({ text: '✅ Profile updated successfully!', type: 'success' })
      setForm(prev => ({ ...prev, password: '', confirmPassword: '' }))
    } catch (err) {
      setMessage({ text: '❌ Update failed. Try again.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSavePreferences = () => {
    localStorage.setItem('voiceiq_preferences', JSON.stringify(preferences))
    setPrefSaved(true)
    setTimeout(() => setPrefSaved(false), 2500)
  }

  const handleSaveNotifications = () => {
    localStorage.setItem('voiceiq_notifications', JSON.stringify(notifications))
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 2500)
  }

  const handleLogout = () => {
    logoutUser()
    navigate('/login')
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'stats', label: 'My Stats', icon: '📊' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p>
          </div>
          <Link
            to="/dashboard"
            className="text-sm text-indigo-600 border border-indigo-300 px-4 py-2 rounded-xl hover:bg-indigo-50 flex items-center gap-2"
          >
            🏠 Back to home
          </Link>
        </div>

        <div className="flex gap-6">

          {/* Sidebar */}
          <div className="w-52 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 p-2 space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
              <div className="pt-2 mt-2 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                >
                  <span>🚪</span>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-4 min-w-0">

            {/* ── PROFILE TAB ── */}
            {activeTab === 'profile' && (
              <>
                {/* Avatar card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0">
                    {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{profile.name || 'User'}</p>
                    <p className="text-sm text-gray-500">{profile.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Member since {profile.created_at
                        ? new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Edit form */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-700 mb-5">Edit profile</h2>

                  {message.text && (
                    <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
                      message.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {message.text}
                    </div>
                  )}

                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full name</label>
                      <input
                        type="text" required
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                      <input
                        type="email" disabled
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                        value={profile.email || ''}
                      />
                      <p className="text-xs text-gray-400 mt-1">Email address cannot be changed</p>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">🔐 Change password</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">New password</label>
                          <input
                            type="password"
                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            placeholder="Leave blank to keep current password"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm new password</label>
                          <input
                            type="password"
                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={form.confirmPassword}
                            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                            placeholder="Repeat new password"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit" disabled={loading}
                      className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {loading ? 'Saving changes...' : 'Save changes'}
                    </button>
                  </form>
                </div>

                {/* Danger zone */}
                <div className="bg-white rounded-2xl border border-red-200 p-6">
                  <h2 className="text-base font-semibold text-red-600 mb-2">⚠️ Danger zone</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    This will sign you out from all active sessions.
                  </p>
                  <button
                    onClick={handleLogout}
                    className="border border-red-300 text-red-600 px-5 py-2 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    🚪 Sign out of all devices
                  </button>
                </div>
              </>
            )}

            {/* ── PREFERENCES TAB ── */}
            {activeTab === 'preferences' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                <h2 className="text-base font-semibold text-gray-700">App Preferences</h2>

                {/* Dark mode — show status, toggle is in navbar */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-700">🌙 Dark mode</p>
                    <p className="text-xs text-gray-400">Use the moon icon in the top navbar to toggle</p>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    darkMode ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {darkMode ? '🌙 On' : '☀️ Off'}
                  </span>
                </div>

                {/* Default language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">🌐 Default call language</label>
                  <div className="flex gap-2">
                    {[
                      { code: 'en-US', label: '🇺🇸 English' },
                      { code: 'hi-IN', label: '🇮🇳 Hindi' },
                      { code: 'mr-IN', label: '🟠 Marathi' },
                    ].map(lang => (
                      <button key={lang.code}
                        onClick={() => setPreferences(p => ({ ...p, defaultLanguage: lang.code }))}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-sm border-2 transition-colors ${
                          preferences.defaultLanguage === lang.code
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                        }`}
                      >{lang.label}</button>
                    ))}
                  </div>
                </div>

                {/* Default voice */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">🎙️ Default AI voice gender</label>
                  <div className="flex gap-3">
                    {[
                      { value: 'female', label: '👩 Female', desc: 'Warm & friendly' },
                      { value: 'male', label: '👨 Male', desc: 'Deep & professional' },
                    ].map(v => (
                      <button key={v.value}
                        onClick={() => setPreferences(p => ({ ...p, defaultVoice: v.value }))}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm border-2 text-left transition-colors ${
                          preferences.defaultVoice === v.value
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                        }`}
                      >
                        <div className="font-semibold">{v.label}</div>
                        <div className={`text-xs mt-0.5 ${preferences.defaultVoice === v.value ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {v.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle preferences */}
                <div className="space-y-1">
                  {[
                    { key: 'autoSummarize', label: '🤖 Auto-summarize calls', desc: 'Automatically generate AI summary after each call ends' },
                    { key: 'showEmotionTimeline', label: '📊 Show emotion timeline', desc: 'Display real-time emotion graph during call simulation' },
                  ].map(pref => (
                    <div key={pref.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{pref.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{pref.desc}</p>
                      </div>
                      <button
                        onClick={() => setPreferences(p => ({ ...p, [pref.key]: !p[pref.key] }))}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          preferences[pref.key] ? 'bg-indigo-600' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${
                          preferences[pref.key] ? 'left-6' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSavePreferences}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                    prefSaved
                      ? 'bg-green-500 text-white'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {prefSaved ? '✅ Preferences saved!' : 'Save preferences'}
                </button>
              </div>
            )}

            {/* ── NOTIFICATIONS TAB ── */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-700 mb-5">🔔 Notification Settings</h2>
                <div className="space-y-1">
                  {[
                    { key: 'emailAlerts', label: '📧 Email alerts', desc: 'Receive email when important events happen' },
                    { key: 'campaignComplete', label: '✅ Campaign completion', desc: 'Notify when all calls in a campaign finish' },
                    { key: 'weeklyReport', label: '📊 Weekly report', desc: 'Get a weekly summary of all your campaigns' },
                    { key: 'sentimentAlerts', label: '😠 Negative sentiment alerts', desc: 'Alert when a call ends with negative sentiment' },
                  ].map(notif => (
                    <div key={notif.key} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                      <div className="flex-1 pr-4">
                        <p className="text-sm font-medium text-gray-700">{notif.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{notif.desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifications(n => ({ ...n, [notif.key]: !n[notif.key] }))}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          notifications[notif.key] ? 'bg-indigo-600' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${
                          notifications[notif.key] ? 'left-6' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSaveNotifications}
                  className={`mt-5 w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                    notifSaved
                      ? 'bg-green-500 text-white'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {notifSaved ? '✅ Notification settings saved!' : 'Save notification settings'}
                </button>
              </div>
            )}

            {/* ── STATS TAB ── */}
            {activeTab === 'stats' && (
              <div className="space-y-4">
                {stats ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Total campaigns', value: stats.total_campaigns, icon: '📢', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { label: 'Total contacts', value: stats.total_contacts, icon: '👥', color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Calls made', value: stats.total_calls, icon: '📞', color: 'text-green-600', bg: 'bg-green-50' },
                        { label: 'Completed', value: stats.completed_campaigns, icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      ].map(s => (
                        <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5">
                          <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-xl mb-3`}>
                            {s.icon}
                          </div>
                          <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <h2 className="text-base font-semibold text-gray-700 mb-4">Usage overview</h2>
                      <div className="space-y-4">
                        {[
                          { label: 'Campaigns used', value: stats.total_campaigns, max: 20, color: 'bg-indigo-500' },
                          { label: 'Calls completed', value: stats.total_calls, max: 100, color: 'bg-green-500' },
                          { label: 'Contacts managed', value: stats.total_contacts, max: 200, color: 'bg-blue-500' },
                        ].map(item => (
                          <div key={item.label}>
                            <div className="flex justify-between text-sm mb-1.5">
                              <span className="text-gray-600">{item.label}</span>
                              <span className="font-semibold text-gray-800">{item.value}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full ${item.color} transition-all duration-500`}
                                style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <p className="text-gray-400">Loading stats...</p>
                  </div>
                )}
              </div>
            )}

            {/* ── ABOUT TAB ── */}
            {activeTab === 'about' && (
              <div className="space-y-4">

                {/* App info */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md">
                      V
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-800 text-xl">VoiceIQ</h2>
                      <p className="text-sm text-gray-500">AI Bulk Call Simulator v1.0</p>
                      <p className="text-xs text-indigo-600 mt-0.5 font-medium">SPPU Final Year Project 2026</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    VoiceIQ is an AI-powered intelligent bulk call simulation and analytics web application.
                    It automates outbound calling campaigns with emotionally intelligent conversations,
                    real-time sentiment analysis, outcome prediction, and call recording — all running
                    completely free in the browser.
                  </p>
                </div>

                {/* Tech stack */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-700 mb-4">🛠️ Tech stack</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: '⚛️', label: 'Frontend', value: 'React 18 + Vite + Tailwind CSS' },
  { icon: '🐍', label: 'Backend', value: 'Python Flask REST API' },
  { icon: '🤖', label: 'AI Engine', value: 'Groq LLaMA 3.3 70B' },
  { icon: '🎤', label: 'Voice', value: 'Web Speech API (TTS + STT)' },
  { icon: '🧠', label: 'Deep Learning', value: 'LSTM Neural Network (TF/Keras)' },
  { icon: '🌲', label: 'ML Models', value: 'Random Forest + SVM + K-Means' },
  { icon: '📝', label: 'NLP', value: 'TF-IDF + Topic Modelling + NER' },
  { icon: '👁️', label: 'Computer Vision', value: 'OpenCV + face_recognition' },
  { icon: '🗄️', label: 'Database', value: 'Supabase PostgreSQL' },
  { icon: '🔐', label: 'Auth', value: 'JWT + Google OAuth2' },
  { icon: '🚀', label: 'Deployment', value: 'Vercel + Render + Docker' },
  { icon: '🐳', label: 'DevOps', value: 'Docker + GitHub Actions CI/CD' },
                    ].map(item => (
                      <div key={item.label} className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                        <span className="text-lg shrink-0">{item.icon}</span>
                        <div>
                          <p className="text-xs text-gray-400">{item.label}</p>
                          <p className="text-xs font-semibold text-gray-700">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* All 16 modules */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-700 mb-4">✅ All 20 modules</h2>
                  <div className="space-y-1">
                    {[
  'User Authentication (JWT)',
  'Contact Management (CSV/Excel)',
  'Campaign Engine',
  'AI Call Simulator (Web Speech API)',
  'Transcript Storage & Retrieval',
  'Analytics Dashboard',
  'AI Script Builder (Groq LLM)',
  'Call Scheduling',
  'Contact Groups & Tagging',
  'Post-Call Campaign Report (PDF)',
  'Multi-language Support (EN/HI/MR)',
  'Settings & Profile Management',
  '🧠 Emotion-Adaptive AI Caller',
  '🔮 AI Call Outcome Predictor',
  '🤖 ML Sentiment Analysis (TF-IDF + LR)',
  '🌲 Random Forest Call Success Predictor',
  '📝 NLP Keyword & Topic Extractor',
  '🔵 K-Means + SVM Churn Predictor',
  '🧠 LSTM Deep Learning Quality Scorer',
  '👁️ Computer Vision Face Verifier (OpenCV + HOG)',
].map((mod, i) => (
  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0 text-sm">
    <span className="text-indigo-400 font-bold text-xs w-6 shrink-0">{i + 1}.</span>
    <span className="text-gray-700 flex-1">{mod}</span>
    <span className="text-green-500 text-xs shrink-0">✅</span>
  </div>
))}
                  </div>
                </div>

                {/* Developer info */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-6 text-center">
                  <p className="text-sm text-gray-600 mb-1">Developed by</p>
                  <p className="text-lg font-bold text-indigo-700">Anjali</p>
                  <p className="text-xs text-gray-500 mt-1">SPPU Final Year Project · 2026</p>
                  <p className="text-xs text-gray-400 mt-2">Built with ❤️ using React, Flask, and Groq AI</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}