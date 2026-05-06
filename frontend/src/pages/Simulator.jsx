import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import {
  getContacts, updateContactStatus, adaptiveRespond,
  detectEmotion, aiSummarize, saveTranscript,
  updateCampaign, getCampaigns
} from '../services/api'

const EMOTION_CONFIG = {
  happy:      { emoji: '😊', color: 'text-green-600',  bg: 'bg-green-50',  score: 80 },
  interested: { emoji: '🤩', color: 'text-blue-600',   bg: 'bg-blue-50',   score: 75 },
  neutral:    { emoji: '😐', color: 'text-gray-600',   bg: 'bg-gray-50',   score: 50 },
  confused:   { emoji: '😕', color: 'text-yellow-600', bg: 'bg-yellow-50', score: 35 },
  sad:        { emoji: '😢', color: 'text-indigo-600', bg: 'bg-indigo-50', score: 25 },
  frustrated: { emoji: '😤', color: 'text-orange-600', bg: 'bg-orange-50', score: 20 },
  angry:      { emoji: '😠', color: 'text-red-600',    bg: 'bg-red-50',    score: 10 },
}

export default function Simulator() {
  const { campaignId } = useParams()
  const navigate = useNavigate()

  const [campaign, setCampaign] = useState(null)
  const [contacts, setContacts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [status, setStatus] = useState('idle')
  const [conversation, setConversation] = useState([])
  const [currentText, setCurrentText] = useState('')
  const [log, setLog] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Emotion state
  const [currentEmotion, setCurrentEmotion] = useState('neutral')
  const [emotionTimeline, setEmotionTimeline] = useState([])
  const [empathyScore, setEmpathyScore] = useState(100)
  const [emotionCounts, setEmotionCounts] = useState({})

  const recognitionRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)
  const pausedRef = useRef(false)
  const emotionTimelineRef = useRef([])

  useEffect(() => {
    loadData()
    const loadVoices = () => synthRef.current.getVoices()
    loadVoices()
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices
    }
    return () => { stopSpeech(); stopListening() }
  }, [])

  const loadData = async () => {
    try {
      const [campRes, contactsRes] = await Promise.all([
        getCampaigns(),
        getContacts(campaignId)
      ])
      const camp = campRes.data.find(c => c.id === campaignId)
      setCampaign(camp)
      const pending = contactsRes.data.filter(c => c.status !== 'completed')
      setContacts(pending)
    } catch (err) {
      console.error('Failed to load', err)
    }
  }

  const addLog = (contact, message, type = 'info') => {
    setLog(prev => [...prev, {
      contact: contact?.name || contact?.phone || 'System',
      message, type,
      time: new Date().toLocaleTimeString()
    }])
  }

  const speak = (text, emotionSuggestion = 'normal') => {
    return new Promise((resolve) => {
      stopSpeech()
      const utterance = new SpeechSynthesisUtterance(text)
      const lang = campaign?.language || 'en-US'
      utterance.lang = lang

      // Adapt speech rate based on emotion
      const rateMap = {
        slower: 0.75, normal: 0.9, faster: 1.1,
        empathetic: 0.8, enthusiastic: 1.05, apologetic: 0.85
      }
      utterance.rate = rateMap[emotionSuggestion] || 0.9
      utterance.pitch = emotionSuggestion === 'enthusiastic' ? 1.2 :
                        emotionSuggestion === 'empathetic' ? 0.9 : 1.0

      const voices = synthRef.current.getVoices()
      let voice = voices.find(v => v.lang === lang)
      if (!voice) voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]))
      if (!voice) voice = voices.find(v => v.lang.startsWith('en'))
      if (voice) utterance.voice = voice

      utterance.onend = resolve
      utterance.onerror = resolve
      synthRef.current.speak(utterance)
    })
  }

  const stopSpeech = () => {
    if (synthRef.current?.speaking) synthRef.current.cancel()
  }

  const listenOnce = () => {
    return new Promise((resolve) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) { resolve('(not supported)'); return }

      const recognition = new SpeechRecognition()
      recognition.lang = campaign?.language || 'en-US'
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognitionRef.current = recognition

      let resolved = false
      const done = (text) => { if (!resolved) { resolved = true; resolve(text) } }

      recognition.onresult = (e) => done(e.results[0][0].transcript)
      recognition.onerror = (e) => done(e.error === 'no-speech' ? '(no response)' : '(could not hear)')
      recognition.onend = () => done('(no response)')
      try { recognition.start() } catch (e) { done('(mic error)') }
    })
  }

  const stopListening = () => {
    try { recognitionRef.current?.stop() } catch (e) {}
  }

  const waitUntilResumed = () => new Promise(resolve => {
    const interval = setInterval(() => {
      if (!pausedRef.current) { clearInterval(interval); resolve() }
    }, 500)
  })

  const updateEmpathyScore = (emotion, suggestion) => {
    setEmpathyScore(prev => {
      const goodAdaptations = {
        angry: 'apologetic', frustrated: 'apologetic',
        sad: 'empathetic', confused: 'slower',
        happy: 'enthusiastic', interested: 'enthusiastic'
      }
      const isGoodAdaptation = goodAdaptations[emotion] === suggestion
      const delta = isGoodAdaptation ? +5 : emotion === 'neutral' ? 0 : -2
      return Math.min(100, Math.max(0, prev + delta))
    })
  }

  const runCallForContact = async (contact, script) => {
    const convo = []
    const timeline = []
    emotionTimelineRef.current = []

    setConversation([])
    setEmotionTimeline([])
    setCurrentEmotion('neutral')
    setEmpathyScore(100)
    setEmotionCounts({})
    setStatus('calling')
    addLog(contact, 'Call started', 'start')

    const opening = `Hello, am I speaking with ${contact.name || 'there'}? This is an AI assistant calling regarding ${campaign?.name || 'a quick survey'}.`
    await speak(opening, 'normal')
    convo.push({ role: 'assistant', content: opening, emotion: 'neutral' })
    setConversation([...convo])

    for (let turn = 0; turn < 6; turn++) {
      if (pausedRef.current) await waitUntilResumed()

      // Listen
      setStatus('listening')
      setCurrentText('🎤 Listening...')
      const userSpeech = await listenOnce()
      setCurrentText('')

      // Detect emotion
      setCurrentText('🧠 Analyzing emotion...')
      let emotion = 'neutral'
      let suggestion = 'normal'
      let emotionScore = 50

      try {
        const emotionRes = await detectEmotion({ text: userSpeech })
        emotion = emotionRes.data.emotion || 'neutral'
        suggestion = emotionRes.data.suggestion || 'normal'
        emotionScore = emotionRes.data.score || 50

        setCurrentEmotion(emotion)
        const newEntry = {
          turn: turn + 1,
          emotion,
          score: emotionScore,
          text: userSpeech,
          time: new Date().toLocaleTimeString()
        }
        timeline.push(newEntry)
        emotionTimelineRef.current = [...timeline]
        setEmotionTimeline([...timeline])

        setEmotionCounts(prev => ({
          ...prev,
          [emotion]: (prev[emotion] || 0) + 1
        }))

        updateEmpathyScore(emotion, suggestion)
        addLog(contact, `Emotion: ${EMOTION_CONFIG[emotion]?.emoji || '😐'} ${emotion} (score: ${emotionScore})`)
      } catch (err) {
        console.error('Emotion detection failed:', err)
      }

      convo.push({ role: 'user', content: userSpeech, emotion })
      setConversation([...convo])
      addLog(contact, `Contact: "${userSpeech}"`)

      // End call check
      const endPhrases = ['bye', 'goodbye', 'not interested', 'stop', 'end', 'no thank you']
      if (endPhrases.some(p => userSpeech.toLowerCase().includes(p))) {
        const farewell = emotion === 'angry' || emotion === 'frustrated'
          ? 'I understand, I apologize for disturbing you. Have a good day!'
          : 'Thank you so much for your time. Have a wonderful day!'
        await speak(farewell, suggestion)
        convo.push({ role: 'assistant', content: farewell, emotion: 'neutral' })
        setConversation([...convo])
        break
      }

      // Adaptive AI response
      setStatus('thinking')
      setCurrentText(`💭 Adapting to ${emotion} tone...`)

      try {
        const res = await adaptiveRespond({
          script,
          conversation: convo.slice(0, -1),
          user_message: userSpeech,
          emotion,
          suggestion,
          language: campaign?.language || 'en-US'
        })
        const reply = res.data.reply

        convo.push({ role: 'assistant', content: reply, emotion: 'neutral' })
        setConversation([...convo])
        setStatus('calling')
        setCurrentText('')
        await speak(reply, suggestion)
        addLog(contact, `AI (${suggestion} mode): "${reply}"`)
      } catch (err) {
        await speak('Thank you for your time. Goodbye!', 'normal')
        break
      }
    }

    // Save with emotion data
    setStatus('thinking')
    setCurrentText('Saving transcript...')

    try {
      const summaryRes = await aiSummarize({ conversation: convo })
      const { summary, sentiment } = summaryRes.data

      const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'

      await saveTranscript({
        contact_id: contact.id,
        campaign_id: campaignId,
        conversation: convo,
        summary: `[Dominant emotion: ${dominantEmotion}] ${summary}`,
        sentiment,
        duration: convo.length * 15
      })
      await updateContactStatus(contact.id, 'completed')
      addLog(contact, `Saved! Sentiment: ${sentiment} | Empathy score: ${empathyScore}`, 'success')
    } catch (err) {
      addLog(contact, `Save failed: ${err.message}`, 'error')
    }

    setCurrentText('')
    setStatus('ended')
  }

  const startCampaign = async () => {
    if (contacts.length === 0) {
      alert('No pending contacts. Upload contacts first.')
      return
    }
    setIsRunning(true)
    setIsPaused(false)
    pausedRef.current = false
    setLog([])
    setCurrentIndex(0)

    try { await updateCampaign(campaignId, { status: 'running' }) } catch (e) {}

    for (let i = 0; i < contacts.length; i++) {
      if (pausedRef.current) await waitUntilResumed()
      setCurrentIndex(i)
      addLog(contacts[i], `Starting call ${i + 1} of ${contacts.length}`)
      await runCallForContact(contacts[i], campaign?.script || '')

      if (i < contacts.length - 1) {
        setStatus('idle')
        setCurrentText('Next call in 3 seconds...')
        await new Promise(r => setTimeout(r, 3000))
        setCurrentText('')
      }
    }

    try { await updateCampaign(campaignId, { status: 'completed' }) } catch (e) {}
    setIsRunning(false)
    setStatus('idle')
    setCurrentText('')
    addLog({ name: 'System' }, 'All calls completed!', 'success')
  }

  const handlePause = () => {
    setIsPaused(true); pausedRef.current = true
    stopSpeech(); stopListening()
    addLog({ name: 'System' }, 'Paused', 'info')
  }

  const handleResume = () => {
    setIsPaused(false); pausedRef.current = false
    addLog({ name: 'System' }, 'Resumed', 'info')
  }

  const handleStop = async () => {
    stopSpeech(); stopListening()
    pausedRef.current = false
    setIsRunning(false); setIsPaused(false)
    setStatus('idle'); setCurrentText('')
    try { await updateCampaign(campaignId, { status: 'draft' }) } catch (e) {}
    addLog({ name: 'System' }, 'Stopped', 'error')
  }

  const getStatusColor = () => ({
    calling: 'bg-green-500', listening: 'bg-blue-500',
    thinking: 'bg-yellow-500', ended: 'bg-gray-400'
  }[status] || 'bg-gray-300')

  const getStatusLabel = () => ({
    calling: '🔊 AI Speaking',
    listening: '🎤 Listening',
    thinking: '💭 AI Thinking',
    ended: '✅ Call ended'
  }[status] || '⏸ Idle')

  const emotionInfo = EMOTION_CONFIG[currentEmotion] || EMOTION_CONFIG.neutral
  const progress = contacts.length > 0 ? Math.round((currentIndex / contacts.length) * 100) : 0

  // Emotion timeline bar chart
  const maxScore = 100
  const timelineHeight = 60

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              {campaign?.name || 'Simulator'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Emotion-Adaptive AI Caller · {contacts.length} contacts
            </p>
          </div>
          <button onClick={() => navigate('/campaigns')}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg">
            ← Back
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — Controls */}
          <div className="space-y-4">

            {/* Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${status === 'listening' ? 'animate-pulse' : ''}`} />
                <span className="text-sm font-medium text-gray-700">{getStatusLabel()}</span>
              </div>

              {currentText && (
                <p className="text-sm text-indigo-600 italic mb-3 bg-indigo-50 px-3 py-2 rounded-lg">
                  {currentText}
                </p>
              )}

              {isRunning && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Call {currentIndex + 1} of {contacts.length}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {isRunning && contacts[currentIndex] && (
                <div className="bg-indigo-50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-500">Calling</p>
                  <p className="text-sm font-medium text-indigo-700">
                    {contacts[currentIndex]?.name} — {contacts[currentIndex]?.phone}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {!isRunning && (
                  <button onClick={startCampaign}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    ▶ Start calls
                  </button>
                )}
                {isRunning && !isPaused && (
                  <button onClick={handlePause}
                    className="flex-1 bg-yellow-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-600">
                    ⏸ Pause
                  </button>
                )}
                {isRunning && isPaused && (
                  <button onClick={handleResume}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                    ▶ Resume
                  </button>
                )}
                {isRunning && (
                  <button onClick={handleStop}
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600">
                    ⏹ Stop
                  </button>
                )}
              </div>
            </div>

            {/* EMOTION PANEL */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-medium text-gray-700 mb-3">🧠 Live Emotion Detection</h2>

              {/* Current emotion */}
              <div className={`rounded-xl p-4 mb-3 ${emotionInfo.bg} flex items-center gap-3`}>
                <span className="text-4xl">{emotionInfo.emoji}</span>
                <div>
                  <p className={`font-semibold capitalize ${emotionInfo.color}`}>
                    {currentEmotion}
                  </p>
                  <p className="text-xs text-gray-500">Current emotion</p>
                </div>
              </div>

              {/* Empathy score */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>AI Empathy Score</span>
                  <span className="font-medium text-indigo-600">{empathyScore}/100</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      empathyScore > 70 ? 'bg-green-500' :
                      empathyScore > 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${empathyScore}%` }}
                  />
                </div>
              </div>

              {/* Emotion timeline graph */}
              {emotionTimeline.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Emotion timeline</p>
                  <div className="flex items-end gap-1 h-16">
                    {emotionTimeline.map((entry, i) => {
                      const config = EMOTION_CONFIG[entry.emotion] || EMOTION_CONFIG.neutral
                      const height = Math.max(8, (entry.score / 100) * timelineHeight)
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${entry.emotion}: ${entry.score}`}>
                          <span className="text-xs">{config.emoji}</span>
                          <div
                            className={`w-full rounded-t ${config.bg} border ${config.color.replace('text', 'border')}`}
                            style={{ height: `${height}px` }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Turn 1</span>
                    <span>Turn {emotionTimeline.length}</span>
                  </div>
                </div>
              )}

              {/* Emotion counts */}
              {Object.keys(emotionCounts).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {Object.entries(emotionCounts).map(([emotion, count]) => {
                    const config = EMOTION_CONFIG[emotion] || EMOTION_CONFIG.neutral
                    return (
                      <span key={emotion} className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                        {config.emoji} {emotion}: {count}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Contacts list */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-medium text-gray-700 mb-3">Contacts ({contacts.length})</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {contacts.length === 0 ? (
                  <p className="text-sm text-gray-400">No pending contacts</p>
                ) : contacts.map((c, i) => (
                  <div key={c.id}
                    className={`flex items-center justify-between text-sm p-2 rounded-lg ${i === currentIndex && isRunning ? 'bg-indigo-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        i < currentIndex ? 'bg-green-500' :
                        i === currentIndex && isRunning ? 'bg-indigo-500 animate-pulse' :
                        'bg-gray-300'
                      }`} />
                      <span className="text-gray-700">{c.name || 'Unknown'}</span>
                    </div>
                    <span className="text-gray-400 text-xs">{c.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MIDDLE — Live transcript */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Live Transcript</h2>
            <div className="flex-1 space-y-3 max-h-96 overflow-y-auto mb-4">
              {conversation.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">Conversation appears here</p>
                  <p className="text-gray-300 text-xs mt-1">Use Chrome browser</p>
                </div>
              ) : conversation.map((turn, i) => {
                const emotionConf = EMOTION_CONFIG[turn.emotion] || EMOTION_CONFIG.neutral
                return (
                  <div key={i} className={`flex ${turn.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                      turn.role === 'assistant'
                        ? 'bg-indigo-100 text-indigo-900 rounded-tl-none'
                        : 'bg-gray-100 text-gray-800 rounded-tr-none'
                    }`}>
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs font-medium opacity-60">
                          {turn.role === 'assistant' ? '🤖 AI Agent' : '👤 Contact'}
                        </p>
                        {turn.role === 'user' && turn.emotion && (
                          <span className="text-xs">{emotionConf.emoji}</span>
                        )}
                      </div>
                      {turn.content}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Activity log */}
            <div className="border-t border-gray-100 pt-3">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Activity</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {log.length === 0 ? (
                  <p className="text-xs text-gray-400">No activity yet</p>
                ) : log.slice(-15).map((entry, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-gray-400 shrink-0">{entry.time}</span>
                    <span className={`shrink-0 font-medium ${
                      entry.type === 'success' ? 'text-green-600' :
                      entry.type === 'error' ? 'text-red-500' :
                      entry.type === 'start' ? 'text-indigo-600' : 'text-gray-500'
                    }`}>[{entry.contact}]</span>
                    <span className="text-gray-600">{entry.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — Emotion Analytics */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-medium text-gray-700 mb-4">📊 Emotion Analytics</h2>

              {emotionTimeline.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-2">🧠</p>
                  <p className="text-gray-400 text-sm">Emotion data appears here during the call</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(EMOTION_CONFIG).map(([emotion, config]) => {
                    const count = emotionCounts[emotion] || 0
                    const total = emotionTimeline.length
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    if (count === 0) return null
                    return (
                      <div key={emotion}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`${config.color} font-medium`}>
                            {config.emoji} {emotion}
                          </span>
                          <span className="text-gray-500">{count} turns ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              emotion === 'happy' || emotion === 'interested' ? 'bg-green-500' :
                              emotion === 'neutral' ? 'bg-gray-400' :
                              emotion === 'confused' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Adaptation log */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-medium text-gray-700 mb-3">🎯 AI Adaptations</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {emotionTimeline.length === 0 ? (
                  <p className="text-xs text-gray-400">Adaptations appear here during the call</p>
                ) : emotionTimeline.map((entry, i) => {
                  const config = EMOTION_CONFIG[entry.emotion] || EMOTION_CONFIG.neutral
                  return (
                    <div key={i} className={`rounded-lg p-3 ${config.bg}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${config.color}`}>
                          Turn {entry.turn} — {config.emoji} {entry.emotion}
                        </span>
                        <span className="text-xs text-gray-400">{entry.time}</span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">"{entry.text}"</p>
                      <p className="text-xs text-gray-400 mt-1">Score: {entry.score}/100</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}