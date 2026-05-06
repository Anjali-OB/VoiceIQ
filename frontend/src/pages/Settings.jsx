import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { getProfile, updateProfile, getStats } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { loginUser, user } = useAuth()
  const [profile, setProfile] = useState({ name: '', email: '' })
  const [stats, setStats] = useState(null)
  const [form, setForm] = useState({ name: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [activeTab, setActiveTab] = useState('profile')

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

      // Update local auth context
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

  const statCards = stats ? [
    { label: 'Total campaigns', value: stats.total_campaigns, icon: '📢', color: 'text-indigo-600' },
    { label: 'Total contacts', value: stats.total_contacts, icon: '👥', color: 'text-blue-600' },
    { label: 'Calls made', value: stats.total_calls, icon: '📞', color: 'text-green-600' },
    { label: 'Completed campaigns', value: stats.completed_campaigns, icon: '✅', color: 'text-emerald-600' },
  ] : []

  const tabs = [
    { id: 'profile', label: '👤 Profile' },
    { id: 'stats', label: '📊 My Stats' },
    { id: 'about', label: 'ℹ️ About' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">

            {/* Avatar card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-semibold">
                {profile.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-medium text-gray-800 text-lg">{profile.name}</p>
                <p className="text-sm text-gray-500">{profile.email}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Member since {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Edit form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-medium text-gray-700 mb-4">Edit profile</h2>

              {message.text && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-600'
                }`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Full name</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email address</label>
                  <input
                    type="email"
                    disabled
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                    value={profile.email}
                  />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Change password</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">New password</label>
                      <input
                        type="password"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        placeholder="Leave blank to keep current password"
                        minLength={6}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Confirm new password</label>
                      <input
                        type="password"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={form.confirmPassword}
                        onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                        placeholder="Repeat new password"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save changes'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {statCards.map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <p className={`text-3xl font-semibold ${s.color}`}>{s.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-medium text-gray-700 mb-4">Usage overview</h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Campaigns used</span>
                    <span className="font-medium">{stats?.total_campaigns || 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{ width: `${Math.min((stats?.total_campaigns || 0) * 10, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Calls completed</span>
                    <span className="font-medium">{stats?.total_calls || 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min((stats?.total_calls || 0) * 5, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Contacts managed</span>
                    <span className="font-medium">{stats?.total_contacts || 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min((stats?.total_contacts || 0) * 2, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                  V
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800 text-lg">VoiceIQ</h2>
                  <p className="text-sm text-gray-500">AI Bulk Call Simulator v1.0</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                VoiceIQ is an AI-powered bulk call simulation system built for automating
                outbound calling campaigns. It uses Groq's LLaMA AI for intelligent conversations,
                Web Speech API for voice interaction, and Supabase for data storage.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-medium text-gray-700 mb-4">Tech stack</h2>
              <div className="space-y-3">
                {[
                  { label: 'Frontend', value: 'React + Vite + Tailwind CSS', icon: '⚛️' },
                  { label: 'Backend', value: 'Python Flask + REST API', icon: '🐍' },
                  { label: 'AI Engine', value: 'Groq LLaMA 3.3 70B', icon: '🤖' },
                  { label: 'Voice', value: 'Web Speech API (TTS + STT)', icon: '🎤' },
                  { label: 'Database', value: 'Supabase PostgreSQL', icon: '🗄️' },
                  { label: 'Auth', value: 'JWT (Flask-JWT-Extended)', icon: '🔐' },
                  { label: 'Deployment', value: 'Vercel + Render + Docker', icon: '🚀' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 text-sm">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-gray-500 w-24">{item.label}</span>
                    <span className="font-medium text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-medium text-gray-700 mb-4">Project modules</h2>
              <div className="space-y-2">
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
                ].map((mod, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-green-500 font-medium">{i + 1}.</span>
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
  )
}