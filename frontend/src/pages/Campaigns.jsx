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

const groupColors = {
  'General': 'bg-gray-100 text-gray-600',
  'VIP': 'bg-yellow-100 text-yellow-700',
  'New Customer': 'bg-blue-100 text-blue-700',
  'Follow-up': 'bg-purple-100 text-purple-700',
  'Inactive': 'bg-red-100 text-red-600',
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showUpload, setShowUpload] = useState(null)
  const [showContacts, setShowContacts] = useState(null)
  const [contacts, setContacts] = useState([])
  const [form, setForm] = useState({
    name: '',
    script: '',
    language: 'en-US',
    scheduled_at: '',
    group_name: 'General',
    voice_gender: 'female'
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

  useEffect(() => {
    fetchCampaigns()
  }, [])

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
      setForm({ name: '', script: '', language: 'en-US', scheduled_at: '', group_name: 'General', voice_gender: 'female' })
      setShowForm(false)
      setGoal('')
      setShowGoalBox(false)
      setScheduleEnabled(false)
      fetchCampaigns()
    } catch (err) {
      alert('Failed to create campaign. Please try again.')
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

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this campaign and all its contacts and transcripts?')) return
    try {
      await deleteCampaign(id)
      fetchCampaigns()
    } catch (err) {
      alert('Failed to delete campaign')
    }
  }

  const handleViewContacts = async (e, campaignId) => {
    e.stopPropagation()
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Campaigns</h1>
            <p className="text-sm text-gray-500 mt-1">{campaigns.length} total campaigns</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setShowGoalBox(false) }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm"
          >
            + New campaign
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-700 mb-5">Create new campaign</h2>
            <form onSubmit={handleCreate} className="space-y-5">

              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign name</label>
                <input
                  type="text" required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Customer Feedback Q2 2026"
                />
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📞 Call language</label>
                <div className="flex gap-2">
                  {languages.map(lang => (
                    <button key={lang.code} type="button"
                      onClick={() => setForm({ ...form, language: lang.code })}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-sm border-2 transition-colors ${
                        form.language === lang.code
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                      }`}
                    >{lang.label}</button>
                  ))}
                </div>
              </div>

              {/* Voice Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🎙️ AI caller voice</label>
                <div className="flex gap-3">
                  {[
                    { value: 'female', label: '👩 Female voice', desc: 'Warm and friendly' },
                    { value: 'male', label: '👨 Male voice', desc: 'Deep and professional' }
                  ].map(v => (
                    <button key={v.value} type="button"
                      onClick={() => setForm({ ...form, voice_gender: v.value })}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm border-2 transition-colors text-left ${
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
                <label className="block text-sm font-medium text-gray-700 mb-2">👥 Default contact group</label>
                <div className="flex flex-wrap gap-2">
                  {GROUPS.map(g => (
                    <button key={g} type="button"
                      onClick={() => setForm({ ...form, group_name: g })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-colors ${
                        form.group_name === g
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                      }`}
                    >{g}</button>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="checkbox"
                    id="schedule"
                    checked={scheduleEnabled}
                    onChange={e => setScheduleEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <label htmlFor="schedule" className="text-sm font-medium text-gray-700">
                    📅 Schedule this campaign for later
                  </label>
                </div>
                {scheduleEnabled && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs text-blue-600 mb-2 font-medium">Select date and time to auto-start:</p>
                    <input
                      type="datetime-local"
                      className="w-full border border-blue-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.scheduled_at}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* AI Script Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">AI script / goal</label>
                  <button
                    type="button"
                    onClick={() => setShowGoalBox(!showGoalBox)}
                    className="text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1.5 rounded-full hover:opacity-90 font-medium"
                  >
                    ✨ Generate with AI
                  </button>
                </div>

                {showGoalBox && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-3">
                    <p className="text-xs text-indigo-700 font-medium mb-2">
                      Describe your campaign goal in plain English:
                    </p>
                    <textarea
                      rows={2}
                      className="w-full border border-indigo-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white mb-3"
                      value={goal}
                      onChange={e => setGoal(e.target.value)}
                      placeholder="e.g. Collect feedback from customers who bought from us last month about delivery experience"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateScript}
                      disabled={generating}
                      className="w-full bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {generating ? '✨ Generating script...' : '✨ Generate script'}
                    </button>
                  </div>
                )}

                <textarea
                  required rows={5}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.script}
                  onChange={e => setForm({ ...form, script: e.target.value })}
                  placeholder="Write your script manually, or click '✨ Generate with AI' above to auto-generate..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit" disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : scheduleEnabled ? '📅 Schedule campaign' : 'Create campaign'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setShowGoalBox(false); setGoal(''); setScheduleEnabled(false) }}
                  className="border border-gray-300 text-gray-600 px-6 py-2.5 rounded-xl text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Campaigns List */}
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <p className="text-5xl mb-4">📢</p>
              <p className="text-gray-400 text-sm">No campaigns yet.</p>
              <p className="text-gray-300 text-xs mt-1">Create your first campaign to get started!</p>
            </div>
          ) : campaigns.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-800">{c.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {languages.find(l => l.code === c.language)?.label || '🇺🇸 English'}
                    </span>
                    {c.voice_gender && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                        {c.voice_gender === 'female' ? '👩 Female' : '👨 Male'}
                      </span>
                    )}
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

                {/* Action buttons — all with stopPropagation */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowUpload(showUpload === c.id ? null : c.id); setShowContacts(null) }}
                    className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50 text-center"
                  >
                    📁 Upload contacts
                  </button>
                  <button
                    onClick={(e) => handleViewContacts(e, c.id)}
                    className="border border-indigo-300 text-indigo-600 px-3 py-1.5 rounded-lg text-xs hover:bg-indigo-50 text-center"
                  >
                    👥 View contacts
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/simulator/${c.id}`) }}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-indigo-700 text-center"
                  >
                    ▶ Start calls
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/predictor/${c.id}`) }}
                    className="border border-purple-400 text-purple-600 px-3 py-1.5 rounded-lg text-xs hover:bg-purple-50 text-center"
                  >
                    🔮 Predict
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/report/${c.id}`) }}
                    className="border border-green-400 text-green-600 px-3 py-1.5 rounded-lg text-xs hover:bg-green-50 text-center"
                  >
                    📄 View report
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, c.id)}
                    className="text-red-400 hover:text-red-600 text-xs text-center py-1"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>

              {/* Upload contacts panel */}
              {showUpload === c.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Upload
                    campaignId={c.id}
                    defaultGroup={c.group_name || 'General'}
                    onDone={() => { setShowUpload(null); fetchCampaigns() }}
                  />
                </div>
              )}

              {/* View contacts panel */}
              {showContacts === c.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Contacts ({contacts.length})
                  </h4>
                  {contacts.length === 0 ? (
                    <p className="text-sm text-gray-400">No contacts yet. Upload a CSV above.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {contacts.map(contact => (
                        <div key={contact.id}
                          className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium text-gray-700">{contact.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-400">{contact.phone}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              contact.status === 'completed' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{contact.status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${groupColors[contact.group_name] || groupColors['General']}`}>
                              {contact.group_name || 'General'}
                            </span>
                            <select
                              value={contact.group_name || 'General'}
                              onChange={e => handleTagContact(contact.id, e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-1.5 py-0.5 focus:outline-none bg-white"
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