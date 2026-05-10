import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { GoogleLogin } from '@react-oauth/google'
import axios from 'axios'

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL })

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await login(form)
      loginUser(res.data.user, res.data.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-xl">V</span>
            </div>
            <span className="text-white text-2xl font-bold">VoiceIQ</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            AI-Powered Bulk<br />Call Simulator
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed mb-12">
            Automate outbound campaigns with emotionally intelligent AI that speaks, listens, and adapts to every contact.
          </p>
          <div className="space-y-4">
            {[
              { icon: '🧠', text: 'Emotion-adaptive AI conversations' },
              { icon: '🔮', text: 'Predict call outcomes before dialing' },
              { icon: '📊', text: 'Real-time analytics and sentiment tracking' },
              { icon: '🌐', text: 'Multi-language support — English, Hindi, Marathi' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-2xl">{f.icon}</span>
                <span className="text-indigo-100 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-indigo-300 text-sm">Built for SPPU · Powered by Groq LLaMA 3.3</p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="text-indigo-600 text-xl font-bold">VoiceIQ</span>
          </div>

          <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome back</h2>
          <p className="text-gray-500 mb-8">Sign in to your VoiceIQ account</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
              <input
                type="email" required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-sm text-indigo-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password" required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 font-medium hover:underline">Create one free</Link>
          </p>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gray-50 px-4 text-xs text-gray-400">or continue with</span>
            </div>
          </div>

          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                const res = await API.post('/api/auth/google', {
                  token: credentialResponse.credential
                })
                loginUser(res.data.user, res.data.token)
                navigate('/dashboard')
              } catch (err) {
                setError('Google login failed. Try again.')
              }
            }}
            onError={() => setError('Google login failed')}
            width="100%"
            text="continue_with"
            shape="rectangular"
          />

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-400">
              🔒 Secured with JWT Authentication · No credit card required
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}