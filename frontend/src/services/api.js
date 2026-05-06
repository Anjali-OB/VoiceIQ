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