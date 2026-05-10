import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import {
  trainRFModel, getRFStats, rfPredict,
  rfPredictBatch, rfCampaignAnalysis, getCampaigns, getContacts
} from '../services/api'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Cell, PieChart, Pie, Legend
} from 'recharts'

const TIER_CONFIG = {
  High:   { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300', bar: 'bg-green-500', badge: 'bg-green-100 text-green-700' },
  Medium: { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-300', bar: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
  Low:    { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300', bar: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
}

export default function RFPredictor() {
  const [activeTab, setActiveTab] = useState('model')
  const [stats, setStats] = useState(null)
  const [training, setTraining] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [selectedAnalyzeCampaign, setSelectedAnalyzeCampaign] = useState('')
  const [campaignData, setCampaignData] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [singleContact, setSingleContact] = useState({
    name: '', phone: '', group_name: 'General',
    language: 'en-US', script: ''
  })
  const [singleResult, setSingleResult] = useState(null)
  const [predicting, setPredicting] = useState(false)
  const [batchResults, setBatchResults] = useState([])
  const [loadingBatch, setLoadingBatch] = useState(false)

  useEffect(() => {
    getCampaigns().then(r => setCampaigns(r.data)).catch(() => {})
    getRFStats().then(r => setStats(r.data)).catch(() => {})
  }, [])

  const handleTrain = async () => {
    setTraining(true)
    try {
      const res = await trainRFModel()
      setStats(res.data)
    } catch (err) {
      alert('Training failed: ' + err.message)
    } finally {
      setTraining(false)
    }
  }

  const handleSinglePredict = async () => {
    setPredicting(true)
    try {
      const res = await rfPredict({ ...singleContact, past_success_rate: 0.5 })
      setSingleResult(res.data)
    } catch (err) {
      alert('Prediction failed')
    } finally {
      setPredicting(false)
    }
  }

  const handleCampaignAnalysis = async () => {
    if (!selectedAnalyzeCampaign) return
    setAnalyzing(true)
    try {
      const res = await rfCampaignAnalysis({ campaign_id: selectedAnalyzeCampaign })
      setCampaignData(res.data)
    } catch (err) {
      alert('Analysis failed: ' + err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleLoadContacts = async () => {
    if (!selectedCampaign) { alert('Select a campaign first'); return }
    setLoadingBatch(true)
    try {
      const camp = campaigns.find(c => c.id === selectedCampaign)
      const contactsRes = await getContacts(selectedCampaign)
      const contacts = contactsRes.data  // rank all contacts, not just pending

      const res = await rfPredictBatch({
        contacts,
        campaign: camp
      })
      setBatchResults(res.data.predictions)
    } catch (err) {
      alert('Failed to load contacts')
    } finally {
      setLoadingBatch(false)
    }
  }

  const tabs = [
    { id: 'model', label: '🌲 Model', title: 'Random Forest Training' },
    { id: 'predict', label: '🎯 Predict', title: 'Single Contact Prediction' },
    { id: 'batch', label: '📋 Batch', title: 'Batch Contact Ranking' },
    { id: 'analyze', label: '📊 Analyze', title: 'Campaign Analysis' },
  ]

  const featureImportanceData = stats?.feature_importance?.slice(0, 6).map(f => ({
    feature: f.feature.replace(/_/g, ' '),
    importance: f.importance
  })) || []

  const cvChartData = stats?.cv_scores?.map((s, i) => ({
    fold: `Fold ${i + 1}`,
    accuracy: s
  })) || []

  const tierCounts = campaignData ? {
    High: campaignData.predictions.filter(p => p.tier === 'High').length,
    Medium: campaignData.predictions.filter(p => p.tier === 'Medium').length,
    Low: campaignData.predictions.filter(p => p.tier === 'Low').length,
  } : {}

  const piData = Object.entries(tierCounts).filter(([_, v]) => v > 0).map(([name, value]) => ({
    name, value,
    fill: name === 'High' ? '#10b981' : name === 'Medium' ? '#f59e0b' : '#ef4444'
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🌲 Random Forest Call Success Predictor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Module 16 — Trained on real + synthetic call data with 10 engineered features
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6">
          {tabs.map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >{tab.label}</button>
          ))}
        </div>

        {/* ── MODEL TAB ── */}
        {activeTab === 'model' && (
          <div className="space-y-4">

            {/* Model Info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">🌲 Model Configuration</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                  { label: 'Algorithm', value: 'Random Forest', icon: '🌲' },
                  { label: 'Estimators', value: '150 trees', icon: '🌳' },
                  { label: 'Max depth', value: '8 levels', icon: '📏' },
                  { label: 'Features', value: '10 features', icon: '⚡' },
                ].map(item => (
                  <div key={item.label} className="bg-indigo-50 rounded-xl p-3 text-center">
                    <p className="text-2xl mb-1">{item.icon}</p>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-sm font-semibold text-indigo-700">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Features list */}
              <div className="mb-5">
                <p className="text-sm font-semibold text-gray-600 mb-3">10 Engineered Features:</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Group Priority', desc: 'VIP=5, New=4, Follow-up=3, General=2, Inactive=1' },
                    { name: 'Language Code', desc: 'English=1, Hindi=2, Marathi=3' },
                    { name: 'Name Length', desc: 'Contact name length (proxy for data quality)' },
                    { name: 'Phone Digits', desc: 'Number of digits in phone number' },
                    { name: 'Has Name', desc: 'Binary — 1 if name provided, 0 if unknown' },
                    { name: 'Script Word Count', desc: 'Campaign script detail level' },
                    { name: 'Campaign Age', desc: 'Days since campaign was created' },
                    { name: 'Hour of Day', desc: 'Time of day when call is made' },
                    { name: 'Day of Week', desc: 'Weekday vs weekend pattern' },
                    { name: 'Past Success Rate', desc: 'Historical positive call rate for campaign' },
                  ].map((f, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs font-semibold text-indigo-700">{i + 1}. {f.name}</p>
                      <p className="text-xs text-gray-500">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleTrain}
                disabled={training}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {training ? '⏳ Training Random Forest...' : '🌲 Train RF Model (300 synthetic + real data)'}
              </button>
            </div>

            {/* Model Results */}
            {stats && (
              <div className="space-y-4">

                {/* Key metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Accuracy', value: `${stats.accuracy}%`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'AUC-ROC', value: `${stats.auc_roc}%`, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'CV Score', value: `${stats.cv_mean}%`, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Real samples', value: stats.real_samples, color: 'text-purple-600', bg: 'bg-purple-50' },
                  ].map(m => (
                    <div key={m.label} className={`${m.bg} rounded-2xl p-5 text-center`}>
                      <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Data breakdown */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Training Data Breakdown</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-gray-700">{stats.total_samples}</p>
                      <p className="text-xs text-gray-500">Total samples</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-blue-600">{stats.synthetic_samples}</p>
                      <p className="text-xs text-gray-500">Synthetic</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-green-600">{stats.real_samples}</p>
                      <p className="text-xs text-gray-500">Real calls</p>
                    </div>
                  </div>
                </div>

                {/* Feature importance chart */}
                {featureImportanceData.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 Feature Importance</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={featureImportanceData} layout="vertical" margin={{ left: 20 }}>
                        <XAxis type="number" tick={{ fontSize: 10 }} unit="%" />
                        <YAxis type="category" dataKey="feature" tick={{ fontSize: 10 }} width={100} />
                        <Tooltip formatter={(v) => [`${v}%`, 'Importance']} />
                        <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                          {featureImportanceData.map((_, i) => (
                            <Cell key={i} fill={`hsl(${220 + i * 15}, 70%, ${50 + i * 5}%)`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      Higher importance = stronger predictor of call success
                    </p>
                  </div>
                )}

                {/* Cross validation scores */}
                {cvChartData.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">🔄 5-Fold Cross Validation</h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Mean: {stats.cv_mean}% ± {stats.cv_std}% — consistent across all folds = reliable model
                    </p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={cvChartData}>
                        <XAxis dataKey="fold" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                        <Tooltip formatter={(v) => [`${v}%`, 'Accuracy']} />
                        <Bar dataKey="accuracy" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Confusion matrix */}
                {stats.confusion_matrix && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">🔢 Confusion Matrix</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-center">
                        <thead>
                          <tr>
                            <th className="p-2 text-gray-400 text-xs">Actual \ Predicted</th>
                            <th className="p-2 font-semibold text-red-600">Failure</th>
                            <th className="p-2 font-semibold text-green-600">Success</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.confusion_matrix.map((row, i) => (
                            <tr key={i}>
                              <td className="p-2 font-semibold text-gray-600">
                                {i === 0 ? '❌ Actual Failure' : '✅ Actual Success'}
                              </td>
                              {row.map((val, j) => (
                                <td key={j} className={`p-4 rounded font-bold text-lg ${
                                  i === j
                                    ? 'bg-green-100 text-green-700'
                                    : val > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                                }`}>{val}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      ✅ Green diagonal = correct predictions · ❌ Off-diagonal = misclassifications
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PREDICT TAB ── */}
        {activeTab === 'predict' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">🎯 Single Contact Prediction</h2>
              <p className="text-sm text-gray-500 mb-5">
                Enter contact details and the Random Forest model will predict call success probability.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contact name</label>
                  <input type="text"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Rahul Sharma"
                    value={singleContact.name}
                    onChange={e => setSingleContact(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone number</label>
                  <input type="text"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 9876543210"
                    value={singleContact.phone}
                    onChange={e => setSingleContact(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contact group</label>
                  <select
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={singleContact.group_name}
                    onChange={e => setSingleContact(p => ({ ...p, group_name: e.target.value }))}
                  >
                    {['General', 'VIP', 'New Customer', 'Follow-up', 'Inactive'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Language</label>
                  <select
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={singleContact.language}
                    onChange={e => setSingleContact(p => ({ ...p, language: e.target.value }))}
                  >
                    <option value="en-US">🇺🇸 English</option>
                    <option value="hi-IN">🇮🇳 Hindi</option>
                    <option value="mr-IN">🟠 Marathi</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Campaign script (optional)</label>
                <textarea rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Collect customer feedback about delivery and product quality"
                  value={singleContact.script}
                  onChange={e => setSingleContact(p => ({ ...p, script: e.target.value }))}
                />
              </div>

              <button
                onClick={handleSinglePredict}
                disabled={predicting}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {predicting ? '⏳ Running prediction...' : '🎯 Predict Call Success'}
              </button>
            </div>

            {singleResult && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Prediction Result</h3>

                {/* Score */}
                <div className={`rounded-2xl p-6 text-center mb-4 ${TIER_CONFIG[singleResult.tier]?.bg}`}>
                  <p className="text-6xl font-bold text-gray-800 mb-1">{singleResult.score}%</p>
                  <p className={`text-lg font-semibold ${TIER_CONFIG[singleResult.tier]?.color}`}>
                    {singleResult.tier} Chance of Success
                  </p>
                  <p className="text-sm text-gray-500 mt-2">{singleResult.recommendation}</p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-4 mb-4">
                  <div
                    className={`h-4 rounded-full transition-all duration-700 ${TIER_CONFIG[singleResult.tier]?.bar}`}
                    style={{ width: `${singleResult.score}%` }}
                  />
                </div>

                {/* Feature contributions */}
                {singleResult.features_used && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-3">Top 5 feature contributions:</p>
                    <div className="space-y-2">
                      {singleResult.features_used.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs">
                          <span className="text-gray-500 w-32 shrink-0">{f.feature.replace(/_/g, ' ')}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full bg-indigo-400"
                              style={{ width: `${f.importance}%` }} />
                          </div>
                          <span className="text-indigo-600 font-semibold w-12 text-right">{f.importance}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── BATCH TAB ── */}
        {activeTab === 'batch' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-2">📋 Batch Contact Ranking</h2>
              <p className="text-sm text-gray-500 mb-4">
                Select a campaign to rank all its contacts by predicted call success probability.
              </p>
              <select
                value={selectedCampaign}
                onChange={e => { setSelectedCampaign(e.target.value); setBatchResults([]) }}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
              >
                <option value="">Select a campaign...</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button
                onClick={handleLoadContacts}
                disabled={loadingBatch || !selectedCampaign}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {loadingBatch ? '⏳ Ranking contacts...' : '📋 Rank All Contacts by RF Score'}
              </button>
            </div>

            {batchResults.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {batchResults.length} contacts ranked
                  </h3>
                  <div className="flex gap-2 text-xs">
                    {['High', 'Medium', 'Low'].map(tier => (
                      <span key={tier} className={`px-2 py-1 rounded-full font-medium ${TIER_CONFIG[tier].badge}`}>
                        {tier}: {batchResults.filter(r => r.tier === tier).length}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {batchResults.map((r) => {
                    const tc = TIER_CONFIG[r.tier]
                    return (
                      <div key={r.id} className={`rounded-xl p-4 border ${tc.bg} ${tc.border}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${tc.bg} ${tc.color}`}>
                              #{r.rank}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{r.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-400">{r.phone} · {r.group_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${tc.color}`}>{r.score}%</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tc.badge}`}>
                              {r.tier}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-white rounded-full h-2">
                          <div className={`h-2 rounded-full ${tc.bar} transition-all duration-500`}
                            style={{ width: `${r.score}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ANALYZE TAB ── */}
        {activeTab === 'analyze' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-2">📊 Campaign RF Analysis</h2>
              <p className="text-sm text-gray-500 mb-4">
                Analyze a completed campaign — compare RF predictions vs actual call outcomes.
              </p>
              <select
                value={selectedAnalyzeCampaign}
                onChange={e => { setSelectedAnalyzeCampaign(e.target.value); setCampaignData(null) }}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
              >
                <option value="">Select a campaign...</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button
                onClick={handleCampaignAnalysis}
                disabled={analyzing || !selectedAnalyzeCampaign}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {analyzing ? '⏳ Analyzing...' : '📊 Run RF Campaign Analysis'}
              </button>
            </div>

            {campaignData && (
              <div className="space-y-4">

                {/* Key metrics */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total contacts', value: campaignData.total_contacts, color: 'text-gray-700' },
                    { label: 'Actual success rate', value: `${campaignData.actual_success_rate}%`, color: 'text-green-600' },
                    { label: 'RF prediction accuracy', value: `${campaignData.prediction_accuracy}%`, color: 'text-indigo-600' },
                  ].map(m => (
                    <div key={m.label} className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                      <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Tier distribution pie */}
                {piData.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Predicted Tier Distribution</h3>
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie data={piData} dataKey="value" cx="50%" cy="50%"
                            outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                            {piData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {['High', 'Medium', 'Low'].map(tier => {
                          const tc = TIER_CONFIG[tier]
                          const count = tierCounts[tier] || 0
                          const total = campaignData.total_contacts
                          return (
                            <div key={tier}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className={`font-semibold ${tc.color}`}>{tier} chance</span>
                                <span className="text-gray-500">{count} contacts</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className={`h-2 rounded-full ${tc.bar}`}
                                  style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Per contact predictions */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">
                    Per-Contact RF Predictions ({campaignData.predictions.length})
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {campaignData.predictions.map((p, i) => {
                      const tc = TIER_CONFIG[p.tier]
                      return (
                        <div key={i} className={`rounded-xl p-4 ${tc.bg} border ${tc.border}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold w-6 ${tc.color}`}>#{p.rank}</span>
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{p.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-400">{p.phone}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-xl font-bold ${tc.color}`}>{p.score}%</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${tc.badge}`}>{p.tier}</span>
                            </div>
                          </div>
                          <div className="w-full bg-white rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${tc.bar}`}
                              style={{ width: `${p.score}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}