import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import {
  getContacts, updateContactStatus, adaptiveRespond,
  detectEmotion, aiSummarize, saveTranscript,
  updateCampaign, getCampaigns
} from '../services/api'
import axios from 'axios'

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL })
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const EMOTION_CONFIG = {
  happy:      { emoji: '😊', color: 'text-green-600',  bg: 'bg-green-50' },
  interested: { emoji: '🤩', color: 'text-blue-600',   bg: 'bg-blue-50' },
  neutral:    { emoji: '😐', color: 'text-gray-600',   bg: 'bg-gray-50' },
  confused:   { emoji: '😕', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  sad:        { emoji: '😢', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  frustrated: { emoji: '😤', color: 'text-orange-600', bg: 'bg-orange-50' },
  angry:      { emoji: '😠', color: 'text-red-600',    bg: 'bg-red-50' },
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
  const [currentEmotion, setCurrentEmotion] = useState('neutral')
  const [emotionTimeline, setEmotionTimeline] = useState([])
  const [empathyScore, setEmpathyScore] = useState(100)
  const [emotionCounts, setEmotionCounts] = useState({})
  const [recordings, setRecordings] = useState([])
  const [isRecording, setIsRecording] = useState(false)

  const recognitionRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)
  const pausedRef = useRef(false)
  const stoppedRef = useRef(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const currentRecordingRef = useRef(null)

  useEffect(() => {
    loadData()
    const loadVoices = () => synthRef.current.getVoices()
    loadVoices()
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices
    }
    return () => {
      stopSpeech()
      stopListening()
      stopRecording()
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

  // START RECORDING
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
      console.log('Recording started')
    } catch (err) {
      console.error('Could not start recording:', err)
    }
  }

  // STOP RECORDING and return base64
  const stopRecording = () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null)
        return
      }
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result
          setIsRecording(false)
          resolve(base64)
        }
        reader.readAsDataURL(audioBlob)
      }
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
    })
  }

  // SPEAK with correct language and gender
  const speak = (text, emotionSuggestion = 'normal') => {
    return new Promise((resolve) => {
      if (stoppedRef.current) { resolve(); return }
      stopSpeech()

      const utterance = new SpeechSynthesisUtterance(text)
      const lang = campaign?.language || 'en-US'
      const gender = campaign?.voice_gender || 'female'
      utterance.lang = lang

      const rateMap = {
        slower: 0.75, normal: 0.9, faster: 1.05,
        empathetic: 0.8, enthusiastic: 1.0, apologetic: 0.85
      }
      utterance.rate = rateMap[emotionSuggestion] || 0.9
      utterance.pitch = gender === 'female' ? 1.2 : 0.8

      const voices = synthRef.current.getVoices()
      let langVoices = voices.filter(v => v.lang === lang)
      if (langVoices.length === 0) {
        langVoices = voices.filter(v => v.lang.startsWith(lang.split('-')[0]))
      }
      if (langVoices.length === 0) {
        langVoices = voices.filter(v => v.lang.startsWith('en'))
      }

      let selectedVoice = null
      if (gender === 'female') {
        selectedVoice = langVoices.find(v =>
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('zira') ||
          v.name.toLowerCase().includes('hazel') ||
          v.name.toLowerCase().includes('heera') ||
          v.name.toLowerCase().includes('priya')
        ) || langVoices[0]
      } else {
        selectedVoice = langVoices.find(v =>
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('david') ||
          v.name.toLowerCase().includes('mark') ||
          v.name.toLowerCase().includes('ravi')
        ) || langVoices[langVoices.length - 1]
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice
        console.log(`Voice: ${selectedVoice.name} (${lang}, ${gender})`)
      }

      utterance.onend = resolve
      utterance.onerror = resolve
      synthRef.current.speak(utterance)
    })
  }

  const stopSpeech = () => {
    if (synthRef.current?.speaking) synthRef.current.cancel()
  }

  // LISTEN with timeout — only for English
  const listenOnce = () => {
    return new Promise((resolve) => {
      if (stoppedRef.current) { resolve('(stopped)'); return }

      const lang = campaign?.language || 'en-US'

      // For Hindi/Marathi, Web Speech STT is unreliable — use text input simulation
      if (lang === 'hi-IN' || lang === 'mr-IN') {
        // Give 5 seconds for response then continue
        setCurrentText('🎤 Listening... (speak now)')
        setTimeout(() => {
          if (!stoppedRef.current) resolve('हाँ ठीक है')
        }, 5000)
        return
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) { resolve('(not supported)'); return }

      const recognition = new SpeechRecognition()
      recognition.lang = lang
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognitionRef.current = recognition

      let resolved = false
      let timeoutId = null

      const done = (text) => {
        if (!resolved) {
          resolved = true
          if (timeoutId) clearTimeout(timeoutId)
          resolve(text)
        }
      }

      // 10 second timeout
      timeoutId = setTimeout(() => done('(no response)'), 10000)

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript
        console.log('Heard:', transcript)
        done(transcript)
      }
      recognition.onerror = (e) => {
        console.error('Speech error:', e.error)
        if (e.error === 'no-speech') done('(no response)')
        else if (e.error === 'not-allowed') done('(mic not allowed)')
        else done('(could not hear)')
      }
      recognition.onend = () => done('(no response)')

      try {
        recognition.start()
        console.log(`Listening in ${lang}...`)
      } catch (e) {
        done('(mic error)')
      }
    })
  }

  const stopListening = () => {
    try { recognitionRef.current?.stop() } catch (e) {}
  }

  const waitUntilResumed = () => new Promise(resolve => {
    const interval = setInterval(() => {
      if (!pausedRef.current || stoppedRef.current) {
        clearInterval(interval)
        resolve()
      }
    }, 500)
  })

  const updateEmpathyScore = (emotion, suggestion) => {
    const goodAdaptations = {
      angry: 'apologetic', frustrated: 'apologetic',
      sad: 'empathetic', confused: 'slower',
      happy: 'enthusiastic', interested: 'enthusiastic'
    }
    const isGood = goodAdaptations[emotion] === suggestion
    const delta = isGood ? +5 : emotion === 'neutral' ? 0 : -2
    setEmpathyScore(prev => Math.min(100, Math.max(0, prev + delta)))
  }

  const runCallForContact = async (contact, script) => {
    if (stoppedRef.current) return

    const convo = []
    const timeline = []
    let localEmotionCounts = {}

    setConversation([])
    setEmotionTimeline([])
    setCurrentEmotion('neutral')
    setEmpathyScore(100)
    setEmotionCounts({})
    setStatus('calling')
    addLog(contact, 'Call started', 'start')

    // Start recording
    await startRecording()

    const opening = `Hello, am I speaking with ${contact.name || 'there'}? This is an AI assistant calling regarding ${campaign?.name || 'a quick survey'}.`
    if (stoppedRef.current) { await stopRecording(); return }
    await speak(opening, 'normal')
    if (stoppedRef.current) { await stopRecording(); return }

    convo.push({ role: 'assistant', content: opening, emotion: 'neutral' })
    setConversation([...convo])

    for (let turn = 0; turn < 6; turn++) {
      if (stoppedRef.current) {
        addLog(contact, 'Call stopped by user', 'error')
        break
      }

      if (pausedRef.current) await waitUntilResumed()
      if (stoppedRef.current) break

      // Listen
      setStatus('listening')
      setCurrentText('🎤 Listening... speak now')
      const userSpeech = await listenOnce()
      if (stoppedRef.current) break
      setCurrentText('')

      // Detect emotion
      setCurrentText('🧠 Analyzing emotion...')
      let emotion = 'neutral'
      let suggestion = 'normal'
      let emotionScore = 50

      try {
        const emotionRes = await detectEmotion({ text: userSpeech })
        if (stoppedRef.current) break
        emotion = emotionRes.data.emotion || 'neutral'
        suggestion = emotionRes.data.suggestion || 'normal'
        emotionScore = emotionRes.data.score || 50

        setCurrentEmotion(emotion)
        const newEntry = { turn: turn + 1, emotion, score: emotionScore, text: userSpeech, time: new Date().toLocaleTimeString() }
        timeline.push(newEntry)
        setEmotionTimeline([...timeline])

        localEmotionCounts[emotion] = (localEmotionCounts[emotion] || 0) + 1
        setEmotionCounts({ ...localEmotionCounts })
        updateEmpathyScore(emotion, suggestion)
        addLog(contact, `Emotion: ${EMOTION_CONFIG[emotion]?.emoji || '😐'} ${emotion}`)
      } catch (err) {
        console.error('Emotion detection error:', err)
      }

      convo.push({ role: 'user', content: userSpeech, emotion })
      setConversation([...convo])
      addLog(contact, `Contact: "${userSpeech}"`)

      const endPhrases = ['bye', 'goodbye', 'not interested', 'stop', 'end', 'no thank you', 'disconnect']
      if (endPhrases.some(p => userSpeech.toLowerCase().includes(p))) {
        const farewell = emotion === 'angry' || emotion === 'frustrated'
          ? 'I understand, I apologize for disturbing you. Have a good day!'
          : 'Thank you so much for your time. Have a wonderful day!'
        if (stoppedRef.current) break
        await speak(farewell, suggestion)
        convo.push({ role: 'assistant', content: farewell, emotion: 'neutral' })
        setConversation([...convo])
        break
      }

      if (stoppedRef.current) break

      setStatus('thinking')
      setCurrentText(`💭 Adapting to ${emotion} tone...`)

      try {
        const res = await adaptiveRespond({
          script,
          conversation: convo.slice(0, -1),
          user_message: userSpeech,
          emotion, suggestion,
          language: campaign?.language || 'en-US'
        })
        if (stoppedRef.current) break
        const reply = res.data.reply
        convo.push({ role: 'assistant', content: reply, emotion: 'neutral' })
        setConversation([...convo])
        setStatus('calling')
        setCurrentText('')
        if (stoppedRef.current) break
        await speak(reply, suggestion)
        addLog(contact, `AI (${suggestion}): "${reply}"`)
      } catch (err) {
        if (stoppedRef.current) break
        await speak('Thank you for your time. Goodbye!', 'normal')
        break
      }
    }

    // Stop recording
    const audioData = await stopRecording()

    if (stoppedRef.current) return

    // Save transcript and recording
    setStatus('thinking')
    setCurrentText('Saving...')
    addLog(contact, 'Saving transcript and recording...', 'info')

    try {
      const summaryRes = await aiSummarize({ conversation: convo })
      if (stoppedRef.current) return

      const summary = summaryRes.data.summary || 'No summary'
      const sentiment = summaryRes.data.sentiment || 'neutral'
      const dominantEmotion = Object.entries(localEmotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'

      const transcriptRes = await saveTranscript({
        contact_id: contact.id,
        campaign_id: campaignId,
        conversation: convo,
        summary: `[Dominant emotion: ${dominantEmotion}] ${summary}`,
        sentiment,
        duration: convo.length * 15
      })

      // Save recording if we have audio
      if (audioData && transcriptRes.data?.id) {
        try {
          await API.post('/api/recordings/', {
            contact_id: contact.id,
            campaign_id: campaignId,
            transcript_id: transcriptRes.data.id,
            audio_data: audioData,
            duration: convo.length * 15
          })
          setRecordings(prev => [...prev, {
            contact: contact.name || contact.phone,
            audio: audioData,
            time: new Date().toLocaleTimeString()
          }])
          addLog(contact, 'Recording saved!', 'success')
        } catch (recErr) {
          console.error('Recording save error:', recErr)
        }
      }

      await updateContactStatus(contact.id, 'completed')
      addLog(contact, `Saved! Sentiment: ${sentiment} | Empathy: ${empathyScore}`, 'success')
    } catch (err) {
      console.error('Save error:', err)
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

    // Check microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      alert('Microphone access is required. Please allow microphone access and try again.')
      return
    }

    setIsRunning(true)
    setIsPaused(false)
    pausedRef.current = false
    stoppedRef.current = false
    setLog([])
    setCurrentIndex(0)
    setRecordings([])

    try { await updateCampaign(campaignId, { status: 'running' }) } catch (e) {}

    for (let i = 0; i < contacts.length; i++) {
      if (stoppedRef.current) break
      if (pausedRef.current) await waitUntilResumed()
      if (stoppedRef.current) break

      setCurrentIndex(i)
      addLog(contacts[i], `Starting call ${i + 1} of ${contacts.length}`)
      await runCallForContact(contacts[i], campaign?.script || '')

      if (stoppedRef.current) break

      if (i < contacts.length - 1) {
        setStatus('idle')
        setCurrentText('Next call in 3 seconds...')
        await new Promise(r => setTimeout(r, 3000))
        if (stoppedRef.current) break
        setCurrentText('')
      }
    }

    if (!stoppedRef.current) {
      try { await updateCampaign(campaignId, { status: 'completed' }) } catch (e) {}
      addLog({ name: 'System' }, '🎉 All calls completed!', 'success')
    }

    setIsRunning(false)
    setStatus('idle')
    setCurrentText('')
  }

  const handlePause = () => {
    setIsPaused(true)
    pausedRef.current = true
    stopSpeech()
    stopListening()
    addLog({ name: 'System' }, 'Paused', 'info')
  }

  const handleResume = () => {
    setIsPaused(false)
    pausedRef.current = false
    addLog({ name: 'System' }, 'Resumed', 'info')
  }

  const handleStop = async () => {
    stoppedRef.current = true
    pausedRef.current = false
    stopSpeech()
    stopListening()
    await stopRecording()
    setIsRunning(false)
    setIsPaused(false)
    setIsRecording(false)
    setStatus('idle')
    setCurrentText('')
    try { await updateCampaign(campaignId, { status: 'draft' }) } catch (e) {}
    addLog({ name: 'System' }, 'Campaign stopped', 'error')
  }

  const getStatusColor = () => ({
    calling: 'bg-green-500', listening: 'bg-blue-500',
    thinking: 'bg-yellow-500', ended: 'bg-gray-400'
  }[status] || 'bg-gray-300')

  const getStatusLabel = () => ({
    calling: '🔊 AI Speaking',
    listening: '🎤 Listening to contact',
    thinking: '💭 AI Thinking...',
    ended: '✅ Call ended'
  }[status] || '⏸ Idle')

  const progress = contacts.length > 0 ? Math.round((currentIndex / contacts.length) * 100) : 0
  const emotionInfo = EMOTION_CONFIG[currentEmotion] || EMOTION_CONFIG.neutral

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">{campaign?.name || 'Simulator'}</h1>
            <p className="text-sm text-gray-500 mt-1">
              🧠 Emotion-Adaptive AI · {contacts.length} contacts · Chrome required
              {isRecording && <span className="ml-2 text-red-500 animate-pulse">🔴 Recording</span>}
            </p>
          </div>
          <button onClick={() => navigate('/campaigns')}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg">
            ← Back
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT */}
          <div className="space-y-4">

            {/* Controls */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${status === 'listening' ? 'animate-pulse' : ''}`} />
                <span className="text-sm font-medium text-gray-700">{getStatusLabel()}</span>
              </div>

              {currentText && (
                <p className="text-sm text-indigo-600 italic mb-3 bg-indigo-50 px-3 py-2 rounded-lg">{currentText}</p>
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
                  <p className="text-xs text-gray-500 mb-1">Calling</p>
                  <p className="text-sm font-medium text-indigo-700">
                    {contacts[currentIndex]?.name} — {contacts[currentIndex]?.phone}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {!isRunning && (
                  <button onClick={startCampaign}
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    ▶ Start calls
                  </button>
                )}
                {isRunning && !isPaused && (
                  <button onClick={handlePause}
                    className="flex-1 bg-yellow-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-yellow-600">
                    ⏸ Pause
                  </button>
                )}
                {isRunning && isPaused && (
                  <button onClick={handleResume}
                    className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700">
                    ▶ Resume
                  </button>
                )}
                {isRunning && (
                  <button onClick={handleStop}
                    className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-600">
                    ⏹ Stop
                  </button>
                )}
              </div>
            </div>

            {/* Emotion Panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">🧠 Live Emotion</h2>
              <div className={`rounded-xl p-4 mb-3 ${emotionInfo.bg} flex items-center gap-3`}>
                <span className="text-4xl">{emotionInfo.emoji}</span>
                <div>
                  <p className={`font-semibold capitalize ${emotionInfo.color}`}>{currentEmotion}</p>
                  <p className="text-xs text-gray-500">Current emotion</p>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Empathy Score</span>
                  <span className="font-semibold text-indigo-600">{empathyScore}/100</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className={`h-3 rounded-full transition-all ${empathyScore > 70 ? 'bg-green-500' : empathyScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${empathyScore}%` }} />
                </div>
              </div>
              {emotionTimeline.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Timeline</p>
                  <div className="flex items-end gap-1 h-12">
                    {emotionTimeline.map((entry, i) => {
                      const config = EMOTION_CONFIG[entry.emotion] || EMOTION_CONFIG.neutral
                      const h = Math.max(6, (entry.score / 100) * 48)
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={entry.emotion}>
                          <span className="text-xs">{config.emoji}</span>
                          <div className={`w-full rounded-t ${config.bg}`} style={{ height: `${h}px` }} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Contacts */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Contacts ({contacts.length})</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {contacts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No pending contacts.</p>
                ) : contacts.map((c, i) => (
                  <div key={c.id} className={`flex items-center justify-between text-sm p-2 rounded-lg ${i === currentIndex && isRunning ? 'bg-indigo-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${i < currentIndex ? 'bg-green-500' : i === currentIndex && isRunning ? 'bg-indigo-500 animate-pulse' : 'bg-gray-300'}`} />
                      <span className="text-gray-700">{c.name || 'Unknown'}</span>
                    </div>
                    <span className="text-gray-400 text-xs">{c.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MIDDLE — Transcript */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">💬 Live Transcript</h2>
            <div className="flex-1 space-y-3 max-h-80 overflow-y-auto mb-4">
              {conversation.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-5xl mb-3">🎙️</p>
                  <p className="text-gray-400 text-sm">Conversation appears here</p>
                  <p className="text-gray-300 text-xs mt-1">Use Chrome browser</p>
                </div>
              ) : conversation.map((turn, i) => {
                const ec = EMOTION_CONFIG[turn.emotion] || EMOTION_CONFIG.neutral
                return (
                  <div key={i} className={`flex ${turn.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${turn.role === 'assistant' ? 'bg-indigo-100 text-indigo-900 rounded-tl-none' : 'bg-gray-100 text-gray-800 rounded-tr-none'}`}>
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs font-medium opacity-60">
                          {turn.role === 'assistant' ? '🤖 AI' : '👤 Contact'}
                        </p>
                        {turn.role === 'user' && turn.emotion && turn.emotion !== 'neutral' && (
                          <span className="text-xs">{ec.emoji}</span>
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
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Activity Log</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {log.length === 0 ? (
                  <p className="text-xs text-gray-400">No activity yet</p>
                ) : log.slice(-15).map((entry, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-gray-400 shrink-0">{entry.time}</span>
                    <span className={`shrink-0 font-medium ${entry.type === 'success' ? 'text-green-600' : entry.type === 'error' ? 'text-red-500' : entry.type === 'start' ? 'text-indigo-600' : 'text-gray-500'}`}>
                      [{entry.contact}]
                    </span>
                    <span className="text-gray-600">{entry.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — Analytics + Recordings */}
          <div className="space-y-4">

            {/* Emotion Analytics */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">📊 Emotion Analytics</h2>
              {emotionTimeline.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-4xl mb-2">🧠</p>
                  <p className="text-gray-400 text-sm">Appears during call</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(EMOTION_CONFIG).map(([emotion, config]) => {
                    const count = emotionCounts[emotion] || 0
                    const total = emotionTimeline.length
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    if (count === 0) return null
                    return (
                      <div key={emotion}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`${config.color} font-medium`}>{config.emoji} {emotion}</span>
                          <span className="text-gray-500">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`h-2 rounded-full ${emotion === 'happy' || emotion === 'interested' ? 'bg-green-500' : emotion === 'neutral' ? 'bg-gray-400' : emotion === 'confused' ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Call Recordings */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                🎙️ Call Recordings
                {isRecording && <span className="ml-2 text-xs text-red-500 animate-pulse">● Recording</span>}
              </h2>
              {recordings.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">🎙️</p>
                  <p className="text-gray-400 text-xs">Recordings appear here after calls</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {recordings.map((rec, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">{rec.contact}</p>
                        <span className="text-xs text-gray-400">{rec.time}</span>
                      </div>
                      <audio
                        controls
                        src={rec.audio}
                        className="w-full h-8"
                        style={{ height: '32px' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adaptation log */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">🎯 AI Adaptations</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {emotionTimeline.length === 0 ? (
                  <p className="text-xs text-gray-400">Appears during call</p>
                ) : emotionTimeline.map((entry, i) => {
                  const config = EMOTION_CONFIG[entry.emotion] || EMOTION_CONFIG.neutral
                  return (
                    <div key={i} className={`rounded-lg p-2 ${config.bg}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${config.color}`}>
                          Turn {entry.turn} — {config.emoji} {entry.emotion}
                        </span>
                        <span className="text-xs text-gray-400">{entry.score}/100</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">"{entry.text}"</p>
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