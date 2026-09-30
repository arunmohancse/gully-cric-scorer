import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

export default function Navbar() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <img src="/logo.png" alt="Gully League" className="w-9 h-9 rounded-full object-cover" />
        <span className="text-xl font-bold text-primary-500">GullyCricScorer</span>
      </Link>
      {user && (
        <div className="flex items-center gap-4">
          <Link to="/matches" className="text-gray-300 hover:text-white text-sm">Matches</Link>
          <Link to="/teams" className="text-gray-300 hover:text-white text-sm">Teams</Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}
