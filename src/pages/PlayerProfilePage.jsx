import Navbar from '../components/common/Navbar'
import { useAuthStore } from '../store/authStore'

export default function PlayerProfilePage() {
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-3xl mx-auto mb-4">
            {user?.email?.charAt(0)?.toUpperCase()}
          </div>
          <h1 className="text-xl font-bold text-white">{user?.email}</h1>
          <p className="text-gray-400 text-sm mt-1">Member since {new Date(user?.created_at).getFullYear()}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Matches', value: '-' },
            { label: 'Runs', value: '-' },
            { label: 'Wickets', value: '-' },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
