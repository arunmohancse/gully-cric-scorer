import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/common/Navbar'

export default function HomePage() {
  const { profile, user } = useAuthStore()
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Player'

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {displayName}!</h1>
          <p className="text-gray-500 text-sm">{user?.email}</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Link
            to="/matches/new"
            className="bg-primary-600 hover:bg-primary-700 rounded-2xl p-6 flex items-center gap-4 transition-colors"
          >
            <span className="text-4xl">🏏</span>
            <div>
              <h2 className="text-xl font-bold text-white">New Match</h2>
              <p className="text-primary-100 text-sm">Create and score a new match</p>
            </div>
          </Link>

          <Link
            to="/matches"
            className="bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl p-6 flex items-center gap-4 transition-colors"
          >
            <span className="text-4xl">📋</span>
            <div>
              <h2 className="text-xl font-bold text-white">My Matches</h2>
              <p className="text-gray-400 text-sm">View all your matches</p>
            </div>
          </Link>

          <Link
            to="/profile"
            className="bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl p-6 flex items-center gap-4 transition-colors"
          >
            <span className="text-4xl">👤</span>
            <div>
              <h2 className="text-xl font-bold text-white">My Profile</h2>
              <p className="text-gray-400 text-sm">View your stats and profile</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
