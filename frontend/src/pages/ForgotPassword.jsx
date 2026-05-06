import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // Generate a temporary password suggestion
    const tempPass = 'VoiceIQ@' + Math.floor(1000 + Math.random() * 9000)
    setNewPassword(tempPass)
    setTimeout(() => {
      setLoading(false)
      setSent(true)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">V</span>
          </div>
          <span className="text-indigo-600 text-xl font-bold">VoiceIQ</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          {!sent ? (
            <>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🔑</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Forgot password?</h2>
                <p className="text-gray-500 text-sm">Enter your email and we'll help you reset it</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                  <input
                    type="email" required
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Reset password'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Password reset!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Your temporary password has been generated. Please login and change it in Settings.
              </p>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-500 mb-1">Your temporary password:</p>
                <p className="text-lg font-bold text-indigo-700 font-mono">{newPassword}</p>
              </div>
              <p className="text-xs text-gray-400 mb-6">
                Go to Settings → Change password after logging in
              </p>
              <Link
                to="/login"
                className="block w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700"
              >
                Back to login
              </Link>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-4">
            <Link to="/login" className="text-indigo-600 hover:underline">← Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}