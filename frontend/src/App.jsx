import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import Transcripts from './pages/Transcripts'
import Simulator from './pages/Simulator'
import ProtectedRoute from './components/ProtectedRoute'
import Report from './pages/Report'
import Settings from './pages/Settings'
import Predictor from './pages/Predictor'
import ForgotPassword from './pages/ForgotPassword'
import MLAnalytics from './pages/MLAnalytics'
import Recordings from './pages/Recordings'
import RFPredictor from './pages/RFPredictor'
import NLPAnalytics from './pages/NLPAnalytics'
import ChurnPredictor from './pages/ChurnPredictor'
import LSTMQuality from './pages/LSTMQuality'
import FaceVerifier from './pages/FaceVerifier'

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
        <Route path="/report/:campaignId" element={<ProtectedRoute><Report /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/predictor/:campaignId" element={<ProtectedRoute><Predictor /></ProtectedRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/ml" element={<ProtectedRoute><MLAnalytics /></ProtectedRoute>} />
        <Route path="/recordings" element={<ProtectedRoute><Recordings /></ProtectedRoute>} />
        <Route path="/rf-predictor" element={<ProtectedRoute><RFPredictor /></ProtectedRoute>} />
        <Route path="/nlp" element={<ProtectedRoute><NLPAnalytics /></ProtectedRoute>} />
        <Route path="/churn" element={<ProtectedRoute><ChurnPredictor /></ProtectedRoute>} />
        <Route path="/lstm" element={<ProtectedRoute><LSTMQuality /></ProtectedRoute>} />
        <Route path="/vision" element={<ProtectedRoute><FaceVerifier /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}