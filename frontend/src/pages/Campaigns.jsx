import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Upload from './Upload'
import {
  getCampaigns, createCampaign, deleteCampaign,
  generateScript, getContacts, updateContactTag
} from '../services/api'
import { useNavigate } from 'react-router-dom'

const GROUPS = ['General', 'VIP', 'New Customer', 'Follow-up', 'Inactive']

const languages = [
  { code: 'en-US', label: '🇺🇸 English' },
  { code: 'hi-IN', label: '🇮🇳 Hindi' },
  { code: 'mr-IN', label: '🟠 Marathi' },
]

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showUpload, setShowUpload] = useState(null)
  const [showContacts, setShowContacts] = useState(null)
  const [contacts, setContacts] = useState([])
  const [form, setForm] = useState({
  name: '', script: '', language: 'en-US',
  scheduled_at: '', group_name: 'General', voice_gender: 'female'
})
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [goal, setGoal] = useState('')
  const [showGoalBox, setShowGoalBox] = useState(false)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const navigate = useNavigate()

  const fetchCampaigns = () => {
    getCampaigns().then(r => setCampaigns(r.data)).catch(() => {})
  }

  useEffect(() => { fetchCampaigns() }, [])

  // Auto-check scheduled campaigns every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      campaigns.forEach(c => {
        if (c.status === 'scheduled' && c.scheduled_at) {
          const scheduledTime = new Date(c.scheduled_at)
          if (new Date() >= scheduledTime) {
            navigate(`/simulator/${c.id}`)
          }
        }
      })
    }, 30000)
    return () => clearInterval(interval)
  }, [campaigns])

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
  name: form.name,
  script: form.script,
  language: form.language,
  voice_gender: form.voice_gender,
  scheduled_at: scheduleEnabled && form.scheduled_at ? form.scheduled_at : null
}
      await createCampaign(payload)
      setForm({ name: '', script: '', language: 'en-US', scheduled_at: '', group_name: 'General' })
      setShowForm(false)
      setGoal('')
      setShowGoalBox(false)
      setScheduleEnabled(false)
      fetchCampaigns()
    } catch (err) {
      alert('Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateScript = async () => {
    if (!goal.trim()) {
      alert('Please enter your campaign goal first')
      return
    }
    setGenerating(true)
    try {
      const res = await generateScript({ goal, language: form.language })
      setForm(prev => ({ ...prev, script: res.data.script }))
      setShowGoalBox(false)
    } catch (err) {
      alert('Failed to generate script. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign and all its contacts?')) return
    try {
      await deleteCampaign(id)
      fetchCampaigns()
    } catch (err) {
      alert('Failed to delete campaign')
    }
  }

  const handleViewContacts = async (campaignId) => {
    if (showContacts === campaignId) {
      setShowContacts(null)
      return
    }
    const res = await getContacts(campaignId)
    setContacts(res.data)
    setShowContacts(campaignId)
  }

  const handleTagContact = async (contactId, group) => {
    await updateContactTag(contactId, group)
    setContacts(prev => prev.map(c =>
      c.id === contactId ? { ...c, group_name: group } : c
    ))
  }

  const getScheduleLabel = (campaign) => {
    if (!campaign.scheduled_at) return null
    const d = new Date(campaign.scheduled_at)
    const now = new Date()
    if (d > now) {
      const diff = Math.round((d - now) / 60000)
      if (diff < 60) return `Starts in ${diff} min`
      if (diff < 1440) return `Starts in ${Math.round(diff / 60)}h`
      return `Starts ${d.toLocaleDateString()}`
    }
    return null
  }

  const groupColors = {
    'General': 'bg-gray-100 text-gray-600',
    'VIP': 'bg-yellow-100 text-yellow-700',
    'New Customer': 'bg-blue-100 text-blue-700',
    'Follow-up': 'bg-purple-100 text-purple-700',
    'Inactive': 'bg-red-100 text-red-600',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Campaigns</h1>
            <p className="text-sm text-gray-500 mt-1">{campaigns.length} total campaigns</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setShowGoalBox(false) }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
          >
            + New campaign
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-base font-medium text-gray-700 mb-4">Create campaign</h2>
            <form onSubmit={handleCreate} className="space-y-4">

              {/* Name */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Campaign name</label>
                <input
                  type="text" required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Customer Feedback Q2"
                />
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Call language</label>
                <div className="flex gap-2">
                  {languages.map(lang => (
                    <button key={lang.code} type="button"
                      onClick={() => setForm({ ...form, language: lang.code })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                        form.language === lang.code
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >{lang.label}</button>
                  ))}
                </div>
              </div>

              {/* Voice Gender */}
<div>
  <label className="block text-sm text-gray-600 mb-1">AI caller voice</label>
  <div className="flex gap-3">
    {[
      { value: 'female', label: '👩 Female voice', desc: 'Warm and friendly' },
      { value: 'male', label: '👨 Male voice', desc: 'Deep and professional' }
    ].map(v => (
      <button
        key={v.value}
        type="button"
        onClick={() => setForm({ ...form, voice_gender: v.value })}
        className={`flex-1 py-3 px-3 rounded-xl text-sm border-2 transition-colors text-left ${
          form.voice_gender === v.value
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'border-gray-200 text-gray-600 hover:border-indigo-300'
        }`}
      >
        <div className="font-medium">{v.label}</div>
        <div className={`text-xs mt-0.5 ${form.voice_gender === v.value ? 'text-indigo-200' : 'text-gray-400'}`}>
          {v.desc}
        </div>
      </button>
    ))}
  </div>
</div> 
              {/* Contact Group */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Default contact group</label>
                <div className="flex flex-wrap gap-2">
                  {GROUPS.map(g => (
                    <button key={g} type="button"
                      onClick={() => setForm({ ...form, group_name: g })}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        form.group_name === g
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >{g}</button>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="schedule"
                    checked={scheduleEnabled}
                    onChange={e => setScheduleEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="schedule" className="text-sm text-gray-600">
                    📅 Schedule this campaign for later
                  </label>
                </div>
                {scheduleEnabled && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-600 mb-2">Select date and time to auto-start:</p>
                    <input
                      type="datetime-local"
                      className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.scheduled_at}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* AI Script Builder */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm text-gray-600">AI script / goal</label>
                  <button
                    type="button"
                    onClick={() => setShowGoalBox(!showGoalBox)}
                    className="text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1 rounded-full hover:opacity-90"
                  >
                    ✨ Generate with AI
                  </button>
                </div>

                {showGoalBox && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-3">
                    <p className="text-xs text-indigo-700 font-medium mb-2">
                      Describe your campaign goal in plain English:
                    </p>
                    <textarea
                      rows={2}
                      className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white mb-2"
                      value={goal}
                      onChange={e => setGoal(e.target.value)}
                      placeholder="e.g. Collect feedback from customers who bought last month"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateScript}
                      disabled={generating}
                      className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {generating ? '✨ Generating...' : '✨ Generate script'}
                    </button>
                  </div>
                )}

                <textarea
                  required rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.script}
                  onChange={e => setForm({ ...form, script: e.target.value })}
                  placeholder="Write manually or click '✨ Generate with AI' above..."
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={loading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : scheduleEnabled ? '📅 Schedule campaign' : 'Create campaign'}
                </button>
                <button type="button"
                  onClick={() => { setShowForm(false); setShowGoalBox(false); setGoal(''); setScheduleEnabled(false) }}
                  className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Campaigns list */}
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-400 text-sm">No campaigns yet. Create your first one!</p>
            </div>
          ) : campaigns.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-medium text-gray-800">{c.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {languages.find(l => l.code === c.language)?.label || '🇺🇸 English'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">{c.script}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.status === 'running' ? 'bg-green-100 text-green-700' :
                      c.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      c.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{c.status}</span>

                    {getScheduleLabel(c) && (
                      <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">
                        ⏰ {getScheduleLabel(c)}
                      </span>
                    )}

                    <span className="text-xs text-gray-400">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4 min-w-fit">
                  <button
                    onClick={() => setShowUpload(showUpload === c.id ? null : c.id)}
                    className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50"
                  >
                    📁 Upload contacts
                  </button>
                  <button
                    onClick={() => handleViewContacts(c.id)}
                    className="border border-indigo-300 text-indigo-600 px-3 py-1.5 rounded-lg text-xs hover:bg-indigo-50"
                  >
                    👥 View contacts
                  </button>
                  <button
                    onClick={() => navigate(`/simulator/${c.id}`)}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-indigo-700"
                  >
                    <button
  onClick={() => navigate(`/report/${c.id}`)}
  className="border border-green-500 text-green-600 px-3 py-1.5 rounded-lg text-xs hover:bg-green-50"
>
  📄 View report
</button>
                  <button
  onClick={() => navigate(`/predictor/${c.id}`)}
  className="border border-purple-400 text-purple-600 px-3 py-1.5 rounded-lg text-xs hover:bg-purple-50"
>
  🔮 Predict
</button>
                    ▶ Start calls
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-400 hover:text-red-600 text-xs text-center"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>

              {/* Upload contacts */}
              {showUpload === c.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Upload
                    campaignId={c.id}
                    defaultGroup={c.group_name || 'General'}
                    onDone={() => setShowUpload(null)}
                  />
                </div>
              )}

              {/* View contacts with group tagging */}
              {showContacts === c.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Contacts ({contacts.length})
                  </h4>
                  {contacts.length === 0 ? (
                    <p className="text-sm text-gray-400">No contacts yet. Upload a CSV above.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {contacts.map(contact => (
                        <div key={contact.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium text-gray-700">{contact.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-400">{contact.phone}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              contact.status === 'completed' ? 'bg-green-100 text-green-700' :
                              contact.status === 'pending' ? 'bg-gray-100 text-gray-600' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>{contact.status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${groupColors[contact.group_name] || groupColors['General']}`}>
                              {contact.group_name || 'General'}
                            </span>
                            <select
                              value={contact.group_name || 'General'}
                              onChange={e => handleTagContact(contact.id, e.target.value)}
                              className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none"
                            >
                              {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}