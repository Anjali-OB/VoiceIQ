import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import Transcripts from './pages/Transcripts'
import Simulator from './pages/Simulator'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
        <Route path="/transcripts" element={<ProtectedRoute><Transcripts /></ProtectedRoute>} />
        <Route path="/simulator/:campaignId" element={<ProtectedRoute><Simulator /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}