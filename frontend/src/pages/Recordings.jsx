import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import axios from 'axios'

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL })
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default function Recordings() {
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    API.get('/api/recordings/all')
      .then(r => setRecordings(r.data))
      .catch(() => setRecordings([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = recordings.filter(r => {
    const name = (r.contacts?.name || '').toLowerCase()
    const phone = r.contacts?.phone || ''
    const campaign = (r.campaigns?.name || '').toLowerCase()
    return (
      name.includes(search.toLowerCase()) ||
      phone.includes(search) ||
      campaign.includes(search.toLowerCase())
    )
  })

  const handleDelete = async (id) => {
    if (!confirm('Delete this recording?')) return
    try {
      await API.delete(`/api/recordings/${id}`)
      setRecordings(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      alert('Delete failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🎙️ Call Recordings</h1>
            <p className="text-sm text-gray-500 mt-1">{recordings.length} recording{recordings.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search by contact name, phone or campaign..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
        />

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">Loading recordings...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-5xl mb-4">🎙️</p>
            <p className="text-gray-500 text-sm font-medium">No recordings yet.</p>
            <p className="text-gray-400 text-xs mt-1">Recordings are saved automatically during calls.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((rec) => (
              <div key={rec.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">{rec.contacts?.name || 'Unknown contact'}</p>
                    <p className="text-xs text-gray-500">{rec.contacts?.phone}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{rec.campaigns?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{new Date(rec.created_at).toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Duration: ~{Math.floor((rec.duration || 0) / 60)}m {(rec.duration || 0) % 60}s
                    </p>
                    <button
                      onClick={() => handleDelete(rec.id)}
                      className="text-xs text-red-400 hover:text-red-600 mt-1"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
                {rec.audio_data ? (
                  <audio controls src={rec.audio_data} className="w-full" />
                ) : (
                  <p className="text-xs text-gray-400 italic">Audio not available</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}