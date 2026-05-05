import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getContacts, updateContactStatus, aiRespond, aiSummarize, saveTranscript, updateCampaign } from '../services/api'
import { getCampaigns } from '../services/api'

export default function Simulator() {
  const { campaignId } = useParams()
  const navigate = useNavigate()

  const [campaign, setCampaign] = useState(null)
  const [contacts, setContacts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [status, setStatus] = useState('idle') // idle | calling | listening | thinking | ended
  const [conversation, setConversation] = useState([])
  const [currentText, setCurrentText] = useState('')
  const [log, setLog] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const recognitionRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)
  const pausedRef = useRef(false)
  const conversationRef = useRef([])

  useEffect(() => {
    loadData()
    return () => {
      stopSpeech()
      stopListening()
    }
  }, [])

  const loadData = async () => {
    try {
      const [campRes, contactsRes] = await Promise.all([
        getCampaigns(),
        getContacts(campaignId)
      ])
      const camp = campRes.data.find(c => c.id === campaignId)
      setCampaign(camp)
      const pending = contactsRes.data.filter(c => c.status === 'pending')
      setContacts(pending)
    } catch (err) {
      console.error('Failed to load data', err)
    }
  }

  const addLog = (contact, message, type = 'info') => {
    setLog(prev => [...prev, {
      contact: contact?.name || contact?.phone || 'Unknown',
      message,
      type,
      time: new Date().toLocaleTimeString()
    }])
  }

  const speak = (text) => {
    return new Promise((resolve) => {
      stopSpeech()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1
      utterance.onend = resolve
      utterance.onerror = resolve
      synthRef.current.speak(utterance)
    })
  }

  const stopSpeech = () => {
    if (synthRef.current.speaking) {
      synthRef.current.cancel()
    }
  }

  const listenOnce = () => {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        reject(new Error('Speech recognition not supported'))
        return
      }

      const recognition = new SpeechRecognition()
      recognition.lang = 'en-US'
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognitionRef.current = recognition

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript
        resolve(transcript)
      }

      recognition.onerror = (e) => {
        if (e.error === 'no-speech') resolve('(no response)')
        else reject(e)
      }

      recognition.onend = () => {
        resolve('(no response)')
      }

      recognition.start()
    })
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (e) {}
    }
  }

  const runCallForContact = async (contact, script) => {
    const convo = []
    conversationRef.current = convo

    setConversation([])
    setStatus('calling')
    addLog(contact, 'Call started', 'start')

    // Opening line
    const opening = `Hello, am I speaking with ${contact.name || 'there'}? This is an AI assistant calling regarding ${campaign?.name || 'a survey'}.`

    await speak(opening)

    convo.push({ role: 'assistant', content: opening })
    setConversation([...convo])

    // Conversation loop — max 6 turns
    for (let turn = 0; turn < 6; turn++) {
      if (pausedRef.current) {
        await waitUntilResumed()
      }

      // Listen
      setStatus('listening')
      setCurrentText('Listening...')
      let userSpeech = ''

      try {
        userSpeech = await listenOnce()
      } catch (err) {
        userSpeech = '(could not hear)'
      }

      setCurrentText('')
      convo.push({ role: 'user', content: userSpeech })
      setConversation([...convo])
      addLog(contact, `Contact said: "${userSpeech}"`)

      // Check if call should end
      const endPhrases = ['bye', 'goodbye', 'no thank you', 'not interested', 'stop', 'end']
      if (endPhrases.some(p => userSpeech.toLowerCase().includes(p))) {
        await speak('Thank you for your time. Have a great day. Goodbye!')
        convo.push({ role: 'assistant', content: 'Thank you for your time. Have a great day. Goodbye!' })
        setConversation([...convo])
        break
      }

      // Get AI response
      setStatus('thinking')
      setCurrentText('AI is thinking...')

      try {
        const res = await aiRespond({
          script,
          conversation: convo.slice(0, -1),
          user_message: userSpeech
        })
        const reply = res.data.reply

        convo.push({ role: 'assistant', content: reply })
        setConversation([...convo])

        setStatus('calling')
        setCurrentText('')
        await speak(reply)
        addLog(contact, `AI replied: "${reply}"`)

      } catch (err) {
        await speak('Sorry, I had trouble understanding. Thank you for your time. Goodbye!')
        break
      }
    }

    // Save transcript
    setStatus('thinking')
    addLog(contact, 'Saving transcript...', 'info')

    try {
      const summaryRes = await aiSummarize({ conversation: convo })
      const { summary, sentiment } = summaryRes.data

      await saveTranscript({
        contact_id: contact.id,
        campaign_id: campaignId,
        conversation: convo,
        summary,
        sentiment,
        duration: convo.length * 15
      })

      await updateContactStatus(contact.id, 'completed')
      addLog(contact, `Call saved. Sentiment: ${sentiment}`, 'success')
    } catch (err) {
      addLog(contact, 'Failed to save transcript', 'error')
    }

    setStatus('ended')
  }

  const waitUntilResumed = () => {
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (!pausedRef.current) {
          clearInterval(interval)
          resolve()
        }
      }, 500)
    })
  }

  const startCampaign = async () => {
    if (contacts.length === 0) {
      alert('No pending contacts found. Please upload contacts first.')
      return
    }

    setIsRunning(true)
    setIsPaused(false)
    pausedRef.current = false
    setLog([])

    await updateCampaign(campaignId, { status: 'running' })

    for (let i = 0; i < contacts.length; i++) {
      if (pausedRef.current) {
        await waitUntilResumed()
      }

      setCurrentIndex(i)
      const contact = contacts[i]
      addLog(contact, `Starting call ${i + 1} of ${contacts.length}`)
      await runCallForContact(contact, campaign?.script || '')

      // Wait 3 seconds between calls
      if (i < contacts.length - 1) {
        setStatus('idle')
        setCurrentText(`Next call in 3 seconds...`)
        await new Promise(r => setTimeout(r, 3000))
        setCurrentText('')
      }
    }

    await updateCampaign(campaignId, { status: 'completed' })
    setIsRunning(false)
    setStatus('idle')
    addLog({ name: 'System' }, 'All calls completed!', 'success')
  }

  const handlePause = () => {
    setIsPaused(true)
    pausedRef.current = true
    stopSpeech()
    stopListening()
    addLog({ name: 'System' }, 'Campaign paused', 'info')
  }

  const handleResume = () => {
    setIsPaused(false)
    pausedRef.current = false
    addLog({ name: 'System' }, 'Campaign resumed', 'info')
  }

  const handleStop = async () => {
    stopSpeech()
    stopListening()
    setIsRunning(false)
    setIsPaused(false)
    pausedRef.current = false
    setStatus('idle')
    await updateCampaign(campaignId, { status: 'draft' })
    addLog({ name: 'System' }, 'Campaign stopped', 'error')
  }

  const getStatusColor = () => {
    if (status === 'calling') return 'bg-green-500'
    if (status === 'listening') return 'bg-blue-500'
    if (status === 'thinking') return 'bg-yellow-500'
    if (status === 'ended') return 'bg-gray-400'
    return 'bg-gray-300'
  }

  const getStatusLabel = () => {
    if (status === 'calling') return 'AI Speaking'
    if (status === 'listening') return 'Listening to contact'
    if (status === 'thinking') return 'AI Thinking'
    if (status === 'ended') return 'Call ended'
    return 'Idle'
  }

  const progress = contacts.length > 0
    ? Math.round((currentIndex / contacts.length) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              {campaign?.name || 'Campaign Simulator'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {contacts.length} contacts pending
            </p>
          </div>
          <button
            onClick={() => navigate('/campaigns')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to campaigns
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left — Controls + Status */}
          <div className="space-y-4">

            {/* Status card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${status === 'listening' ? 'animate-pulse' : ''}`} />
                <span className="text-sm font-medium text-gray-700">{getStatusLabel()}</span>
              </div>

              {currentText && (
                <p className="text-sm text-indigo-600 italic mb-4">{currentText}</p>
              )}

              {/* Progress */}
              {isRunning && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Call {currentIndex + 1} of {contacts.length}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Current contact */}
              {isRunning && contacts[currentIndex] && (
                <div className="bg-indigo-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500">Currently calling</p>
                  <p className="text-sm font-medium text-indigo-700">
                    {contacts[currentIndex]?.name || 'Unknown'} — {contacts[currentIndex]?.phone}
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                {!isRunning && (
                  <button
                    onClick={startCampaign}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    ▶ Start calls
                  </button>
                )}
                {isRunning && !isPaused && (
                  <button
                    onClick={handlePause}
                    className="flex-1 bg-yellow-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-600"
                  >
                    ⏸ Pause
                  </button>
                )}
                {isRunning && isPaused && (
                  <button
                    onClick={handleResume}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    ▶ Resume
                  </button>
                )}
                {isRunning && (
                  <button
                    onClick={handleStop}
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600"
                  >
                    ⏹ Stop
                  </button>
                )}
              </div>
            </div>

            {/* Contacts list */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-medium text-gray-700 mb-3">
                Contacts ({contacts.length})
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {contacts.length === 0 ? (
                  <p className="text-sm text-gray-400">No pending contacts</p>
                ) : contacts.map((c, i) => (
                  <div key={c.id} className={`flex items-center justify-between text-sm p-2 rounded-lg ${i === currentIndex && isRunning ? 'bg-indigo-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        i < currentIndex ? 'bg-green-500' :
                        i === currentIndex && isRunning ? 'bg-indigo-500 animate-pulse' :
                        'bg-gray-300'
                      }`} />
                      <span className="text-gray-700">{c.name || 'Unknown'}</span>
                    </div>
                    <span className="text-gray-400">{c.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Live transcript */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Live transcript</h2>

            <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
              {conversation.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  Conversation will appear here during the call
                </p>
              ) : conversation.map((turn, i) => (
                <div key={i} className={`flex ${turn.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
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

            {/* Call log */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Call log</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {log.length === 0 ? (
                  <p className="text-xs text-gray-400">No activity yet</p>
                ) : log.slice(-10).map((entry, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-gray-400 shrink-0">{entry.time}</span>
                    <span className={`shrink-0 font-medium ${
                      entry.type === 'success' ? 'text-green-600' :
                      entry.type === 'error' ? 'text-red-500' :
                      entry.type === 'start' ? 'text-indigo-600' :
                      'text-gray-500'
                    }`}>[{entry.contact}]</span>
                    <span className="text-gray-600">{entry.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}