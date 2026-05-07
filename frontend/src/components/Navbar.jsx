import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logoutUser, darkMode, toggleDarkMode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logoutUser()
    navigate('/login')
  }

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/campaigns', label: 'Campaigns' },
    { to: '/transcripts', label: 'Transcripts' },
    { to: '/ml', label: '🤖 ML' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">V</div>
          <span className="text-lg font-semibold text-indigo-600">VoiceIQ</span>
        </Link>
        <div className="hidden md:flex gap-1">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive(link.to)
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
              }`}
            >{link.label}</Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-lg hover:bg-gray-50 transition-colors"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        <Link to="/settings"
          className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
            isActive('/settings')
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
          }`}
        >⚙️ Settings</Link>

        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm text-gray-700 hidden md:block">{user?.name}</span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 ml-1">
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}