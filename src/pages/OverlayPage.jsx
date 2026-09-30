import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function isValidBall(extrasType) {
  return !extrasType || extrasType === 'bye' || extrasType === 'leg-bye'
}

function ballLabel(d) {
  if (d.is_wicket) return 'W'
  if (d.extras_type === 'wide') return 'Wd'
  if (d.extras_type === 'no-ball') return 'Nb'
  if (d.extras_type === 'bye') return 'B'
  if (d.extras_type === 'leg-bye') return 'Lb'
  return d.runs
}

export default function OverlayPage() {
  const { id } = useParams()

  const [innings, setInnings] = useState(null)
  const [battingTeam, setBattingTeam] = useState('')
  const [deliveries, setDeliveries] = useState([])
  const [striker, setStriker] = useState(null)
  const [nonStriker, setNonStriker] = useState(null)
  const [bowler, setBowler] = useState(null)

  useEffect(() => {
    loadAll()

    // Realtime: new delivery
    const deliveryCh = supabase
      .channel(`overlay-del-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deliveries' }, () => loadAll())
      .subscribe()

    // Realtime: innings update (striker/non-striker/bowler change)
    const inningsCh = supabase
      .channel(`overlay-inn-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'innings' }, () => loadAll())
      .subscribe()

    return () => {
      supabase.removeChannel(deliveryCh)
      supabase.removeChannel(inningsCh)
    }
  }, [id])

  async function loadAll() {
    const { data: matchData } = await supabase
      .from('matches')
      .select('*, match_teams(team_id, teams(id, name))')
      .eq('id', id).single()

    const { data: inningsData } = await supabase
      .from('innings')
      .select('*')
      .eq('match_id', id)
      .eq('status', 'live')
      .single()

    if (!inningsData) return

    setInnings(inningsData)
    setBattingTeam(matchData?.match_teams?.find(mt => mt.team_id === inningsData.batting_team_id)?.teams?.name || '')

    const { data: dels } = await supabase
      .from('deliveries')
      .select('*')
      .eq('innings_id', inningsData.id)
      .order('created_at', { ascending: true })
    setDeliveries(dels || [])

    // Load current players (with profiles for display names)
    if (inningsData.current_striker_id) {
      const { data: p } = await supabase.from('players').select('*, profiles(display_name)').eq('id', inningsData.current_striker_id).single()
      setStriker(p)
    } else setStriker(null)

    if (inningsData.current_non_striker_id) {
      const { data: p } = await supabase.from('players').select('*, profiles(display_name)').eq('id', inningsData.current_non_striker_id).single()
      setNonStriker(p)
    } else setNonStriker(null)

    if (inningsData.current_bowler_id) {
      const { data: p } = await supabase.from('players').select('*, profiles(display_name)').eq('id', inningsData.current_bowler_id).single()
      setBowler(p)
    } else setBowler(null)
  }

  const score = useMemo(() => deliveries.reduce((acc, d) => {
    if (d.is_wicket) acc.wickets++
    acc.runs += (d.runs || 0) + (d.extras_runs || 0)
    if (isValidBall(d.extras_type)) acc.balls++
    return acc
  }, { runs: 0, wickets: 0, balls: 0 }), [deliveries])

  // Batsman stats from deliveries
  const batsmanStats = useMemo(() => {
    const s = {}
    deliveries.forEach(d => {
      if (!d.batsman_id) return
      if (!s[d.batsman_id]) s[d.batsman_id] = { runs: 0, balls: 0 }
      if (isValidBall(d.extras_type)) s[d.batsman_id].balls++
      if (!d.extras_type) s[d.batsman_id].runs += d.runs || 0
    })
    return s
  }, [deliveries])

  // Current over deliveries
  const currentOverDeliveries = useMemo(() => {
    const overNo = Math.floor(score.balls / 6)
    return deliveries.filter(d => d.over_number === overNo)
  }, [deliveries, score.balls])

  const overs = `${Math.floor(score.balls / 6)}.${score.balls % 6}`
  const crr = score.balls > 0 ? ((score.runs / score.balls) * 6).toFixed(1) : '0.0'

  function getName(player) {
    return player?.profiles?.display_name || player?.name || '—'
  }

  function statLine(player) {
    const s = batsmanStats[player?.id]
    if (!s) return '0(0)'
    return `${s.runs}(${s.balls})`
  }

  return (
    <div
      style={{ background: 'transparent' }}
      className="w-screen h-screen flex flex-col justify-end p-4"
    >
      <div className="w-full bg-black/85 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">

        {/* Main score bar */}
        <div className="flex items-center gap-4 px-4 py-2.5">

          {/* Live badge */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400 text-xs font-bold tracking-wide">LIVE</span>
          </div>

          <div className="w-px h-5 bg-white/10" />

          {/* Team + Score */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-gray-300 text-sm font-medium">{battingTeam}</span>
            <span className="text-white text-2xl font-bold">{score.runs}/{score.wickets}</span>
          </div>

          <div className="w-px h-5 bg-white/10" />

          {/* Overs */}
          <span className="text-gray-300 text-sm flex-shrink-0">{overs} ov</span>

          <div className="w-px h-5 bg-white/10" />

          {/* Batsmen */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {striker && (
              <span className="text-white text-sm font-medium truncate">
                {getName(striker)}* <span className="text-yellow-400 font-bold">{statLine(striker)}</span>
              </span>
            )}
            {nonStriker && (
              <span className="text-gray-400 text-sm truncate">
                {getName(nonStriker)} <span className="text-gray-300">{statLine(nonStriker)}</span>
              </span>
            )}
          </div>

          <div className="w-px h-5 bg-white/10" />

          {/* CRR */}
          <span className="text-gray-400 text-xs flex-shrink-0">CRR <span className="text-white font-semibold">{crr}</span></span>
        </div>

        {/* Current over balls */}
        {currentOverDeliveries.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-1.5 bg-white/5 border-t border-white/5">
            <span className="text-gray-500 text-xs mr-1">Over {Math.floor(score.balls / 6) + 1}:</span>
            {currentOverDeliveries.map((d, i) => (
              <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                d.is_wicket ? 'bg-red-500 text-white' :
                d.runs === 4 ? 'bg-blue-500 text-white' :
                d.runs === 6 ? 'bg-yellow-400 text-black' :
                d.extras_type ? 'bg-orange-500 text-white' :
                'bg-gray-700 text-white'
              }`}>
                {ballLabel(d)}
              </span>
            ))}
            {bowler && (
              <span className="text-gray-500 text-xs ml-auto">
                {getName(bowler)} bowling
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
