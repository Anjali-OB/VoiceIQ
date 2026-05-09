import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import { getVisionInfo, analyzeImage, registerFace, verifyFace, getRegisteredFaces, deleteFace, getCampaigns, getContacts } from '../services/api'

export default function FaceVerifier() {
  const [info, setInfo] = useState(null)
  const [activeTab, setActiveTab] = useState('detect')
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [contacts, setContacts] = useState([])
  const [selectedContact, setSelectedContact] = useState('')
  const [registeredFaces, setRegisteredFaces] = useState([])
  const [cameraActive, setCameraActive] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    getVisionInfo().then(r => setInfo(r.data)).catch(() => {})
    getCampaigns().then(r => setCampaigns(r.data)).catch(() => {})
    loadRegistered()
    return () => stopCamera()
  }, [])

  const loadRegistered = () => {
    getRegisteredFaces().then(r => setRegisteredFaces(r.data)).catch(() => {})
  }

  const handleCampaignChange = async (campId) => {
    setSelectedCampaign(campId)
    setSelectedContact('')
    if (campId) {
      const res = await getContacts(campId)
      setContacts(res.data)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)
      setResult(null)
      setCapturedImage(null)
    } catch (err) {
      alert('Camera access denied. Please allow camera access.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.85)
  }

  const handleDetect = async () => {
    setLoading(true)
    const imageData = captureFrame()
    if (!imageData) { setLoading(false); return }
    setCapturedImage(imageData)
    try {
      const res = await analyzeImage({ image: imageData })
      setResult({ type: 'detect', data: res.data })
    } catch (err) {
      setResult({ type: 'error', data: { error: err.message } })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!selectedContact) { alert('Please select a contact first'); return }
    setLoading(true)
    const imageData = captureFrame()
    if (!imageData) { setLoading(false); return }
    setCapturedImage(imageData)
    const contact = contacts.find(c => c.id === selectedContact)
    try {
      const res = await registerFace({
        contact_id: selectedContact,
        contact_name: contact?.name || 'Unknown',
        image: imageData
      })
      setResult({ type: 'register', data: res.data })
      if (res.data.success) loadRegistered()
    } catch (err) {
      setResult({ type: 'error', data: { error: err.message } })
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!selectedContact) { alert('Please select a contact first'); return }
    setLoading(true)
    const imageData = captureFrame()
    if (!imageData) { setLoading(false); return }
    setCapturedImage(imageData)
    try {
      const res = await verifyFace({ contact_id: selectedContact, image: imageData })
      setResult({ type: 'verify', data: res.data })
    } catch (err) {
      setResult({ type: 'error', data: { error: err.message } })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (contactId) => {
    if (!confirm('Delete this face registration?')) return
    await deleteFace(contactId)
    loadRegistered()
  }

  const tabs = [
    { id: 'detect', label: '👁️ Detect' },
    { id: 'register', label: '📸 Register' },
    { id: 'verify', label: '✅ Verify' },
    { id: 'registered', label: '👥 Registered' },
  ]

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">👁️ AI Face Verifier</h1>
          <p className="text-sm text-gray-500 mt-1">
            Module 20 — Computer Vision · OpenCV Haar Cascade · HOG Features · Cosine Similarity · Liveness Detection
          </p>
        </div>

        {/* System info */}
        {info && (
          <div className="bg-gradient-to-r from-indigo-50 to-cyan-50 rounded-2xl border border-indigo-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="text-green-500">●</span>
                <strong>OpenCV {info.opencv_version}</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className={info.cascade_loaded ? 'text-green-500' : 'text-red-500'}>●</span>
                Haar Cascade: {info.cascade_loaded ? 'Loaded ✅' : 'Error ❌'}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-blue-500">●</span>
                Algorithm: {info.algorithm}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-purple-500">●</span>
                Registered: {info.registered_contacts} contacts
              </span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setResult(null); setCapturedImage(null) }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}>{tab.label}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Camera panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">📷 Camera Feed</h2>

              <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '4/3' }}>
                {cameraActive ? (
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                ) : capturedImage ? (
                  <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <p className="text-5xl mb-3">👁️</p>
                      <p className="text-sm">Click "Start Camera" to begin</p>
                    </div>
                  </div>
                )}
                {cameraActive && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    <span className="animate-pulse">●</span> LIVE
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="flex gap-2">
                {!cameraActive ? (
                  <button onClick={startCamera}
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
                    📷 Start Camera
                  </button>
                ) : (
                  <button onClick={stopCamera}
                    className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">
                    ⏹ Stop Camera
                  </button>
                )}
              </div>
            </div>

            {/* Action buttons based on tab */}
            {cameraActive && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                <h2 className="text-sm font-semibold text-gray-700">Actions</h2>

                {(activeTab === 'register' || activeTab === 'verify') && (
                  <div className="space-y-2">
                    <select value={selectedCampaign} onChange={e => handleCampaignChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Select campaign...</option>
                      {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={selectedContact} onChange={e => setSelectedContact(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Select contact...</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                    </select>
                  </div>
                )}

                {activeTab === 'detect' && (
                  <button onClick={handleDetect} disabled={loading}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {loading ? '⏳ Detecting...' : '👁️ Detect Faces'}
                  </button>
                )}
                {activeTab === 'register' && (
                  <button onClick={handleRegister} disabled={loading || !selectedContact}
                    className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                    {loading ? '⏳ Registering...' : '📸 Capture & Register Face'}
                  </button>
                )}
                {activeTab === 'verify' && (
                  <button onClick={handleVerify} disabled={loading || !selectedContact}
                    className="w-full bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
                    {loading ? '⏳ Verifying...' : '✅ Capture & Verify Face'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Results panel */}
          <div className="space-y-4">

            {/* Tab description */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="text-sm">
                {activeTab === 'detect' && (
                  <>
                    <h3 className="font-semibold text-gray-800 mb-2">👁️ Face Detection</h3>
                    <p className="text-gray-500 mb-3">Detects faces in real-time using OpenCV Haar Cascade classifier. Shows face count, bounding boxes, and liveness check (eye detection + texture analysis).</p>
                    <div className="bg-blue-50 rounded-xl p-3 text-xs space-y-1">
                      <p className="font-semibold text-blue-700">How it works:</p>
                      <p className="text-blue-600">1. Haar Cascade scans image at multiple scales</p>
                      <p className="text-blue-600">2. Detects frontal face patterns</p>
                      <p className="text-blue-600">3. Eye cascade checks for real eyes (liveness)</p>
                      <p className="text-blue-600">4. Texture score distinguishes live vs photo</p>
                    </div>
                  </>
                )}
                {activeTab === 'register' && (
                  <>
                    <h3 className="font-semibold text-gray-800 mb-2">📸 Face Registration</h3>
                    <p className="text-gray-500 mb-3">Register a contact's face by capturing their photo. The system extracts HOG (Histogram of Oriented Gradients) features and stores them for future verification.</p>
                    <div className="bg-green-50 rounded-xl p-3 text-xs space-y-1">
                      <p className="font-semibold text-green-700">HOG Feature Extraction:</p>
                      <p className="text-green-600">1. Face region cropped and resized to 64x64</p>
                      <p className="text-green-600">2. Sobel gradients computed (edges)</p>
                      <p className="text-green-600">3. 4x4 cells → 9-bin histograms</p>
                      <p className="text-green-600">4. LBP texture features added</p>
                      <p className="text-green-600">5. Feature vector normalized</p>
                    </div>
                  </>
                )}
                {activeTab === 'verify' && (
                  <>
                    <h3 className="font-semibold text-gray-800 mb-2">✅ Face Verification</h3>
                    <p className="text-gray-500 mb-3">Verify if the person in front of the camera matches the registered contact. Uses cosine similarity between HOG feature vectors.</p>
                    <div className="bg-purple-50 rounded-xl p-3 text-xs space-y-1">
                      <p className="font-semibold text-purple-700">Verification process:</p>
                      <p className="text-purple-600">1. Extract HOG features from live face</p>
                      <p className="text-purple-600">2. Load registered contact features</p>
                      <p className="text-purple-600">3. Cosine similarity comparison</p>
                      <p className="text-purple-600">4. Threshold: 75% → MATCH</p>
                      <p className="text-purple-600">5. Liveness check to prevent photo spoofing</p>
                    </div>
                  </>
                )}
                {activeTab === 'registered' && (
                  <h3 className="font-semibold text-gray-800 mb-2">👥 Registered Contacts ({registeredFaces.length})</h3>
                )}
              </div>
            </div>

            {/* Results */}
            {result && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Results</h3>

                {result.type === 'detect' && (
                  <div>
                    <div className={`rounded-xl p-4 mb-3 ${result.data.faces_found > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className={`text-2xl font-bold ${result.data.faces_found > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {result.data.faces_found} face{result.data.faces_found !== 1 ? 's' : ''} detected
                      </p>
                      {result.data.message && <p className="text-sm text-gray-500 mt-1">{result.data.message}</p>}
                    </div>
                    {result.data.faces?.map((face, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 mb-2">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Face {i+1}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-gray-400">Size:</span> {face.width}x{face.height}px</div>
                          <div><span className="text-gray-400">Area:</span> {face.area}px²</div>
                          <div><span className="text-gray-400">Eyes:</span> {face.liveness?.eyes_detected} detected</div>
                          <div><span className="text-gray-400">Texture:</span> {face.liveness?.texture_score}</div>
                          <div className="col-span-2">
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${face.liveness?.is_live ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {face.liveness?.is_live ? '✅ Live person' : '❌ May be photo'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {result.data.annotated_image && (
                      <img src={`data:image/jpeg;base64,${result.data.annotated_image}`}
                        className="w-full rounded-xl mt-2" alt="Annotated" />
                    )}
                  </div>
                )}

                {result.type === 'register' && (
                  <div>
                    <div className={`rounded-xl p-4 mb-3 ${result.data.success ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className={`text-lg font-bold ${result.data.success ? 'text-green-600' : 'text-red-600'}`}>
                        {result.data.success ? '✅ Face registered!' : '❌ Registration failed'}
                      </p>
                      {result.data.error && <p className="text-sm text-red-500 mt-1">{result.data.error}</p>}
                      {result.data.success && (
                        <p className="text-sm text-gray-600 mt-1">
                          {result.data.contact_name} registered at {new Date(result.data.registered_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {result.data.crop_image && (
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-2">Registered face crop:</p>
                        <img src={`data:image/jpeg;base64,${result.data.crop_image}`}
                          className="w-24 h-24 rounded-full mx-auto border-4 border-green-300 object-cover" alt="Registered face" />
                      </div>
                    )}
                  </div>
                )}

                {result.type === 'verify' && (
                  <div>
                    <div className={`rounded-xl p-5 text-center mb-3 ${result.data.verified ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="text-5xl mb-2">{result.data.verified ? '✅' : '❌'}</p>
                      <p className={`text-xl font-bold ${result.data.verified ? 'text-green-600' : 'text-red-600'}`}>
                        {result.data.decision}
                      </p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{result.data.similarity}%</p>
                      <p className="text-sm text-gray-500">Similarity (threshold: {result.data.threshold}%)</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
                      <div className={`h-3 rounded-full ${result.data.verified ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${result.data.similarity}%` }} />
                    </div>
                    {result.data.liveness && (
                      <div className="bg-gray-50 rounded-xl p-3 text-xs grid grid-cols-2 gap-2 mb-3">
                        <div><span className="text-gray-400">Eyes:</span> {result.data.liveness.eyes_detected}</div>
                        <div><span className="text-gray-400">Live:</span> {result.data.liveness.is_live ? 'Yes ✅' : 'No ❌'}</div>
                        <div><span className="text-gray-400">Texture:</span> {result.data.liveness.texture_score}</div>
                        <div><span className="text-gray-400">Confidence:</span> {result.data.liveness.confidence}%</div>
                      </div>
                    )}
                    {result.data.annotated_image && (
                      <img src={`data:image/jpeg;base64,${result.data.annotated_image}`}
                        className="w-full rounded-xl" alt="Verification result" />
                    )}
                  </div>
                )}

                {result.type === 'error' && (
                  <div className="bg-red-50 rounded-xl p-4">
                    <p className="text-red-600 text-sm">⚠️ {result.data.error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Registered faces list */}
            {activeTab === 'registered' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                {registeredFaces.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-3">👤</p>
                    <p className="text-gray-400 text-sm">No faces registered yet</p>
                    <p className="text-gray-300 text-xs">Go to Register tab to add contacts</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {registeredFaces.map((face, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                            {face.contact_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{face.contact_name}</p>
                            <p className="text-xs text-gray-400">
                              Registered: {new Date(face.registered_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => handleDelete(face.contact_id)}
                          className="text-red-400 hover:text-red-600 text-xs">
                          🗑 Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}