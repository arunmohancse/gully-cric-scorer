import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function OverlayPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const style = searchParams.get('style') || '1'

  const [score, setScore] = useState({ runs: 0, wickets: 0, balls: 0 })
  const [battingTeam, setBattingTeam] = useState('')
  const [lastBalls, setLastBalls] = useState([])

  useEffect(() => {
    async function loadInitial() {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*, match_teams(team_id, innings_no, teams(id, name))')
        .eq('id', id).single()

      const { data: inningsData } = await supabase
        .from('innings')
        .select('*')
        .eq('match_id', id)
        .eq('status', 'live')
        .single()

      if (!inningsData) return

      const batting = matchData?.match_teams?.find(mt => mt.team_id === inningsData.batting_team_id)?.teams?.name
      setBattingTeam(batting || '')

      const { data: deliveries } = await supabase
        .from('deliveries')
        .select('*')
        .eq('innings_id', inningsData.id)
        .order('created_at', { ascending: true })

      computeScore(deliveries || [])
    }

    function computeScore(deliveries) {
      const s = deliveries.reduce((acc, d) => {
        if (d.is_wicket) acc.wickets++
        acc.runs += (d.runs || 0) + (d.extras_runs || 0)
        if (!d.extras_type || d.extras_type === 'bye' || d.extras_type === 'leg-bye') acc.balls++
        return acc
      }, { runs: 0, wickets: 0, balls: 0 })
      setScore(s)
      setLastBalls(deliveries.slice(-6))
    }

    loadInitial()

    const channel = supabase
      .channel(`overlay-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deliveries' }, () => {
        loadInitial()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [id])

  const overs = `${Math.floor(score.balls / 6)}.${score.balls % 6}`
  const crr = score.balls > 0 ? ((score.runs / score.balls) * 6).toFixed(1) : '0.0'

  if (style === '2') {
    return (
      <div style={{ background: 'transparent' }} className="p-2">
        <div className="bg-black/80 backdrop-blur rounded-xl p-3 w-64 border border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white font-bold text-sm">{battingTeam}</span>
            <span className="text-green-400 text-xs">LIVE</span>
          </div>
          <div className="text-3xl font-bold text-white">{score.runs}/{score.wickets}</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-gray-300 text-xs">{overs} ov</span>
            <span className="text-gray-300 text-xs">CRR {crr}</span>
          </div>
          <div className="flex gap-1 mt-2">
            {lastBalls.map((d, i) => (
              <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                d.is_wicket ? 'bg-red-500 text-white' :
                d.runs === 4 ? 'bg-blue-500 text-white' :
                d.runs === 6 ? 'bg-yellow-400 text-black' :
                'bg-gray-600 text-white'
              }`}>
                {d.is_wicket ? 'W' : d.runs}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'transparent' }} className="p-2">
      <div className="bg-black/85 backdrop-blur rounded-xl px-4 py-2 inline-flex items-center gap-6 border border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-400 text-xs font-medium">LIVE</span>
        </div>
        <span className="text-white font-bold">{battingTeam}</span>
        <span className="text-2xl font-bold text-white">{score.runs}/{score.wickets}</span>
        <span className="text-gray-300 text-sm">{overs} ov</span>
        <span className="text-gray-400 text-sm">CRR {crr}</span>
        <div className="flex gap-1">
          {lastBalls.map((d, i) => (
            <span key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              d.is_wicket ? 'bg-red-500 text-white' :
              d.runs === 4 ? 'bg-blue-500 text-white' :
              d.runs === 6 ? 'bg-yellow-400 text-black' :
              'bg-gray-600 text-white'
            }`}>
              {d.is_wicket ? 'W' : d.runs}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
