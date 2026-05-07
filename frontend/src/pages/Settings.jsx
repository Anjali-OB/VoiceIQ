import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getProfile, updateProfile, getStats } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { loginUser, user, logoutUser, darkMode, toggleDarkMode } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState({ name: '', email: '' })
  const [stats, setStats] = useState(null)
  const [form, setForm] = useState({ name: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [activeTab, setActiveTab] = useState('profile')
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    campaignComplete: true,
    weeklyReport: false,
    sentimentAlerts: true
  })
  const [preferences, setPreferences] = useState({
    defaultLanguage: 'en-US',
    defaultVoice: 'female',
    autoSummarize: true,
    darkMode: false
  })

  useEffect(() => {
    getProfile().then(r => {
      setProfile(r.data)
      setForm(prev => ({ ...prev, name: r.data.name }))
    }).catch(() => {})
    getStats().then(r => setStats(r.data)).catch(() => {})
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

  const handleLogout = () => {
    logoutUser()
    navigate('/login')
  }

  const tabs = [
    { id: 'profile', label: '👤 Profile', icon: '👤' },
    { id: 'preferences', label: '⚙️ Preferences', icon: '⚙️' },
    { id: 'notifications', label: '🔔 Notifications', icon: '🔔' },
    { id: 'stats', label: '📊 My Stats', icon: '📊' },
    { id: 'about', label: 'ℹ️ About', icon: 'ℹ️' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your account and app preferences</p>
          </div>
          <Link to="/dashboard"
            className="text-sm text-indigo-600 border border-indigo-300 px-4 py-2 rounded-xl hover:bg-indigo-50 flex items-center gap-2"
          >
            🏠 Back to home
          </Link>
        </div>

        <div className="flex gap-6">

          {/* Sidebar tabs */}
          <div className="w-48 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-2 space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon} {tab.id.charAt(0).toUpperCase() + tab.id.slice(1)}
                </button>
              ))}

              <div className="pt-2 mt-2 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 space-y-4">

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <>
                {/* Avatar card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                    {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-lg">{profile.name}</p>
                    <p className="text-sm text-gray-500">{profile.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Member since {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Edit form */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-700 mb-5">Edit profile</h2>

                  {message.text && (
                    <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
                      message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
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
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                      <input
                        type="email" disabled
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                        value={profile.email}
                      />
                      <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
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
                            placeholder="Leave blank to keep current"
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
                      className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save changes'}
                    </button>
                  </form>
                </div>

                {/* Danger zone */}
                <div className="bg-white rounded-xl border border-red-200 p-6">
                  <h2 className="text-base font-semibold text-red-600 mb-2">⚠️ Danger zone</h2>
                  <p className="text-sm text-gray-500 mb-4">These actions are irreversible. Please be careful.</p>
                  <button
                    onClick={handleLogout}
                    className="border border-red-300 text-red-600 px-4 py-2 rounded-xl text-sm hover:bg-red-50"
                  >
                    🚪 Sign out of all devices
                  </button>
                </div>
              </>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <h2 className="text-base font-semibold text-gray-700">App Preferences</h2>

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
                        className={`flex-1 py-2 px-3 rounded-xl text-sm border-2 transition-colors ${
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
                  <label className="block text-sm font-medium text-gray-700 mb-3">🎙️ Default AI voice</label>
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
                        <div className="font-medium">{v.label}</div>
                        <div className={`text-xs mt-0.5 ${preferences.defaultVoice === v.value ? 'text-indigo-200' : 'text-gray-400'}`}>{v.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle preferences */}
                <div className="space-y-4">
                  {[
                    { key: 'autoSummarize', label: '🤖 Auto-summarize calls', desc: 'Automatically generate AI summary after each call' },
                    { key: 'darkMode', label: '🌙 Dark mode', desc: 'Toggle dark/light theme', action: toggleDarkMode, value: darkMode },
                  ].map(pref => (
                    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
  <div>
    <p className="text-sm font-medium text-gray-700">🌙 Dark mode</p>
    <p className="text-xs text-gray-400">Toggle dark/light theme across the app</p>
  </div>
  <button
    onClick={toggleDarkMode}
    className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-indigo-600' : 'bg-gray-300'}`}
  >
    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${darkMode ? 'left-6' : 'left-0.5'}`} />
  </button>
</div>
                  ))}
                </div>

                <button className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
                  Save preferences
                </button>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-700 mb-5">🔔 Notification Settings</h2>
                <div className="space-y-4">
                  {[
                    { key: 'emailAlerts', label: 'Email alerts', desc: 'Receive email when campaigns complete' },
                    { key: 'campaignComplete', label: 'Campaign completion', desc: 'Notify when all calls in a campaign finish' },
                    { key: 'weeklyReport', label: 'Weekly report', desc: 'Get weekly summary of your campaigns' },
                    { key: 'sentimentAlerts', label: 'Negative sentiment alerts', desc: 'Alert when calls have negative sentiment' },
                  ].map(notif => (
                    <div key={notif.key} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{notif.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{notif.desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifications(n => ({ ...n, [notif.key]: !n[notif.key] }))}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          notifications[notif.key] ? 'bg-indigo-600' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${
                          notifications[notif.key] ? 'left-6' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
                <button className="mt-4 w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
                  Save notification settings
                </button>
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {stats ? [
                    { label: 'Total campaigns', value: stats.total_campaigns, icon: '📢', color: 'text-indigo-600' },
                    { label: 'Total contacts', value: stats.total_contacts, icon: '👥', color: 'text-blue-600' },
                    { label: 'Calls made', value: stats.total_calls, icon: '📞', color: 'text-green-600' },
                    { label: 'Completed campaigns', value: stats.completed_campaigns, icon: '✅', color: 'text-emerald-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="text-3xl mb-2">{s.icon}</div>
                      <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                    </div>
                  )) : (
                    <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-8 text-center">
                      <p className="text-gray-400">Loading stats...</p>
                    </div>
                  )}
                </div>

                {stats && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-700 mb-4">Usage overview</h2>
                    <div className="space-y-4">
                      {[
                        { label: 'Campaigns', value: stats.total_campaigns, max: 20, color: 'bg-indigo-500' },
                        { label: 'Calls completed', value: stats.total_calls, max: 100, color: 'bg-green-500' },
                        { label: 'Contacts managed', value: stats.total_contacts, max: 200, color: 'bg-blue-500' },
                      ].map(item => (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{item.label}</span>
                            <span className="font-medium text-gray-800">{item.value}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${item.color}`}
                              style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow">
                      V
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-800 text-xl">VoiceIQ</h2>
                      <p className="text-sm text-gray-500">AI Bulk Call Simulator v1.0</p>
                      <p className="text-xs text-indigo-600 mt-0.5">Built for SPPU submission</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    VoiceIQ is an AI-powered bulk call simulation system that automates outbound calling campaigns with emotionally intelligent conversations, real-time sentiment analysis, and outcome prediction.
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-700 mb-4">🛠️ Tech stack</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: '⚛️', label: 'Frontend', value: 'React + Vite + Tailwind' },
                      { icon: '🐍', label: 'Backend', value: 'Python Flask REST API' },
                      { icon: '🤖', label: 'AI Engine', value: 'Groq LLaMA 3.3 70B' },
                      { icon: '🎤', label: 'Voice', value: 'Web Speech API' },
                      { icon: '🗄️', label: 'Database', value: 'Supabase PostgreSQL' },
                      { icon: '🔐', label: 'Auth', value: 'JWT Extended' },
                      { icon: '🚀', label: 'Deploy', value: 'Vercel + Render' },
                      { icon: '🐳', label: 'DevOps', value: 'Docker + GitHub Actions' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg p-2">
                        <span>{item.icon}</span>
                        <div>
                          <p className="text-xs text-gray-400">{item.label}</p>
                          <p className="font-medium text-gray-700 text-xs">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-700 mb-4">✅ All 14 modules</h2>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      'User Authentication (JWT)',
                      'Contact Management (CSV/Excel)',
                      'Campaign Engine',
                      'AI Call Simulator (Web Speech API)',
                      'Transcript Storage & Retrieval',
                      'Analytics Dashboard',
                      'AI Script Builder (Groq)',
                      'Call Scheduling',
                      'Contact Groups & Tagging',
                      'Post-Call Campaign Report (PDF)',
                      'Multi-language Support',
                      'Settings & Profile Management',
                      '🧠 Emotion-Adaptive AI Caller',
                      '🔮 AI Call Outcome Predictor',
                    ].map((mod, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-green-500 font-bold text-xs">{i + 1}.</span>
                        <span className="text-gray-700">{mod}</span>
                        <span className="ml-auto text-green-500 text-xs">✅</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}