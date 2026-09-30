import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/common/Navbar'
import LoadingSpinner from '../components/common/LoadingSpinner'

const EXTRAS = ['wide', 'no-ball', 'bye', 'leg-bye']
const WICKET_TYPES = ['bowled', 'caught', 'lbw', 'run-out', 'stumped', 'hit-wicket']

export default function ScoringPage() {
  const { id } = useParams()
  const [innings, setInnings] = useState(null)
  const [match, setMatch] = useState(null)
  const [players, setPlayers] = useState({ batting: [], bowling: [] })
  const [deliveries, setDeliveries] = useState([])
  const [striker, setStriker] = useState(null)
  const [bowler, setBowler] = useState(null)
  const [loading, setLoading] = useState(true)
  const [extras, setExtras] = useState(null)
  const [wicket, setWicket] = useState(false)
  const [wicketType, setWicketType] = useState('bowled')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*, match_teams(team_id, innings_no, teams(id, name, players(*)))')
        .eq('id', id).single()

      const { data: inningsData } = await supabase
        .from('innings')
        .select('*')
        .eq('match_id', id)
        .eq('status', 'live')
        .single()

      const { data: deliveriesData } = await supabase
        .from('deliveries')
        .select('*')
        .eq('innings_id', inningsData?.id)
        .order('created_at', { ascending: true })

      setMatch(matchData)
      setInnings(inningsData)
      setDeliveries(deliveriesData || [])

      const battingTeam = matchData?.match_teams?.find(mt => mt.team_id === inningsData?.batting_team_id)
      const bowlingTeam = matchData?.match_teams?.find(mt => mt.team_id === inningsData?.bowling_team_id)

      setPlayers({
        batting: battingTeam?.teams?.players || [],
        bowling: bowlingTeam?.teams?.players || [],
      })

      setLoading(false)
    }
    load()
  }, [id])

  const score = deliveries.reduce((acc, d) => {
    if (d.is_wicket) acc.wickets++
    acc.runs += (d.runs || 0) + (d.extras_runs || 0)
    if (!d.extras_type || d.extras_type === 'bye' || d.extras_type === 'leg-bye') acc.balls++
    return acc
  }, { runs: 0, wickets: 0, balls: 0 })

  const overs = `${Math.floor(score.balls / 6)}.${score.balls % 6}`

  async function recordDelivery(runs) {
    if (!innings || saving) return
    setSaving(true)

    const isValidBall = !extras || extras === 'bye' || extras === 'leg-bye'
    const delivery = {
      innings_id: innings.id,
      over_number: Math.floor(score.balls / 6),
      ball_number: score.balls % 6,
      batsman_id: striker?.id || null,
      bowler_id: bowler?.id || null,
      runs,
      extras_type: extras,
      extras_runs: extras ? 1 : 0,
      is_wicket: wicket,
      wicket_type: wicket ? wicketType : null,
      is_valid_ball: isValidBall,
    }

    const { data: newDelivery } = await supabase
      .from('deliveries')
      .insert(delivery)
      .select().single()

    setDeliveries(prev => [...prev, newDelivery])
    setExtras(null)
    setWicket(false)

    await supabase.from('innings').update({
      total_runs: score.runs + runs + (extras ? 1 : 0),
      total_wickets: score.wickets + (wicket ? 1 : 0),
      total_overs: isValidBall ? (score.balls + 1) / 6 : score.balls / 6,
    }).eq('id', innings.id)

    setSaving(false)
  }

  async function undoLast() {
    if (deliveries.length === 0) return
    const last = deliveries[deliveries.length - 1]
    await supabase.from('deliveries').delete().eq('id', last.id)
    setDeliveries(prev => prev.slice(0, -1))
  }

  if (loading) return <LoadingSpinner />

  const battingTeam = match?.match_teams?.find(mt => mt.team_id === innings?.batting_team_id)?.teams
  const overlayUrl = `${window.location.origin}/overlay/${id}`

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">{battingTeam?.name} batting</p>
              <p className="text-4xl font-bold text-white">{score.runs}/{score.wickets}</p>
              <p className="text-gray-400 text-sm">{overs} overs</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">OBS Overlay</p>
              <button
                onClick={() => navigator.clipboard.writeText(overlayUrl)}
                className="text-xs text-primary-500 hover:underline"
              >
                Copy Overlay URL
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            {deliveries.slice(-6).map((d, i) => (
              <span key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                d.is_wicket ? 'bg-red-500/20 border-red-500 text-red-400' :
                d.runs === 4 ? 'bg-blue-500/20 border-blue-500 text-blue-400' :
                d.runs === 6 ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                d.extras_type ? 'bg-orange-500/20 border-orange-500 text-orange-400' :
                'bg-gray-800 border-gray-700 text-gray-300'
              }`}>
                {d.is_wicket ? 'W' : d.extras_type ? d.extras_type[0].toUpperCase() : d.runs}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">Striker *</p>
            <select
              value={striker?.id || ''}
              onChange={e => setStriker(players.batting.find(p => p.id === e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none"
            >
              <option value="">Select</option>
              {players.batting.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">Bowler</p>
            <select
              value={bowler?.id || ''}
              onChange={e => setBowler(players.bowling.find(p => p.id === e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none"
            >
              <option value="">Select</option>
              {players.bowling.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mb-3 flex-wrap">
          {EXTRAS.map(e => (
            <button
              key={e}
              onClick={() => setExtras(extras === e ? null : e)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                extras === e ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-gray-800 border-gray-700 text-gray-400'
              }`}
            >
              {e}
            </button>
          ))}
          <button
            onClick={() => setWicket(!wicket)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              wicket ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
          >
            Wicket
          </button>
        </div>

        {wicket && (
          <div className="mb-3">
            <select
              value={wicketType}
              onChange={e => setWicketType(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
            >
              {WICKET_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-4">
          {[0, 1, 2, 3, 4, 5, 6].map(runs => (
            <button
              key={runs}
              onClick={() => recordDelivery(runs)}
              disabled={saving}
              className={`py-4 rounded-xl text-xl font-bold transition-colors disabled:opacity-50 ${
                runs === 4 ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                runs === 6 ? 'bg-yellow-500 hover:bg-yellow-600 text-black' :
                'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
              }`}
            >
              {runs}
            </button>
          ))}
          <button
            onClick={undoLast}
            className="py-4 rounded-xl text-sm font-medium bg-gray-900 hover:bg-gray-800 text-gray-400 border border-gray-700"
          >
            ↩ Undo
          </button>
        </div>
      </div>
    </div>
  )
}
