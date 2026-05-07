import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { getCampaigns, getAllTranscripts } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#10b981', '#6b7280', '#ef4444', '#4f46e5']

export default function Dashboard() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [transcripts, setTranscripts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getCampaigns().then(r => setCampaigns(r.data)),
      getAllTranscripts().then(r => setTranscripts(r.data))
    ]).finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: 'Total campaigns', value: campaigns.length, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: '📢' },
    { label: 'Calls completed', value: transcripts.length, color: 'text-green-600', bg: 'bg-green-50', icon: '📞' },
    { label: 'Positive calls', value: transcripts.filter(t => t.sentiment === 'positive').length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '😊' },
    { label: 'Active campaigns', value: campaigns.filter(c => c.status === 'running').length, color: 'text-yellow-600', bg: 'bg-yellow-50', icon: '⚡' },
  ]

  const sentimentData = [
    { name: 'Positive', value: transcripts.filter(t => t.sentiment === 'positive').length },
    { name: 'Neutral', value: transcripts.filter(t => t.sentiment === 'neutral').length },
    { name: 'Negative', value: transcripts.filter(t => t.sentiment === 'negative').length },
  ].filter(d => d.value > 0)

  const campaignData = campaigns.slice(0, 6).map(c => ({
    name: c.name.length > 10 ? c.name.slice(0, 10) + '...' : c.name,
    calls: transcripts.filter(t => t.campaign_id === c.id).length
  }))

  const getHour = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            {getHour()}, {user?.name} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here's your VoiceIQ overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className={`bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-sm transition-shadow`}>
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-xl mb-3`}>
                {s.icon}
              </div>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">

          {/* Sentiment Pie Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Call Sentiment Breakdown</h2>
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-gray-400 text-sm">Loading...</p>
              </div>
            ) : sentimentData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48">
                <p className="text-4xl mb-2">📊</p>
                <p className="text-gray-400 text-sm">No calls yet — run a campaign to see data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={true}
                  >
                    {sentimentData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value + ' calls', name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Calls per Campaign Bar Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Calls per Campaign</h2>
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-gray-400 text-sm">Loading...</p>
              </div>
            ) : campaignData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48">
                <p className="text-4xl mb-2">📈</p>
                <p className="text-gray-400 text-sm">No campaigns yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={campaignData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="calls" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Recent campaigns */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-700">Recent campaigns</h2>
              <Link to="/campaigns" className="text-xs text-indigo-600 hover:underline">View all →</Link>
            </div>
            {campaigns.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm">No campaigns yet.</p>
                <Link to="/campaigns" className="text-indigo-500 text-sm hover:underline">Create your first one</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{c.name}</p>
                      <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.status === 'running' ? 'bg-green-100 text-green-700' :
                      c.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      c.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Quick actions</h2>
            <div className="space-y-3">
              {[
                { to: '/campaigns', icon: '➕', label: 'Create new campaign', color: 'bg-indigo-600 text-white hover:bg-indigo-700' },
                { to: '/campaigns', icon: '📁', label: 'Upload contacts', color: 'border border-indigo-300 text-indigo-600 hover:bg-indigo-50' },
                { to: '/transcripts', icon: '📋', label: 'View transcripts', color: 'border border-gray-300 text-gray-600 hover:bg-gray-50' },
                { to: '/settings', icon: '⚙️', label: 'Settings', color: 'border border-gray-300 text-gray-600 hover:bg-gray-50' },
              ].map(action => (
                <Link
                  key={action.to + action.label}
                  to={action.to}
                  className={`flex items-center gap-3 w-full text-center ${action.color} py-2.5 px-4 rounded-xl text-sm font-medium transition-colors`}
                >
                  <span>{action.icon}</span>
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}