import { Link } from 'react-router-dom'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">

          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">V</div>
              <span className="text-lg font-bold text-indigo-600">VoiceIQ</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              AI-Powered Bulk Call Simulation & Analytics Web Application. Built for SPPU Final Year Project 2026.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Navigation</p>
            <div className="space-y-2">
              {[
                { to: '/dashboard', label: 'Dashboard' },
                { to: '/campaigns', label: 'Campaigns' },
                { to: '/transcripts', label: 'Transcripts' },
                { to: '/recordings', label: 'Recordings' },
              ].map(link => (
                <Link key={link.to} to={link.to} className="block text-xs text-gray-500 hover:text-indigo-600 transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">ML & AI</p>
            <div className="space-y-2">
              {[
                { to: '/ml', label: '🤖 Sentiment Analysis' },
                { to: '/rf-predictor', label: '🌲 RF Success Predictor' },
                { to: '/nlp', label: '📝 NLP Extractor' },
                { to: '/churn', label: '🔵 Churn Predictor' },
                { to: '/lstm', label: '🧠 LSTM Quality Scorer' },
                { to: '/vision', label: '👁️ Face Verifier' },
              ].map(link => (
                <Link key={link.to} to={link.to} className="block text-xs text-gray-500 hover:text-indigo-600 transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Tech Stack</p>
            <div className="space-y-1.5">
              {[
                '⚛️ React 18 + Vite',
                '🐍 Python Flask',
                '🤖 Groq LLaMA 3.3',
                '🎤 Web Speech API',
                '🧠 LSTM + scikit-learn',
                '👁️ OpenCV + HOG',
                '🗄️ Supabase PostgreSQL',
              ].map((tech, i) => (
                <p key={i} className="text-xs text-gray-400">{tech}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <p className="text-xs text-gray-400">
              © {year} VoiceIQ · Built by <span className="text-indigo-600 font-medium">Anjali</span>
            </p>
            <span className="text-gray-200">|</span>
            <p className="text-xs text-gray-400">SPPU Final Year Project 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Powered by</span>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">Groq AI</span>
            <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">scikit-learn</span>
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">OpenCV</span>
            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">TensorFlow</span>
          </div>
        </div>
      </div>
    </footer>
  )
}