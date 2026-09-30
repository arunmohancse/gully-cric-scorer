import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/common/Navbar'
import LoadingSpinner from '../components/common/LoadingSpinner'

export default function ScorecardPage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: match } = await supabase
        .from('matches')
        .select('*, match_teams(team_id, innings_no, teams(id, name, players(*)))')
        .eq('id', id).single()

      const { data: inningsList } = await supabase
        .from('innings')
        .select('*, deliveries(*)')
        .eq('match_id', id)
        .order('innings_number')

      setData({ match, inningsList: inningsList || [] })
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-1">{data?.match?.title}</h1>
        <p className="text-gray-400 text-sm mb-6">{data?.match?.venue}</p>

        {data?.inningsList?.map(innings => {
          const battingTeam = data.match?.match_teams?.find(mt => mt.team_id === innings.batting_team_id)?.teams
          const deliveries = innings.deliveries || []
          const totalRuns = deliveries.reduce((s, d) => s + (d.runs || 0) + (d.extras_runs || 0), 0)
          const totalWickets = deliveries.filter(d => d.is_wicket).length
          const validBalls = deliveries.filter(d => !d.extras_type || d.extras_type === 'bye' || d.extras_type === 'leg-bye').length

          return (
            <div key={innings.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-white mb-1">{battingTeam?.name} innings</h3>
              <p className="text-3xl font-bold text-primary-500 mb-3">
                {totalRuns}/{totalWickets}{' '}
                <span className="text-lg text-gray-400">({Math.floor(validBalls / 6)}.{validBalls % 6} ov)</span>
              </p>
              <div className="text-xs text-gray-500">{deliveries.length} deliveries recorded</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
