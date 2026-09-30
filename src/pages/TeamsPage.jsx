import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/common/Navbar'
import LoadingSpinner from '../components/common/LoadingSpinner'

export default function TeamsPage() {
  const { user } = useAuthStore()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('teams')
        .select('*, players(*)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
      setTeams(data || [])
      setLoading(false)
    }
    if (user) load()
  }, [user])

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">My Teams</h1>
          <Link
            to="/teams/new"
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Team
          </Link>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">👕</p>
            <p className="text-gray-400">No teams yet. Create your first team!</p>
            <Link
              to="/teams/new"
              className="inline-block mt-4 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Create Team
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map(team => (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-primary-500 transition-colors"
              >
                <div>
                  <h3 className="font-semibold text-white">{team.name}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{team.players?.length || 0} players</p>
                </div>
                <span className="text-gray-600">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
