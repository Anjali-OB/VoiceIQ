import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const register = (data) => API.post('/api/auth/register', data)
export const login = (data) => API.post('/api/auth/login', data)

export const getCampaigns = () => API.get('/api/campaigns/')
export const createCampaign = (data) => API.post('/api/campaigns/', data)
export const updateCampaign = (id, data) => API.put(`/api/campaigns/${id}`, data)
export const deleteCampaign = (id) => API.delete(`/api/campaigns/${id}`)

export const getContacts = (campaignId) => API.get(`/api/contacts/${campaignId}`)
export const bulkCreateContacts = (data) => API.post('/api/contacts/bulk', data)
export const updateContactStatus = (id, status) => API.put(`/api/contacts/${id}/status`, { status })

export const saveTranscript = (data) => API.post('/api/transcripts/', data)
export const getTranscriptsByCampaign = (id) => API.get(`/api/transcripts/campaign/${id}`)
export const getAllTranscripts = () => API.get('/api/transcripts/')

export const aiRespond = (data) => API.post('/api/ai/respond', data)
export const aiSummarize = (data) => API.post('/api/ai/summarize', data)

export const generateScript = (data) => API.post('/api/ai/generate-script', data)

export const updateContactTag = (id, group_name) => API.put(`/api/contacts/${id}/tag`, { group_name })

export const getCampaignReport = (campaignId) => API.get(`/api/transcripts/report/${campaignId}`)

export const getProfile = () => API.get('/api/auth/profile')
export const updateProfile = (data) => API.put('/api/auth/profile', data)
export const getStats = () => API.get('/api/auth/stats')

export const detectEmotion = (data) => API.post('/api/ai/detect-emotion', data)
export const adaptiveRespond = (data) => API.post('/api/ai/adaptive-respond', data)

export const predictOutcomes = (data) => API.post('/api/ai/predict-outcomes', data)

export const generateFeedbackMessage = (data) => API.post('/api/ai/feedback-message', data)
export const trainModel = () => API.post('/api/ml/train')
export const mlPredictSentiment = (data) => API.post('/api/ml/predict-sentiment', data)
export const getMLStats = () => API.get('/api/ml/stats')
export const analyzeWithML = (data) => API.post('/api/ml/analyze-campaign', data)
export const forgotPassword = (data) => API.post('/api/auth/forgot-password', data)

export const trainRFModel = () => API.post('/api/ml/rf/train')
export const getRFStats = () => API.get('/api/ml/rf/stats')
export const rfPredict = (data) => API.post('/api/ml/rf/predict', data)
export const rfPredictBatch = (data) => API.post('/api/ml/rf/predict-batch', data)
export const rfCampaignAnalysis = (data) => API.post('/api/ml/rf/campaign-analysis', data)

// Computer Vision
export const getVisionInfo = () => API.get('/api/vision/info')
export const analyzeImage = (data) => API.post('/api/vision/analyze', data)
export const registerFace = (data) => API.post('/api/vision/register', data)
export const verifyFace = (data) => API.post('/api/vision/verify', data)
export const getRegisteredFaces = () => API.get('/api/vision/registered')
export const deleteFace = (contactId) => API.delete(`/api/vision/delete/${contactId}`)