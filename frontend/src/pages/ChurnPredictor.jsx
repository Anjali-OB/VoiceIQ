import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { trainChurnModel, getChurnStats, churnCampaignAnalysis, getCampaigns } from '../services/api'
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, BarChart, Bar, PieChart, Pie, Legend } from 'recharts'

const RISK_CONFIG = {
  Low:      { color: '#10b981', bg: 'bg-green-50',  border: 'border-green-300',  badge: 'bg-green-100 text-green-700' },
  Medium:   { color: '#6b7280', bg: 'bg-gray-50',   border: 'border-gray-300',   badge: 'bg-gray-100 text-gray-700' },
  High:     { color: '#f59e0b', bg: 'bg-yellow-50', border: 'border-yellow-300', badge: 'bg-yellow-100 text-yellow-700' },
  Critical: { color: '#ef4444', bg: 'bg-red-50',    border: 'border-red-300',    badge: 'bg-red-100 text-red-700' },
}

export default function ChurnPredictor() {
  const [stats, setStats] = useState(null)
  const [training, setTraining] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [campaignResults, setCampaignResults] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('model')

  useEffect(() => {
    getCampaigns().then(r => setCampaigns(r.data)).catch(() => {})
    getChurnStats().then(r => setStats(r.data)).catch(() => {})
  }, [])

  const handleTrain = async () => {
    setTraining(true)
    try {
      const res = await trainChurnModel()
      setStats(res.data)
    } catch (err) {
      alert('Training failed: ' + err.message)
    } finally {
      setTraining(false)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedCampaign) return
    setAnalyzing(true)
    try {
      const res = await churnCampaignAnalysis({ campaign_id: selectedCampaign })
      setCampaignResults(res.data)
    } catch (err) {
      alert('Analysis failed: ' + err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const tabs = [
    { id: 'model', label: '🧩 Model' },
    { id: 'clusters', label: '🔵 Clusters' },
    { id: 'analysis', label: '📊 Campaign' },
  ]

  const clusterDist = stats ? Object.entries(stats.cluster_distribution || {}).map(([label, data]) => ({
    name: label, count: data.count, fill: data.color,
    churn_rate: data.churn_rate, risk: data.risk
  })) : []

  const pcaPoints = stats?.pca_points || []

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🔵 Contact Churn Predictor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Module 18 — K-Means Clustering + SVM Classification · Silhouette score · Full evaluation metrics
          </p>
        </div>

        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}>{tab.label}</button>
          ))}
        </div>

        {/* Model Tab */}
        {activeTab === 'model' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">Model Configuration</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                  { icon: '🔵', label: 'Clustering', value: 'K-Means (k=4)' },
                  { icon: '🎯', label: 'Classification', value: 'SVM RBF Kernel' },
                  { icon: '📉', label: 'Reduction', value: 'PCA (2D)' },
                  { icon: '📊', label: 'Evaluation', value: 'Silhouette + F1' },
                ].map(item => (
                  <div key={item.label} className="bg-purple-50 rounded-xl p-3 text-center">
                    <p className="text-2xl mb-1">{item.icon}</p>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-xs font-semibold text-purple-700">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mb-5">
                <p className="text-sm font-semibold text-gray-600 mb-3">10 Behavioral Features:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['response_rate', 'avg_sentiment', 'call_count', 'no_response_count',
                    'avg_duration', 'group_priority', 'positive_calls', 'negative_calls',
                    'engagement_score', 'risk_score'].map((f, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-2 text-xs">
                      <span className="text-purple-600 font-semibold mr-1">{i+1}.</span>
                      <span className="text-gray-700">{f.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleTrain} disabled={training}
                className="w-full bg-purple-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
                {training ? '⏳ Training K-Means + SVM...' : '🚀 Train Churn Model'}
              </button>
            </div>

            {stats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Silhouette Score', value: `${stats.silhouette_score}%`, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'SVM Accuracy', value: `${stats.svm_accuracy}%`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'CV Score', value: `${stats.cv_mean}%`, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Real samples', value: stats.real_samples, color: 'text-green-600', bg: 'bg-green-50' },
                  ].map(m => (
                    <div key={m.label} className={`${m.bg} rounded-2xl p-5 text-center`}>
                      <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Feature importance */}
                {stats.feature_importance && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Feature Importance (Permutation)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={stats.feature_importance.slice(0, 8)} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 9 }} unit="%" />
                        <YAxis type="category" dataKey="feature" tick={{ fontSize: 9 }} width={110} />
                        <Tooltip formatter={v => [`${v}%`, 'Importance']} />
                        <Bar dataKey="importance" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Confusion matrix */}
                {stats.confusion_matrix && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">SVM Confusion Matrix</h3>
                    <table className="w-full text-sm text-center">
                      <thead>
                        <tr>
                          <th className="p-2 text-gray-400 text-xs">Actual \ Predicted</th>
                          <th className="p-2 font-semibold text-green-600">Not Churn</th>
                          <th className="p-2 font-semibold text-red-600">Churn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.confusion_matrix.map((row, i) => (
                          <tr key={i}>
                            <td className="p-2 font-semibold text-gray-600">
                              {i === 0 ? '✅ Not Churn' : '❌ Churn'}
                            </td>
                            {row.map((val, j) => (
                              <td key={j} className={`p-4 rounded font-bold text-lg ${
                                i === j ? 'bg-green-100 text-green-700' : val > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                              }`}>{val}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Clusters Tab */}
        {activeTab === 'clusters' && (
          <div className="space-y-4">
            {!stats ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-4xl mb-3">🔵</p>
                <p className="text-gray-400">Train the model first to see clusters</p>
              </div>
            ) : (
              <>
                {/* Cluster cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(stats.cluster_distribution || {}).map(([label, data]) => {
                    const rc = RISK_CONFIG[data.risk] || RISK_CONFIG.Medium
                    return (
                      <div key={label} className={`rounded-2xl border p-4 ${rc.bg} ${rc.border}`}>
                        <p className="font-bold text-gray-800">{label}</p>
                        <p className={`text-3xl font-bold mt-1`} style={{ color: data.color }}>{data.count}</p>
                        <p className="text-xs text-gray-500 mt-1">contacts</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-2 inline-block ${rc.badge}`}>
                          {data.risk} risk
                        </span>
                        <p className="text-xs text-gray-400 mt-1">Churn rate: {data.churn_rate}%</p>
                        <p className="text-xs text-gray-500 mt-1">{data.desc}</p>
                      </div>
                    )
                  })}
                </div>

                {/* PCA Scatter Plot */}
                {pcaPoints.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">🗺️ PCA 2D Cluster Visualization</h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Each point is a contact. Colors = behavioral cluster. Explained variance: PC1={stats.pca_variance?.[0]}%, PC2={stats.pca_variance?.[1]}%
                    </p>
                    <ResponsiveContainer width="100%" height={320}>
                      <ScatterChart>
                        <XAxis dataKey="x" name="PC1" tick={{ fontSize: 9 }} label={{ value: 'Principal Component 1', position: 'bottom', fontSize: 10 }} />
                        <YAxis dataKey="y" name="PC2" tick={{ fontSize: 9 }} label={{ value: 'PC2', angle: -90, position: 'left', fontSize: 10 }} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }}
                          content={({ payload }) => {
                            if (!payload?.[0]) return null
                            const d = payload[0].payload
                            return (
                              <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow">
                                <p className="font-semibold" style={{ color: d.color }}>{d.label}</p>
                                <p>PC1: {d.x}, PC2: {d.y}</p>
                              </div>
                            )
                          }}
                        />
                        <Scatter data={pcaPoints} shape={(props) => {
                          const { cx, cy, payload } = props
                          return <circle cx={cx} cy={cy} r={3} fill={payload.color} fillOpacity={0.7} stroke="white" strokeWidth={0.5} />
                        }} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Cluster distribution chart */}
                {clusterDist.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Cluster Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={clusterDist}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {clusterDist.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Campaign Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">Campaign Churn Analysis</h2>
              <select value={selectedCampaign} onChange={e => { setSelectedCampaign(e.target.value); setCampaignResults(null) }}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3">
                <option value="">Select campaign...</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={handleAnalyze} disabled={analyzing || !selectedCampaign}
                className="w-full bg-purple-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
                {analyzing ? '⏳ Analyzing churn...' : '🔵 Analyze Contact Churn'}
              </button>
            </div>

            {campaignResults && (
              <div className="space-y-3">
                {campaignResults.results.map((r, i) => {
                  const rc = RISK_CONFIG[r.risk_level] || RISK_CONFIG.Medium
                  return (
                    <div key={i} className={`bg-white rounded-2xl border p-5 ${rc.border}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-800">{r.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">{r.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold" style={{ color: r.cluster_color }}>
                            {r.churn_probability}%
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rc.badge}`}>
                            {r.cluster_label}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                        <div className="h-2 rounded-full transition-all"
                          style={{ width: `${r.churn_probability}%`, backgroundColor: r.cluster_color }} />
                      </div>
                      <p className="text-xs text-gray-500">{r.recommendation}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}