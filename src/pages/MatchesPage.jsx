import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/common/Navbar'
import MatchCard from '../components/matches/MatchCard'
import LoadingSpinner from '../components/common/LoadingSpinner'

export default function MatchesPage() {
  const { user } = useAuthStore()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('matches')
        .select('*, match_teams(team_id, innings_no, teams(name))')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
      setMatches(data || [])
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
          <h1 className="text-2xl font-bold text-white">My Matches</h1>
          <Link
            to="/matches/new"
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Match
          </Link>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🏏</p>
            <p className="text-gray-400">No matches yet. Create your first match!</p>
            <Link
              to="/matches/new"
              className="inline-block mt-4 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Create Match
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map(match => <MatchCard key={match.id} match={match} />)}
          </div>
        )}
      </div>
    </div>
  )
}
