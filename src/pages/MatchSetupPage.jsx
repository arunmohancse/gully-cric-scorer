import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/common/Navbar'
import LoadingSpinner from '../components/common/LoadingSpinner'

export default function MatchSetupPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const [teams, setTeams] = useState([])
  const [tossWinner, setTossWinner] = useState('')
  const [tossDecision, setTossDecision] = useState('bat')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*, match_teams(team_id, innings_no, teams(id, name))')
        .eq('id', id)
        .single()
      setMatch(matchData)
      setTeams(matchData?.match_teams?.map(mt => mt.teams) || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleStart() {
    if (!tossWinner) return
    setSaving(true)
    await supabase.from('matches').update({
      toss_winner: tossWinner,
      toss_decision: tossDecision,
      status: 'live',
    }).eq('id', id)

    const battingTeamId = tossDecision === 'bat' ? tossWinner :
      teams.find(t => t.id !== tossWinner)?.id
    const bowlingTeamId = teams.find(t => t.id !== battingTeamId)?.id

    await supabase.from('innings').insert({
      match_id: id,
      batting_team_id: battingTeamId,
      bowling_team_id: bowlingTeamId,
      innings_number: 1,
      status: 'live',
    })

    navigate(`/scoring/${id}`)
    setSaving(false)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-2">{match?.title}</h1>
        <p className="text-gray-400 mb-6">Toss & Setup</p>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-2">Who won the toss?</label>
            <div className="flex gap-3">
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => setTossWinner(team.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    tossWinner === team.id
                      ? 'bg-primary-600 border-primary-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">Elected to</label>
            <div className="flex gap-3">
              {['bat', 'field'].map(d => (
                <button
                  key={d}
                  onClick={() => setTossDecision(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors border ${
                    tossDecision === d
                      ? 'bg-primary-600 border-primary-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!tossWinner || saving}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mt-2"
          >
            {saving ? 'Starting...' : 'Start Match 🏏'}
          </button>
        </div>
      </div>
    </div>
  )
}
