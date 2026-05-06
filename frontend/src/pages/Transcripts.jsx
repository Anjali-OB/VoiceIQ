import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { getAllTranscripts, generateFeedbackMessage } from '../services/api'
import jsPDF from 'jspdf'

export default function Transcripts() {
  // ALL state declarations at the top
  const [transcripts, setTranscripts] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterSentiment, setFilterSentiment] = useState('all')
  const [loading, setLoading] = useState(true)
  const [feedbackMsg, setFeedbackMsg] = useState({})
  const [generatingMsg, setGeneratingMsg] = useState(null)

  useEffect(() => {
    getAllTranscripts()
      .then(r => setTranscripts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = transcripts.filter(t => {
    const name = t.contacts?.name?.toLowerCase() || ''
    const phone = t.contacts?.phone?.toLowerCase() || ''
    const campaign = t.campaigns?.name?.toLowerCase() || ''
    const matchSearch =
      name.includes(search.toLowerCase()) ||
      phone.includes(search.toLowerCase()) ||
      campaign.includes(search.toLowerCase())
    const matchSentiment = filterSentiment === 'all' || t.sentiment === filterSentiment
    return matchSearch && matchSentiment
  })

  const handleGenerateFeedback = async (t) => {
    setGeneratingMsg(t.id)
    try {
      const res = await generateFeedbackMessage({
        contact_name: t.contacts?.name || 'Customer',
        sentiment: t.sentiment,
        summary: t.summary,
        language: 'en-US'
      })
      setFeedbackMsg(prev => ({ ...prev, [t.id]: res.data.message }))
    } catch (err) {
      alert('Failed to generate message. Try again.')
    } finally {
      setGeneratingMsg(null)
    }
  }

  const exportPDF = (t) => {
    const doc = new jsPDF()

    // Header
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.text('VoiceIQ — Call Transcript', 15, 18)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 32)

    doc.setTextColor(0, 0, 0)
    let y = 55

    // Contact info
    doc.setFillColor(248, 250, 252)
    doc.rect(10, y - 5, 190, 35, 'F')
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.text('Contact Information', 15, y + 5)
    doc.setFont(undefined, 'normal')
    doc.setFontSize(10)
    doc.text(`Name: ${t.contacts?.name || 'Unknown'}`, 15, y + 14)
    doc.text(`Phone: ${t.contacts?.phone || 'N/A'}`, 100, y + 14)
    doc.text(`Campaign: ${t.campaigns?.name || 'N/A'}`, 15, y + 22)
    doc.text(`Sentiment: ${t.sentiment || 'neutral'}`, 100, y + 22)
    y += 45

    // Summary
    if (t.summary) {
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.text('AI Summary', 15, y)
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      y += 8
      const cleanSummary = t.summary.replace(/[^\x00-\x7F]/g, '').trim()
      const summaryLines = doc.splitTextToSize(cleanSummary || 'No summary available', 180)
      doc.setFillColor(240, 245, 255)
      doc.rect(10, y - 4, 190, summaryLines.length * 6 + 8, 'F')
      doc.text(summaryLines, 15, y + 2)
      y += summaryLines.length * 6 + 14
    }

    // Conversation
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.text('Conversation Transcript', 15, y)
    y += 10

    const conversation = Array.isArray(t.conversation) ? t.conversation : []
    conversation.forEach((turn) => {
      if (y > 265) { doc.addPage(); y = 20 }
      const isAI = turn.role === 'assistant'
      const label = isAI ? 'AI Agent' : 'Contact'
      const cleanContent = (turn.content || '').replace(/[^\x00-\x7F]/g, '').trim()
      if (!cleanContent) return

      doc.setFillColor(isAI ? 238 : 248, isAI ? 242 : 248, isAI ? 255 : 248)
      const lines = doc.splitTextToSize(`${label}: ${cleanContent}`, 170)
      const boxH = lines.length * 6 + 8
      doc.rect(10, y - 4, 190, boxH, 'F')
      doc.setFontSize(8)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(isAI ? 79 : 107, isAI ? 70 : 114, isAI ? 229 : 128)
      doc.text(label, 15, y + 1)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(30, 30, 30)
      doc.setFontSize(9)
      const contentLines = doc.splitTextToSize(cleanContent, 165)
      doc.text(contentLines, 15, y + 7)
      y += boxH + 4
    })

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`VoiceIQ · Page ${i} of ${pageCount}`, 15, 290)
      doc.text('AI Bulk Call Simulator', 150, 290)
    }

    doc.save(`VoiceIQ_${t.contacts?.name || 'transcript'}_${t.contacts?.phone || ''}.pdf`)
  }

  const exportCSV = () => {
    const rows = [['Contact', 'Phone', 'Campaign', 'Sentiment', 'Summary', 'Date']]
    filtered.forEach(t => {
      rows.push([
        t.contacts?.name || '',
        t.contacts?.phone || '',
        t.campaigns?.name || '',
        t.sentiment || '',
        (t.summary || '').replace(/[^\x00-\x7F]/g, ''),
        new Date(t.created_at).toLocaleString()
      ])
    })
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'voiceiq_transcripts.csv'
    a.click()
  }

  const sentimentBadge = (s) => {
    if (s === 'positive') return 'bg-green-100 text-green-700'
    if (s === 'negative') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Transcripts</h1>
            <p className="text-sm text-gray-500 mt-1">{transcripts.length} total calls recorded</p>
          </div>
          <button
            onClick={exportCSV}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
          >
            Export all as CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name, phone, campaign..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={filterSentiment}
            onChange={e => setFilterSentiment(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Transcript list */}
          <div className="space-y-3">
            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">Loading transcripts...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">No transcripts found</p>
              </div>
            ) : filtered.map(t => (
              <div
                key={t.id}
                onClick={() => setSelected(t)}
                className={`bg-white rounded-xl border cursor-pointer p-4 hover:border-indigo-300 transition-colors ${selected?.id === t.id ? 'border-indigo-500' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {t.contacts?.name || 'Unknown contact'}
                    </p>
                    <p className="text-xs text-gray-500">{t.contacts?.phone}</p>
                    <p className="text-xs text-gray-400 mt-1">{t.campaigns?.name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${sentimentBadge(t.sentiment)}`}>
                      {t.sentiment}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {t.summary && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {t.summary.replace(/[^\x00-\x7F]/g, '')}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Transcript detail */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6 self-start">
            {!selected ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-gray-400 text-sm">Click a transcript to view details</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-gray-800">
                      {selected.contacts?.name || 'Unknown'}
                    </h2>
                    <p className="text-xs text-gray-500">{selected.contacts?.phone}</p>
                    <p className="text-xs text-gray-400">{selected.campaigns?.name}</p>
                  </div>
                  <button
                    onClick={() => exportPDF(selected)}
                    className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                  >
                    📄 Export PDF
                  </button>
                </div>

                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-3 ${sentimentBadge(selected.sentiment)}`}>
                  {selected.sentiment}
                </span>

                {selected.summary && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">AI Summary</p>
                    <p className="text-sm text-gray-700">
                      {selected.summary.replace(/[^\x00-\x7F]/g, '')}
                    </p>
                  </div>
                )}

                {/* Conversation */}
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Full conversation
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                  {(Array.isArray(selected.conversation) ? selected.conversation : []).map((turn, i) => (
                    <div key={i} className={`flex ${turn.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${
                        turn.role === 'assistant'
                          ? 'bg-indigo-100 text-indigo-900 rounded-tl-none'
                          : 'bg-gray-100 text-gray-800 rounded-tr-none'
                      }`}>
                        <p className="text-xs font-medium mb-1 opacity-60">
                          {turn.role === 'assistant' ? '🤖 AI' : '👤 Contact'}
                        </p>
                        {(turn.content || '').replace(/[^\x00-\x7F]/g, '') || turn.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feedback message generator */}
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    💬 Post-call Follow-up Message
                  </h3>
                  {feedbackMsg[selected.id] ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                      <p className="text-sm text-gray-700">{feedbackMsg[selected.id]}</p>
                      <div className="flex gap-3 mt-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(feedbackMsg[selected.id])}
                          className="text-xs text-green-600 hover:underline"
                        >
                          📋 Copy
                        </button>
                        <button
                          onClick={() => handleGenerateFeedback(selected)}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          🔄 Regenerate
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerateFeedback(selected)}
                      disabled={generatingMsg === selected.id}
                      className="w-full border border-indigo-300 text-indigo-600 py-2 rounded-xl text-sm hover:bg-indigo-50 disabled:opacity-50"
                    >
                      {generatingMsg === selected.id
                        ? '✨ Generating message...'
                        : '✨ Generate follow-up message'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}