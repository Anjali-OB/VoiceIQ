import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logoutUser } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logoutUser()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <span className="text-xl font-semibold text-indigo-600">VoiceIQ</span>
        <div className="flex gap-6 text-sm text-gray-600">
          <Link to="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
          <Link to="/campaigns" className="hover:text-indigo-600">Campaigns</Link>
          <Link to="/transcripts" className="hover:text-indigo-600">Transcripts</Link>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500">Hi, {user?.name}</span>
        <button
          onClick={handleLogout}
          className="text-red-500 hover:text-red-700"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}