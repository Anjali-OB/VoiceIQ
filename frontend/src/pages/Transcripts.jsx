import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { getAllTranscripts } from '../services/api'
import jsPDF from 'jspdf'

export default function Transcripts() {
  const [transcripts, setTranscripts] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterSentiment, setFilterSentiment] = useState('all')
  const [loading, setLoading] = useState(true)

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
    const matchSearch = name.includes(search.toLowerCase()) ||
      phone.includes(search.toLowerCase()) ||
      campaign.includes(search.toLowerCase())
    const matchSentiment = filterSentiment === 'all' || t.sentiment === filterSentiment
    return matchSearch && matchSentiment
  })

  const exportPDF = (t) => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('VoiceIQ — Call Transcript', 20, 20)
    doc.setFontSize(11)
    doc.text(`Contact: ${t.contacts?.name || 'Unknown'} (${t.contacts?.phone || ''})`, 20, 35)
    doc.text(`Campaign: ${t.campaigns?.name || 'Unknown'}`, 20, 45)
    doc.text(`Sentiment: ${t.sentiment}`, 20, 55)
    doc.text(`Date: ${new Date(t.created_at).toLocaleString()}`, 20, 65)
    doc.text(`Summary: ${t.summary || 'N/A'}`, 20, 75, { maxWidth: 170 })

    doc.setFontSize(12)
    doc.text('Conversation:', 20, 95)
    doc.setFontSize(10)

    let y = 105
    const conversation = Array.isArray(t.conversation) ? t.conversation : []
    conversation.forEach((turn) => {
      const label = turn.role === 'assistant' ? 'AI: ' : 'Contact: '
      const lines = doc.splitTextToSize(label + turn.content, 170)
      if (y + lines.length * 7 > 280) {
        doc.addPage()
        y = 20
      }
      doc.text(lines, 20, y)
      y += lines.length * 7 + 3
    })

    doc.save(`transcript_${t.contacts?.phone || t.id}.pdf`)
  }

  const exportCSV = () => {
    const rows = [['Contact', 'Phone', 'Campaign', 'Sentiment', 'Summary', 'Date']]
    filtered.forEach(t => {
      rows.push([
        t.contacts?.name || '',
        t.contacts?.phone || '',
        t.campaigns?.name || '',
        t.sentiment || '',
        t.summary || '',
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
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={filterSentiment}
            onChange={e => setFilterSentiment(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{t.summary}</p>
                )}
              </div>
            ))}
          </div>

          {/* Transcript detail */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6 self-start">
            {!selected ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">Click a transcript to view details</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-medium text-gray-800">
                      {selected.contacts?.name || 'Unknown'}
                    </h2>
                    <p className="text-xs text-gray-500">{selected.contacts?.phone}</p>
                    <p className="text-xs text-gray-400">{selected.campaigns?.name}</p>
                  </div>
                  <button
                    onClick={() => exportPDF(selected)}
                    className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                  >
                    Export PDF
                  </button>
                </div>

                <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-3 ${sentimentBadge(selected.sentiment)}`}>
                  {selected.sentiment}
                </div>

                {selected.summary && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">AI Summary</p>
                    <p className="text-sm text-gray-700">{selected.summary}</p>
                  </div>
                )}

                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Full conversation
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
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
                        {turn.content}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}