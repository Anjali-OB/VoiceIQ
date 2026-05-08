import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { getCampaigns } from '../services/api'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, PieChart, Pie, Legend
} from 'recharts'

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL })
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const COLORS = ['#4f46e5', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626']

export default function NLPAnalytics() {
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('keywords')
  const [error, setError] = useState('')

  useEffect(() => {
    getCampaigns().then(r => setCampaigns(r.data)).catch(() => {})
  }, [])

  const handleAnalyze = async () => {
    if (!selectedCampaign) { alert('Please select a campaign'); return }
    setAnalyzing(true)
    setError('')
    setResult(null)
    try {
      const res = await API.post('/api/ml/nlp/analyze', { campaign_id: selectedCampaign })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Make sure there are completed calls in this campaign.')
    } finally {
      setAnalyzing(false)
    }
  }

  const tabs = [
    { id: 'keywords', label: '🔑 Keywords' },
    { id: 'topics', label: '📚 Topics' },
    { id: 'wordcloud', label: '☁️ Word Cloud' },
    { id: 'entities', label: '🏷️ Entities' },
    { id: 'sentiment', label: '📊 Topic Sentiment' },
  ]

  const topicSentimentData = result?.topic_sentiment?.map(t => ({
    topic: t.topic.split(' ')[0],
    Positive: t.positive,
    Neutral: t.neutral,
    Negative: t.negative,
  })) || []

  const topicRadarData = result?.topics?.slice(0, 5).map(t => ({
    topic: t.topic.split(' & ')[0],
    score: t.percentage
  })) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📝 NLP Keyword & Topic Extractor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Module 17 — TF-IDF keyword extraction, topic modelling, named entity recognition — no external API needed
          </p>
        </div>

        {/* Campaign selector */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Select Campaign to Analyze</h2>
          <div className="flex gap-3">
            <select
              value={selectedCampaign}
              onChange={e => { setSelectedCampaign(e.target.value); setResult(null) }}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choose a campaign with completed calls...</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
              ))}
            </select>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !selectedCampaign}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
            >
              {analyzing ? '⏳ Analyzing...' : '🔍 Run NLP Analysis'}
            </button>
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              ⚠️ {error}
            </div>
          )}

          {/* How it works */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '📊', label: 'TF-IDF', desc: 'Extracts most important keywords' },
              { icon: '📚', label: 'Topic Modelling', desc: 'Groups keywords into 5 topics' },
              { icon: '🏷️', label: 'NER', desc: 'Finds entities, complaints, praise' },
              { icon: '☁️', label: 'Word Cloud', desc: 'Visual frequency map of words' },
            ].map(item => (
              <div key={item.label} className="bg-indigo-50 rounded-xl p-3 text-center">
                <p className="text-2xl mb-1">{item.icon}</p>
                <p className="text-xs font-semibold text-indigo-700">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Transcripts analyzed', value: result.total_transcripts, icon: '📋', color: 'text-indigo-600' },
                { label: 'Total words processed', value: result.total_words, icon: '📝', color: 'text-blue-600' },
                { label: 'Keywords found', value: result.keywords.length, icon: '🔑', color: 'text-green-600' },
                { label: 'Dominant topic', value: result.dominant_topic?.split(' ')[0] || 'None', icon: '📚', color: 'text-purple-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <p className={`text-2xl font-bold ${s.color} truncate`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
              {tabs.map(tab => (
                <button key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >{tab.label}</button>
              ))}
            </div>

            {/* Keywords Tab */}
            {activeTab === 'keywords' && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">

                  {/* TF-IDF Keywords chart */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">🔑 Top TF-IDF Keywords</h3>
                    <p className="text-xs text-gray-400 mb-4">
                      TF-IDF measures how important a word is across all call transcripts
                    </p>
                    {result.keywords.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">No keywords found</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                          data={result.keywords.slice(0, 12)}
                          layout="vertical"
                          margin={{ left: 10, right: 20 }}
                        >
                          <XAxis type="number" tick={{ fontSize: 9 }} />
                          <YAxis type="category" dataKey="word" tick={{ fontSize: 10 }} width={70} />
                          <Tooltip formatter={(v) => [`${v.toFixed(2)}`, 'TF-IDF Score']} />
                          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                            {result.keywords.slice(0, 12).map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Top bigrams */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">🔗 Top Bigrams (2-word phrases)</h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Most frequently occurring two-word combinations in customer speech
                    </p>
                    {result.bigrams.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">Not enough data for bigrams</p>
                    ) : (
                      <div className="space-y-3">
                        {result.bigrams.map((b, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                            <span className="text-sm font-medium text-gray-700 flex-1">{b.phrase}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-100 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-indigo-500"
                                  style={{ width: `${(b.count / result.bigrams[0]?.count) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-indigo-600 font-semibold w-8 text-right">
                                {b.count}x
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Word frequency tags */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 Word Frequency Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.word_frequency.slice(0, 25).map((w, i) => {
                      const size = Math.max(11, Math.min(18, 11 + (w.count / result.word_frequency[0]?.count) * 7))
                      return (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-full border font-medium cursor-default hover:shadow-sm transition-shadow"
                          style={{
                            fontSize: `${size}px`,
                            backgroundColor: `${COLORS[i % COLORS.length]}15`,
                            borderColor: `${COLORS[i % COLORS.length]}40`,
                            color: COLORS[i % COLORS.length]
                          }}
                          title={`Mentioned ${w.count} times`}
                        >
                          {w.word} <span className="opacity-60 text-xs">({w.count})</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Topics Tab */}
            {activeTab === 'topics' && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">

                  {/* Radar chart */}
                  {topicRadarData.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">🕸️ Topic Radar</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <RadarChart data={topicRadarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10 }} />
                          <PolarRadiusAxis tick={{ fontSize: 8 }} />
                          <Radar
                            name="Score"
                            dataKey="score"
                            stroke="#4f46e5"
                            fill="#4f46e5"
                            fillOpacity={0.3}
                          />
                          <Tooltip formatter={(v) => [`${v}%`, 'Topic score']} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Topic list */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">📚 Detected Topics</h3>
                    {result.topics.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">No topics detected</p>
                    ) : (
                      <div className="space-y-4">
                        {result.topics.map((topic, i) => (
                          <div key={i} className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{topic.topic}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  topic.relevance === 'High' ? 'bg-green-100 text-green-700' :
                                  topic.relevance === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>{topic.relevance} relevance</span>
                              </div>
                              <p className="text-2xl font-bold text-indigo-600">{topic.percentage}%</p>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                              <div
                                className="h-2 rounded-full bg-indigo-500 transition-all"
                                style={{ width: `${topic.percentage}%` }}
                              />
                            </div>
                            {topic.keywords_found.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {topic.keywords_found.map((kw, j) => (
                                  <span key={j} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                    {kw.word} ({kw.count})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Word Cloud Tab */}
            {activeTab === 'wordcloud' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">☁️ Word Cloud</h3>
                <p className="text-xs text-gray-400 mb-6">
                  Larger words appear more frequently in customer speech. Based on {result.total_words} total words.
                </p>
                {result.word_cloud.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-12">No words found</p>
                ) : (
                  <div className="flex flex-wrap gap-3 justify-center items-center min-h-64 p-4 bg-gray-50 rounded-xl">
                    {result.word_cloud.map((w, i) => (
                      <span
                        key={i}
                        className="font-bold cursor-default hover:opacity-80 transition-opacity"
                        style={{
                          fontSize: `${w.size}px`,
                          color: w.color,
                          lineHeight: '1.2'
                        }}
                        title={`"${w.word}" — mentioned ${w.count} times`}
                      >
                        {w.word}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Entities Tab */}
            {activeTab === 'entities' && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">

                  {/* Complaint phrases */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">😠 Complaint Keywords Found</h3>
                    {result.entities?.complaint_phrases?.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-3xl mb-2">✅</p>
                        <p className="text-sm text-green-600 font-medium">No complaint keywords found!</p>
                        <p className="text-xs text-gray-400 mt-1">Customers seem satisfied</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {result.entities.complaint_phrases.map((phrase, i) => (
                          <span key={i} className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-full text-sm font-medium">
                            ⚠️ {phrase}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Positive phrases */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">😊 Positive Keywords Found</h3>
                    {result.entities?.positive_phrases?.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-3xl mb-2">📊</p>
                        <p className="text-sm text-gray-500">No strong positive keywords detected</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {result.entities.positive_phrases.map((phrase, i) => (
                          <span key={i} className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-full text-sm font-medium">
                            ✅ {phrase}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Time expressions */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">⏰ Time Expressions</h3>
                    {result.entities?.time_expressions?.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">None found</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {result.entities.time_expressions.map((expr, i) => (
                          <span key={i} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-sm">
                            🕐 {expr}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Numbers */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">🔢 Numbers & Quantities</h3>
                    {(result.entities?.numbers?.length === 0 && result.entities?.quantities?.length === 0) ? (
                      <p className="text-sm text-gray-400 text-center py-4">None found</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {[...result.entities.numbers, ...result.entities.quantities].map((n, i) => (
                          <span key={i} className="px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-full text-sm font-mono">
                            {n}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Topic Sentiment Tab */}
            {activeTab === 'sentiment' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">📊 Sentiment by Topic</h3>
                  <p className="text-xs text-gray-400 mb-5">
                    For each topic, shows how many calls mentioned it with positive, neutral, or negative sentiment
                  </p>
                  {topicSentimentData.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No topic sentiment data found</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={topicSentimentData} margin={{ bottom: 20 }}>
                        <XAxis dataKey="topic" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Positive" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Neutral" stackId="a" fill="#6b7280" />
                        <Bar dataKey="Negative" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Per-topic details */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Topic-wise Sentiment Breakdown</h3>
                  <div className="space-y-4">
                    {result.topic_sentiment.map((t, i) => (
                      <div key={i} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-semibold text-gray-800 text-sm">{t.topic}</p>
                          <span className="text-xs text-gray-400">{t.total} mentions</span>
                        </div>
                        <div className="flex rounded-full overflow-hidden h-3 mb-2">
                          {t.positive > 0 && (
                            <div className="bg-green-500 transition-all"
                              style={{ width: `${t.positive_pct}%` }}
                              title={`Positive: ${t.positive}`}
                            />
                          )}
                          {t.neutral > 0 && (
                            <div className="bg-gray-400 transition-all"
                              style={{ width: `${100 - t.positive_pct - t.negative_pct}%` }}
                              title={`Neutral: ${t.neutral}`}
                            />
                          )}
                          {t.negative > 0 && (
                            <div className="bg-red-500 transition-all"
                              style={{ width: `${t.negative_pct}%` }}
                              title={`Negative: ${t.negative}`}
                            />
                          )}
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span className="text-green-600">😊 {t.positive} positive ({t.positive_pct}%)</span>
                          <span className="text-gray-500">😐 {t.neutral} neutral</span>
                          <span className="text-red-600">😠 {t.negative} negative ({t.negative_pct}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !analyzing && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-6xl mb-4">📝</p>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Ready to analyze</h3>
            <p className="text-sm text-gray-400 mb-2">
              Select a campaign above and click Run NLP Analysis
            </p>
            <p className="text-xs text-gray-300">
              The campaign must have at least 1 completed call with transcripts
            </p>
          </div>
        )}
      </div>
    </div>
  )
}