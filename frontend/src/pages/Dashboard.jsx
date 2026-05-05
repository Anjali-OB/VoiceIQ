import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { getCampaigns, getAllTranscripts } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [transcripts, setTranscripts] = useState([])

  useEffect(() => {
    getCampaigns().then(r => setCampaigns(r.data)).catch(() => {})
    getAllTranscripts().then(r => setTranscripts(r.data)).catch(() => {})
  }, [])

  const stats = [
    { label: 'Total campaigns', value: campaigns.length },
    { label: 'Calls completed', value: transcripts.length },
    { label: 'Positive calls', value: transcripts.filter(t => t.sentiment === 'positive').length },
    { label: 'Active campaigns', value: campaigns.filter(c => c.status === 'running').length },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">
          Good morning, {user?.name}
        </h1>
        <p className="text-gray-500 text-sm mb-8">Here's your VoiceIQ overview</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-3xl font-semibold text-indigo-600">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-medium text-gray-700 mb-4">Recent campaigns</h2>
            {campaigns.length === 0 ? (
              <p className="text-sm text-gray-400">No campaigns yet. <Link to="/campaigns" className="text-indigo-500">Create one</Link></p>
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