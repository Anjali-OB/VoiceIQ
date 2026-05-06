import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { getCampaigns, getAllTranscripts } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444']

export default function Dashboard() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [transcripts, setTranscripts] = useState([])

  useEffect(() => {
    getCampaigns().then(r => setCampaigns(r.data)).catch(() => {})
    getAllTranscripts().then(r => setTranscripts(r.data)).catch(() => {})
  }, [])

  const stats = [
    { label: 'Total campaigns', value: campaigns.length, color: 'text-indigo-600' },
    { label: 'Calls completed', value: transcripts.length, color: 'text-green-600' },
    { label: 'Positive calls', value: transcripts.filter(t => t.sentiment === 'positive').length, color: 'text-emerald-600' },
    { label: 'Active campaigns', value: campaigns.filter(c => c.status === 'running').length, color: 'text-yellow-600' },
  ]

  const sentimentData = [
    { name: 'Positive', value: transcripts.filter(t => t.sentiment === 'positive').length },
    { name: 'Neutral', value: transcripts.filter(t => t.sentiment === 'neutral').length },
    { name: 'Negative', value: transcripts.filter(t => t.sentiment === 'negative').length },
  ].filter(d => d.value > 0)

  const campaignData = campaigns.slice(0, 5).map(c => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + '...' : c.name,
    calls: transcripts.filter(t => t.campaign_id === c.id).length
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">
          Good morning, {user?.name} 👋
        </h1>
        <p className="text-gray-500 text-sm mb-8">Here's your VoiceIQ overview</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className={`text-3xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">

          {/* Sentiment pie chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-medium text-gray-700 mb-4">Call sentiment breakdown</h2>
            {sentimentData.length === 0 ? (
  <p className="text-sm text-gray-400 text-center py-8">No calls yet</p>
) : (
  <ResponsiveContainer width="100%" height={220}>
    <PieChart>
      <Pie
        data={sentimentData}
        cx="50%"
        cy="50%"
        innerRadius={50}
        outerRadius={85}
        paddingAngle={3}
        dataKey="value"
      >
        {sentimentData.map((_, i) => (
          <Cell key={i} fill={COLORS[i % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(value, name) => [value, name]} />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
)}
          </div>

          {/* Calls per campaign bar chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-medium text-gray-700 mb-4">Calls per campaign</h2>
            {campaignData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No campaigns yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={campaignData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="calls" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Recent campaigns */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-medium text-gray-700 mb-4">Recent campaigns</h2>
            {campaigns.length === 0 ? (
              <p className="text-sm text-gray-400">
                No campaigns yet.{' '}
                <Link to="/campaigns" className="text-indigo-500">Create one</Link>
              </p>
            ) : (
              <div className="space-y-3">
                {campaigns.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{c.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.status === 'running' ? 'bg-green-100 text-green-700' :
                      c.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-medium text-gray-700 mb-4">Quick actions</h2>
            <div className="space-y-3">
              <Link to="/campaigns" className="block w-full text-center bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700">
                Create new campaign
              </Link>
              <Link to="/campaigns" className="block w-full text-center border border-indigo-600 text-indigo-600 py-2 rounded-lg text-sm hover:bg-indigo-50">
                Upload contacts
              </Link>
              <Link to="/transcripts" className="block w-full text-center border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                View transcripts
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}