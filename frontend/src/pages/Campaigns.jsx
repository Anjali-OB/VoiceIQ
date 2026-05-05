import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Upload from './Upload'
import { getCampaigns, createCampaign, deleteCampaign } from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showUpload, setShowUpload] = useState(null)
  const [form, setForm] = useState({ name: '', script: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const fetchCampaigns = () => {
    getCampaigns().then(r => setCampaigns(r.data)).catch(() => {})
  }

  useEffect(() => { fetchCampaigns() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createCampaign(form)
      setForm({ name: '', script: '' })
      setShowForm(false)
      fetchCampaigns()
    } catch (err) {
      alert('Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign?')) return
    await deleteCampaign(id)
    fetchCampaigns()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Campaigns</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
          >
            + New campaign
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-base font-medium text-gray-700 mb-4">Create campaign</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Campaign name</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Customer Feedback Survey"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">AI script / goal</label>
                <textarea
                  required
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.script}
                  onChange={e => setForm({ ...form, script: e.target.value })}
                  placeholder="e.g. You are calling customers to collect feedback about their recent purchase. Ask about satisfaction, product quality, and delivery experience."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create campaign'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-400 text-sm">No campaigns yet. Create your first one!</p>
            </div>
          ) : campaigns.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-800">{c.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.script}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.status === 'running' ? 'bg-green-100 text-green-700' :
                    c.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{c.status}</span>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setShowUpload(showUpload === c.id ? null : c.id)}
                    className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50"
                  >
                    Upload contacts
                  </button>
                  <button
                    onClick={() => navigate(`/simulator/${c.id}`)}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-indigo-700"
                  >
                    Start calls
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-400 hover:text-red-600 px-2 py-1.5 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {showUpload === c.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Upload campaignId={c.id} onDone={() => setShowUpload(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}