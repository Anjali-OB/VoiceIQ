import { useState } from 'react'
import Navbar from '../components/Navbar'
import { trainModel, getMLStats, mlPredictSentiment, analyzeWithML, getCampaigns } from '../services/api'
import { useEffect } from 'react'

export default function MLAnalytics() {
  const [stats, setStats] = useState(null)
  const [training, setTraining] = useState(false)
  const [testText, setTestText] = useState('')
  const [prediction, setPrediction] = useState(null)
  const [predicting, setPredicting] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('model')

  useEffect(() => {
    getCampaigns().then(r => setCampaigns(r.data)).catch(() => {})
  }, [])

  const handleTrain = async () => {
    setTraining(true)
    try {
      const res = await trainModel()
      setStats(res.data)
    } catch (err) {
      alert('Training failed: ' + err.message)
    } finally {
      setTraining(false)
    }
  }

  const handlePredict = async () => {
    if (!testText.trim()) return
    setPredicting(true)
    try {
      const res = await mlPredictSentiment({ text: testText })
      setPrediction(res.data)
    } catch (err) {
      alert('Prediction failed')
    } finally {
      setPredicting(false)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedCampaign) return
    setAnalyzing(true)
    try {
      const res = await analyzeWithML({ campaign_id: selectedCampaign })
      setAnalysis(res.data)
    } catch (err) {
      alert('Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const sentimentColor = (s) => {
    if (s === 'positive') return { text: 'text-green-700', bg: 'bg-green-50', bar: 'bg-green-500' }
    if (s === 'negative') return { text: 'text-red-700', bg: 'bg-red-50', bar: 'bg-red-500' }
    return { text: 'text-gray-700', bg: 'bg-gray-50', bar: 'bg-gray-400' }
  }

  const tabs = ['model', 'predict', 'analyze']

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🤖 ML Sentiment Analysis</h1>
          <p className="text-sm text-gray-500 mt-1">
            Custom trained Logistic Regression model using TF-IDF — Module 15
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6">
          {['🧠 Model Training', '🔍 Live Predict', '📊 Campaign Analysis'].map((tab, i) => (
            <button key={i}
              onClick={() => setActiveTab(tabs[i])}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tabs[i]
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >{tab}</button>
          ))}
        </div>

        {/* Model Training Tab */}
        {activeTab === 'model' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-2">Model Information</h2>
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Algorithm</p>
                  <p className="font-semibold text-indigo-700">Logistic Regression</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Feature Extraction</p>
                  <p className="font-semibold text-indigo-700">TF-IDF (n-gram 1-2)</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Classes</p>
                  <p className="font-semibold text-indigo-700">Positive, Neutral, Negative</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Training samples</p>
                  <p className="font-semibold text-indigo-700">60 labeled examples</p>
                </div>
              </div>

              <button
                onClick={handleTrain}
                disabled={training}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {training ? '⏳ Training model...' : '🚀 Train ML Model'}
              </button>
            </div>

            {stats && (
              <div className="space-y-4">
                {/* Accuracy card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-700 mb-4">📊 Model Performance</h2>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center bg-green-50 rounded-xl p-4">
                      <p className="text-4xl font-bold text-green-600">{stats.accuracy}%</p>
                      <p className="text-sm text-gray-500 mt-1">Accuracy</p>
                    </div>
                    <div className="text-center bg-blue-50 rounded-xl p-4">
                      <p className="text-4xl font-bold text-blue-600">{stats.training_samples}</p>
                      <p className="text-sm text-gray-500 mt-1">Training samples</p>
                    </div>
                    <div className="text-center bg-purple-50 rounded-xl p-4">
                      <p className="text-4xl font-bold text-purple-600">{stats.test_samples}</p>
                      <p className="text-sm text-gray-500 mt-1">Test samples</p>
                    </div>
                  </div>

                  {/* Per class metrics */}
                  <h3 className="text-sm font-semibold text-gray-600 mb-3">Per-class metrics</h3>
                  <div className="space-y-3">
                    {['positive', 'neutral', 'negative'].map(cls => {
                      const colors = sentimentColor(cls)
                      const clsData = stats.report[cls] || {}
                      return (
                        <div key={cls} className={`rounded-lg p-3 ${colors.bg}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-semibold capitalize text-sm ${colors.text}`}>{cls}</span>
                            <div className="flex gap-4 text-xs text-gray-500">
                              <span>Precision: <strong>{((clsData.precision || 0) * 100).toFixed(0)}%</strong></span>
                              <span>Recall: <strong>{((clsData.recall || 0) * 100).toFixed(0)}%</strong></span>
                              <span>F1: <strong>{((clsData['f1-score'] || 0) * 100).toFixed(0)}%</strong></span>
                            </div>
                          </div>
                          <div className="w-full bg-white rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${colors.bar}`}
                              style={{ width: `${((clsData['f1-score'] || 0) * 100).toFixed(0)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Confusion Matrix */}
                {stats.confusion_matrix && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-700 mb-4">🔢 Confusion Matrix</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-center">
                        <thead>
                          <tr>
                            <th className="p-2 text-gray-400 text-xs">Actual\Predicted</th>
                            {stats.labels.map(l => (
                              <th key={l} className="p-2 font-semibold capitalize text-gray-600">{l}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {stats.confusion_matrix.map((row, i) => (
                            <tr key={i}>
                              <td className="p-2 font-semibold capitalize text-gray-600">{stats.labels[i]}</td>
                              {row.map((val, j) => (
                                <td key={j} className={`p-3 rounded font-bold ${
                                  i === j ? 'bg-green-100 text-green-700' : val > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                                }`}>{val}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Green diagonal = correct predictions. Red = misclassifications.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Live Predict Tab */}
        {activeTab === 'predict' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">🔍 Live Sentiment Prediction</h2>
              <p className="text-sm text-gray-500 mb-4">
                Enter any text and the ML model will predict its sentiment in real time.
              </p>
              <textarea
                rows={4}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                placeholder="Type any customer response here... e.g. 'I am very happy with the product quality'"
                value={testText}
                onChange={e => setTestText(e.target.value)}
              />
              <button
                onClick={handlePredict}
                disabled={predicting || !testText.trim()}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {predicting ? '⏳ Predicting...' : '🔍 Predict Sentiment'}
              </button>
            </div>

            {prediction && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-700 mb-4">Prediction Result</h2>

                <div className={`rounded-xl p-5 mb-4 ${sentimentColor(prediction.sentiment).bg} text-center`}>
                  <p className="text-5xl mb-2">
                    {prediction.sentiment === 'positive' ? '😊' :
                     prediction.sentiment === 'negative' ? '😠' : '😐'}
                  </p>
                  <p className={`text-2xl font-bold capitalize ${sentimentColor(prediction.sentiment).text}`}>
                    {prediction.sentiment}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Confidence: <strong>{prediction.confidence}%</strong>
                  </p>
                </div>

                <h3 className="text-sm font-semibold text-gray-600 mb-3">Probability breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(prediction.probabilities).map(([cls, prob]) => {
                    const colors = sentimentColor(cls)
                    return (
                      <div key={cls}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`capitalize font-medium ${colors.text}`}>{cls}</span>
                          <span className="text-gray-500">{prob}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${colors.bar}`}
                            style={{ width: `${prob}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Campaign Analysis Tab */}
        {activeTab === 'analyze' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">📊 ML Campaign Analysis</h2>
              <p className="text-sm text-gray-500 mb-4">
                Run ML sentiment analysis on all transcripts of a campaign and compare with Groq's analysis.
              </p>
              <select
                value={selectedCampaign}
                onChange={e => setSelectedCampaign(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
              >
                <option value="">Select a campaign...</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !selectedCampaign}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {analyzing ? '⏳ Analyzing...' : '📊 Run ML Analysis'}
              </button>
            </div>

            {analysis && (
              <div className="space-y-4">
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Positive', value: analysis.sentiment_counts.positive, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Neutral', value: analysis.sentiment_counts.neutral, color: 'text-gray-600', bg: 'bg-gray-50' },
                    { label: 'Negative', value: analysis.sentiment_counts.negative, color: 'text-red-600', bg: 'bg-red-50' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                      <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Agreement with Groq */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">ML vs Groq Agreement</h3>
                    <span className="text-2xl font-bold text-indigo-600">{analysis.agreement_with_groq}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-indigo-500"
                      style={{ width: `${analysis.agreement_with_groq}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    How often our ML model agrees with Groq AI's sentiment labels
                  </p>
                </div>

                {/* Per contact results */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Per Contact Analysis</h3>
                  <div className="space-y-3">
                    {analysis.results.map((r, i) => {
                      const colors = sentimentColor(r.ml_sentiment)
                      const agree = r.ml_sentiment === r.groq_sentiment
                      return (
                        <div key={i} className={`rounded-xl p-4 ${colors.bg}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{r.contact}</p>
                              <p className="text-xs text-gray-400">{r.phone}</p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} border`}>
                                ML: {r.ml_sentiment}
                              </span>
                              <p className="text-xs text-gray-400 mt-1">
                                Groq: {r.groq_sentiment} {agree ? '✅' : '⚠️'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {Object.entries(r.probabilities).map(([cls, prob]) => (
                              <div key={cls} className="flex-1 text-center">
                                <p className="text-xs text-gray-500 capitalize">{cls}</p>
                                <p className={`text-xs font-bold ${sentimentColor(cls).text}`}>{prob}%</p>
                              </div>
                            ))}
                            <div className="flex-1 text-center">
                              <p className="text-xs text-gray-500">Confidence</p>
                              <p className="text-xs font-bold text-indigo-600">{r.confidence}%</p>
                            </div>
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