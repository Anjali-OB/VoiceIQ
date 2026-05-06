import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getCampaigns, getContacts, predictOutcomes } from '../services/api'

export default function Predictor() {
  const { campaignId } = useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)
  const [contacts, setContacts] = useState([])
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(false)
  const [predicted, setPredicted] = useState(false)
  const [accuracy, setAccuracy] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [campRes, contactsRes] = await Promise.all([
        getCampaigns(),
        getContacts(campaignId)
      ])
      const camp = campRes.data.find(c => c.id === campaignId)
      setCampaign(camp)
      setContacts(contactsRes.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handlePredict = async () => {
    setLoading(true)
    try {
      const res = await predictOutcomes({
        contacts: contacts.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          group_name: c.group_name,
          status: c.status
        })),
        script: campaign?.script || '',
        campaign_name: campaign?.name || ''
      })
      setPredictions(res.data.predictions)
      setPredicted(true)

      // Calculate accuracy if some calls already completed
      const completed = contacts.filter(c => c.status === 'completed')
      if (completed.length > 0) {
        const avgPredicted = res.data.predictions
          .filter(p => completed.find(c => c.id === p.id))
          .reduce((sum, p) => sum + p.success_score, 0) / completed.length
        setAccuracy(Math.round(avgPredicted))
      }
    } catch (err) {
      alert('Prediction failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 70) return { text: 'text-green-700', bg: 'bg-green-50', bar: 'bg-green-500', label: 'High' }
    if (score >= 45) return { text: 'text-yellow-700', bg: 'bg-yellow-50', bar: 'bg-yellow-500', label: 'Medium' }
    return { text: 'text-red-700', bg: 'bg-red-50', bar: 'bg-red-500', label: 'Low' }
  }

  const avgScore = predictions.length > 0
    ? Math.round(predictions.reduce((s, p) => s + p.success_score, 0) / predictions.length)
    : 0

  const highChance = predictions.filter(p => p.success_score >= 70).length
  const medChance = predictions.filter(p => p.success_score >= 45 && p.success_score < 70).length
  const lowChance = predictions.filter(p => p.success_score < 45).length

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <button onClick={() => navigate('/campaigns')}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2 block">
              ← Back to campaigns
            </button>
            <h1 className="text-2xl font-semibold text-gray-800">🔮 AI Outcome Predictor</h1>
            <p className="text-sm text-gray-500 mt-1">
              {campaign?.name} · {contacts.length} contacts
            </p>
          </div>
          <button
            onClick={handlePredict}
            disabled={loading || contacts.length === 0}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? '🔮 Predicting...' : '🔮 Run AI Prediction'}
          </button>
        </div>

        {/* Campaign info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <p className="text-xs text-gray-500 mb-1">Campaign script</p>
          <p className="text-sm text-gray-700">{campaign?.script}</p>
        </div>

        {!predicted ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-5xl mb-4">🔮</p>
            <h2 className="text-lg font-medium text-gray-800 mb-2">Ready to predict outcomes</h2>
            <p className="text-sm text-gray-500 mb-6">
              AI will analyze all {contacts.length} contacts and predict who is most likely to respond positively,
              then reorder them for maximum success rate.
            </p>
            <button
              onClick={handlePredict}
              disabled={loading || contacts.length === 0}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? '🔮 Analyzing contacts...' : '🔮 Run AI Prediction'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Avg success rate', value: `${avgScore}%`, color: 'text-indigo-600' },
                { label: 'High chance', value: highChance, color: 'text-green-600' },
                { label: 'Medium chance', value: medChance, color: 'text-yellow-600' },
                { label: 'Low chance', value: lowChance, color: 'text-red-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {accuracy !== null && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <p className="text-sm font-medium text-indigo-800">
                  📊 Prediction Accuracy Check: Based on completed calls, predicted avg score was {accuracy}%
                </p>
              </div>
            )}

            {/* Sorted contacts */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium text-gray-700">
                  Contacts ranked by predicted success
                </h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  Sorted: highest → lowest
                </span>
              </div>

              <div className="space-y-4">
                {predictions.map((pred, i) => {
                  const contact = contacts.find(c => c.id === pred.id)
                  const colors = getScoreColor(pred.success_score)
                  const emotionEmojis = {
                    happy: '😊', interested: '🤩', neutral: '😐',
                    confused: '😕', sad: '😢', frustrated: '😤', angry: '😠'
                  }

                  return (
                    <div key={pred.id} className={`rounded-xl border p-4 ${colors.bg} border-gray-200`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${colors.bg} ${colors.text} border border-current`}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{contact?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{contact?.phone} · {contact?.group_name || 'General'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${colors.text}`}>{pred.success_score}%</p>
                          <span className={`text-xs font-medium ${colors.text}`}>{colors.label} chance</span>
                        </div>
                      </div>

                      {/* Score bar */}
                      <div className="w-full bg-white rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${colors.bar}`}
                          style={{ width: `${pred.success_score}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Predicted emotion */}
                        <div className="bg-white rounded-lg p-2">
                          <p className="text-xs text-gray-400 mb-1">Predicted emotion</p>
                          <p className="text-sm font-medium text-gray-700">
                            {emotionEmojis[pred.predicted_emotion] || '😐'} {pred.predicted_emotion}
                          </p>
                        </div>

                        {/* AI reason */}
                        <div className="bg-white rounded-lg p-2">
                          <p className="text-xs text-gray-400 mb-1">AI reasoning</p>
                          <p className="text-xs text-gray-600">{pred.reason}</p>
                        </div>
                      </div>

                      {/* Personalized opening */}
                      <div className="mt-3 bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">💬 Suggested opening line</p>
                        <p className="text-sm text-indigo-700 italic">"{pred.best_opening}"</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Start calls button */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Ready to call?</p>
                <p className="text-sm text-gray-500">Contacts are ranked by success probability</p>
              </div>
              <button
                onClick={() => navigate(`/simulator/${campaignId}`)}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                ▶ Start calls in order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}