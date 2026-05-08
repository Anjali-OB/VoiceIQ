import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await forgotPassword({ email })
      setTempPassword(res.data.temp_password)
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.error || 'No account found with this email')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
                <p className="text-gray-500 text-sm">
                  Enter your registered email and we'll generate a temporary password for you
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
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
                  {loading ? 'Generating password...' : 'Reset my password'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Password reset!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Your temporary password has been generated and saved. Use it to login now.
              </p>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-500 mb-2">Your temporary password:</p>
                <p className="text-2xl font-bold text-indigo-700 font-mono tracking-widest">
                  {tempPassword}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className="w-full border border-indigo-300 text-indigo-600 py-2 rounded-xl text-sm hover:bg-indigo-50 mb-4"
              >
                {copied ? '✅ Copied!' : '📋 Copy password'}
              </button>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-left">
                <p className="text-xs text-yellow-700 font-semibold mb-1">⚠️ Important:</p>
                <p className="text-xs text-yellow-600">
                  After logging in with this temporary password, go to Settings → Profile → Change password to set your own password.
                </p>
              </div>
              <Link
                to="/login"
                className="block w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700"
              >
                Login with temporary password →
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