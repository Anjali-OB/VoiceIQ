import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { trainLSTMModel, getLSTMStats, scoreCampaign, getCampaigns } from '../services/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar, Cell } from 'recharts'

const QUALITY_CONFIG = {
  Excellent:     { color: '#4f46e5', bg: 'bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700' },
  Good:          { color: '#10b981', bg: 'bg-green-50',  badge: 'bg-green-100 text-green-700' },
  Average:       { color: '#6b7280', bg: 'bg-gray-50',   badge: 'bg-gray-100 text-gray-700' },
  'Below Average': { color: '#f59e0b', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700' },
  Poor:          { color: '#ef4444', bg: 'bg-red-50',    badge: 'bg-red-100 text-red-700' },
}

export default function LSTMQuality() {
  const [stats, setStats] = useState(null)
  const [training, setTraining] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [campaignScores, setCampaignScores] = useState(null)
  const [scoring, setScoring] = useState(false)
  const [activeTab, setActiveTab] = useState('model')

  useEffect(() => {
    getCampaigns().then(r => setCampaigns(r.data)).catch(() => {})
    getLSTMStats().then(r => setStats(r.data)).catch(() => {})
  }, [])

  const handleTrain = async () => {
    setTraining(true)
    try {
      const res = await trainLSTMModel()
      setStats(res.data)
    } catch (err) {
      alert('Training failed: ' + (err.response?.data?.error || err.message))
    } finally {
      setTraining(false)
    }
  }

  const handleScore = async () => {
    if (!selectedCampaign) return
    setScoring(true)
    try {
      const res = await scoreCampaign({ campaign_id: selectedCampaign })
      setCampaignScores(res.data)
    } catch (err) {
      alert('Scoring failed: ' + err.message)
    } finally {
      setScoring(false)
    }
  }

  const tabs = [
    { id: 'model', label: '🧠 LSTM Model' },
    { id: 'training', label: '📈 Training Curves' },
    { id: 'score', label: '⭐ Score Campaign' },
  ]

  const lossData = stats ? stats.train_loss.map((v, i) => ({
    epoch: i + 1,
    'Train Loss': v,
    'Val Loss': stats.val_loss[i] || v
  })) : []

  const maeData = stats ? stats.train_mae.map((v, i) => ({
    epoch: i + 1,
    'Train MAE': v,
    'Val MAE': stats.val_mae[i] || v
  })) : []

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🧠 LSTM Call Quality Scorer</h1>
          <p className="text-sm text-gray-500 mt-1">
            Module 19 — Deep Learning (LSTM Neural Network) · MAE · RMSE · R² · Training curves
          </p>
        </div>

        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-cyan-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}>{tab.label}</button>
          ))}
        </div>

        {/* Model Tab */}
        {activeTab === 'model' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">🧠 LSTM Architecture</h2>

              {/* Architecture diagram */}
              <div className="bg-gradient-to-r from-cyan-50 to-indigo-50 rounded-xl p-4 mb-5">
                <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
                  {[
                    { label: 'Input', detail: '(1, 10)', color: 'bg-gray-200 text-gray-700' },
                    { label: '→', detail: '', color: 'bg-transparent text-gray-400' },
                    { label: 'LSTM', detail: '64 units', color: 'bg-cyan-200 text-cyan-800' },
                    { label: '→', detail: '', color: 'bg-transparent text-gray-400' },
                    { label: 'Dropout', detail: '0.2', color: 'bg-yellow-100 text-yellow-800' },
                    { label: '→', detail: '', color: 'bg-transparent text-gray-400' },
                    { label: 'LSTM', detail: '32 units', color: 'bg-cyan-200 text-cyan-800' },
                    { label: '→', detail: '', color: 'bg-transparent text-gray-400' },
                    { label: 'Dense', detail: '32 ReLU', color: 'bg-indigo-200 text-indigo-800' },
                    { label: '→', detail: '', color: 'bg-transparent text-gray-400' },
                    { label: 'Dense', detail: '16 ReLU', color: 'bg-indigo-200 text-indigo-800' },
                    { label: '→', detail: '', color: 'bg-transparent text-gray-400' },
                    { label: 'Output', detail: 'Sigmoid', color: 'bg-green-200 text-green-800' },
                  ].map((node, i) => (
                    <div key={i} className={`px-2 py-1 rounded-lg text-center ${node.color}`}>
                      <p className="font-semibold">{node.label}</p>
                      {node.detail && <p className="text-xs opacity-70">{node.detail}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                  { icon: '🧠', label: 'Model type', value: 'LSTM (Deep Learning)' },
                  { icon: '📊', label: 'Task', value: 'Regression (0-100)' },
                  { icon: '⚡', label: 'Optimizer', value: 'Adam (lr=0.001)' },
                  { icon: '📉', label: 'Loss', value: 'Mean Squared Error' },
                ].map(item => (
                  <div key={item.label} className="bg-cyan-50 rounded-xl p-3 text-center">
                    <p className="text-2xl mb-1">{item.icon}</p>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-xs font-semibold text-cyan-700">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mb-5">
                <p className="text-sm font-semibold text-gray-600 mb-3">10 Input Features:</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Response rate (0-1)',
                    'Avg words per response',
                    'Total conversation turns',
                    'Meaningful responses count',
                    'No-response count',
                    'Sentiment score (-1 to 1)',
                    'Conversation depth score',
                    'Positive keyword count',
                    'Negative keyword count',
                    'Total user word count'
                  ].map((f, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-2 text-xs">
                      <span className="text-cyan-600 font-semibold mr-1">{i+1}.</span>
                      <span className="text-gray-700">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleTrain} disabled={training}
                className="w-full bg-cyan-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-cyan-700 disabled:opacity-50">
                {training ? '⏳ Training LSTM... (may take 1-2 minutes)' : '🧠 Train LSTM Model'}
              </button>

              {training && (
                <div className="mt-3 bg-cyan-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-cyan-600">Training on 500 synthetic + real call data... Please wait</p>
                </div>
              )}
            </div>

            {stats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'MAE', value: `${stats.mae}`, color: 'text-cyan-600', bg: 'bg-cyan-50', desc: 'Mean Abs Error' },
                    { label: 'RMSE', value: `${stats.rmse}`, color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Root Mean Sq Error' },
                    { label: 'R² Score', value: stats.r2_score, color: 'text-green-600', bg: 'bg-green-50', desc: 'Coefficient of Det.' },
                    { label: 'Epochs', value: stats.epochs_trained, color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Training epochs' },
                  ].map(m => (
                    <div key={m.label} className={`${m.bg} rounded-2xl p-5 text-center`}>
                      <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-sm font-medium text-gray-600 mt-1">{m.label}</p>
                      <p className="text-xs text-gray-400">{m.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Model Info</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xl font-bold text-gray-700">{stats.total_samples}</p>
                      <p className="text-xs text-gray-400">Total samples</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xl font-bold text-blue-600">{stats.synthetic_samples}</p>
                      <p className="text-xs text-gray-400">Synthetic</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3">
                      <p className="text-xl font-bold text-green-600">{stats.real_samples}</p>
                      <p className="text-xs text-gray-400">Real calls</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Training Curves Tab */}
        {activeTab === 'training' && (
          <div className="space-y-4">
            {!stats ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-4xl mb-3">📈</p>
                <p className="text-gray-400">Train the model first to see training curves</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">📉 Loss Curve (MSE)</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Lower loss = better model. Gap between train/val shows overfitting.
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={lossData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="epoch" tick={{ fontSize: 9 }} label={{ value: 'Epoch', position: 'bottom', fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v, n) => [v.toFixed(4), n]} />
                      <Legend />
                      <Line type="monotone" dataKey="Train Loss" stroke="#0891b2" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Val Loss" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">📊 MAE Curve</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Mean Absolute Error per epoch. Lower = more accurate quality predictions.
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={maeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="epoch" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v, n) => [v.toFixed(2), n]} />
                      <Legend />
                      <Line type="monotone" dataKey="Train MAE" stroke="#4f46e5" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Val MAE" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {stats.sample_predictions?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Sample Predictions vs Actual</h3>
                    <div className="space-y-2">
                      {stats.sample_predictions.map((p, i) => {
                        const qc = QUALITY_CONFIG[p.label] || QUALITY_CONFIG.Average
                        const error = Math.abs(p.actual - p.predicted)
                        return (
                          <div key={i} className={`rounded-xl p-3 ${qc.bg}`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${qc.badge}`}>{p.label}</span>
                              <span className="text-xs text-gray-400">Error: {error.toFixed(1)}</span>
                            </div>
                            <div className="flex gap-4 text-xs">
                              <span className="text-gray-600">Actual: <strong>{p.actual}</strong></span>
                              <span className="text-gray-600">Predicted: <strong style={{ color: p.color }}>{p.predicted}</strong></span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Score Campaign Tab */}
        {activeTab === 'score' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">⭐ Score Campaign Calls</h2>
              <p className="text-sm text-gray-500 mb-4">
                LSTM model scores each call 0-100 based on conversation quality features.
              </p>
              <select value={selectedCampaign} onChange={e => { setSelectedCampaign(e.target.value); setCampaignScores(null) }}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-3">
                <option value="">Select campaign...</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={handleScore} disabled={scoring || !selectedCampaign}
                className="w-full bg-cyan-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-cyan-700 disabled:opacity-50">
                {scoring ? '⏳ Scoring calls...' : '⭐ Score All Calls'}
              </button>
            </div>

            {campaignScores && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Avg score', value: `${campaignScores.avg_score}`, color: 'text-cyan-600' },
                    { label: 'Excellent', value: campaignScores.excellent, color: 'text-indigo-600' },
                    { label: 'Good', value: campaignScores.good, color: 'text-green-600' },
                    { label: 'Poor', value: campaignScores.poor, color: 'text-red-600' },
                  ].map(m => (
                    <div key={m.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                      <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Per-call scores */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">
                    Call Quality Scores ({campaignScores.results.length} calls)
                  </h3>
                  <div className="space-y-3">
                    {campaignScores.results.map((r, i) => {
                      const qc = QUALITY_CONFIG[r.label] || QUALITY_CONFIG.Average
                      return (
                        <div key={i} className={`rounded-xl p-4 ${qc.bg}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{r.contact || 'Unknown'}</p>
                              <p className="text-xs text-gray-400">{r.phone}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold" style={{ color: r.color }}>{r.score}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${qc.badge}`}>{r.label}</span>
                            </div>
                          </div>
                          <div className="w-full bg-white rounded-full h-2 mb-2">
                            <div className="h-2 rounded-full transition-all"
                              style={{ width: `${r.score}%`, backgroundColor: r.color }} />
                          </div>
                          {r.features && (
                            <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                              <span>Response rate: {r.features.response_rate}%</span>
                              <span>Avg words: {r.features.avg_words_per_response}</span>
                              <span>Turns: {r.features.total_turns}</span>
                            </div>
                          )}
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
    </Layout>
  )
}