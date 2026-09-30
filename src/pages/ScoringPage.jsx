import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/common/Navbar'
import LoadingSpinner from '../components/common/LoadingSpinner'

const EXTRAS = ['wide', 'no-ball', 'bye', 'leg-bye']
const WICKET_TYPES = ['bowled', 'caught', 'lbw', 'run-out', 'stumped', 'hit-wicket']

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

function PlayerModal({ title, subtitle, players, onSelect, getPlayerName, extraInfo, excludeId }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-5 w-full max-w-sm">
        <h3 className="font-semibold text-white mb-0.5">{title}</h3>
        <p className="text-gray-400 text-sm mb-4">{subtitle}</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {players.filter(p => p.id !== excludeId).map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {getPlayerName(p).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm">{getPlayerName(p)}</p>
                {extraInfo?.(p) && <p className="text-xs text-gray-500">{extraInfo(p)}</p>}
              </div>
            </button>
          ))}
          {players.filter(p => p.id !== excludeId).length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">No players available</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ScoringPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [match, setMatch] = useState(null)
  const [innings, setInnings] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [battingPlayers, setBattingPlayers] = useState([])
  const [bowlingPlayers, setBowlingPlayers] = useState([])

  const [striker, setStriker] = useState(null)
  const [nonStriker, setNonStriker] = useState(null)
  const [bowler, setBowler] = useState(null)

  const [extras, setExtras] = useState(null)
  const [wicket, setWicket] = useState(false)
  const [wicketType, setWicketType] = useState('bowled')
  const [runOutDismissed, setRunOutDismissed] = useState('striker')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showNextBatsman, setShowNextBatsman] = useState(false)
  const [showNewBowler, setShowNewBowler] = useState(false)
  const [pendingBowlerChange, setPendingBowlerChange] = useState(false)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
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

    if (!inningsData) { setMatch(matchData); setLoading(false); return }

    const { data: deliveriesData } = await supabase
      .from('deliveries')
      .select('*')
      .eq('innings_id', inningsData.id)
      .order('created_at', { ascending: true })

    // Load playing XI from match_players, fall back to full team if not set
    const { data: matchPlayersData } = await supabase
      .from('match_players')
      .select('player_id, team_id, players(id, name, role, user_id, profiles(display_name, avatar_url))')
      .eq('match_id', id)

    let batting = [], bowling = []
    if (matchPlayersData && matchPlayersData.length > 0) {
      batting = matchPlayersData.filter(mp => mp.team_id === inningsData.batting_team_id).map(mp => mp.players)
      bowling = matchPlayersData.filter(mp => mp.team_id === inningsData.bowling_team_id).map(mp => mp.players)
    } else {
      const { data: bp } = await supabase.from('players').select('*, profiles(display_name, avatar_url)').eq('team_id', inningsData.batting_team_id)
      const { data: bwp } = await supabase.from('players').select('*, profiles(display_name, avatar_url)').eq('team_id', inningsData.bowling_team_id)
      batting = bp || []
      bowling = bwp || []
    }

    setMatch(matchData)
    setInnings(inningsData)
    setDeliveries(deliveriesData || [])
    setBattingPlayers(batting)
    setBowlingPlayers(bowling)

    // Restore persisted striker / non-striker / bowler
    if (inningsData.current_striker_id)
      setStriker(batting.find(p => p.id === inningsData.current_striker_id) || null)
    if (inningsData.current_non_striker_id)
      setNonStriker(batting.find(p => p.id === inningsData.current_non_striker_id) || null)
    if (inningsData.current_bowler_id)
      setBowler(bowling.find(p => p.id === inningsData.current_bowler_id) || null)

    setLoading(false)
  }

  async function persistCurrentPlayers(newStriker, newNonStriker, newBowler) {
    if (!innings) return
    await supabase.from('innings').update({
      current_striker_id: newStriker?.id || null,
      current_non_striker_id: newNonStriker?.id || null,
      current_bowler_id: newBowler?.id || null,
    }).eq('id', innings.id)
  }

  function getName(player) {
    return player?.profiles?.display_name || player?.name || 'Unknown'
  }

  // Score computed from deliveries
  const score = useMemo(() => deliveries.reduce((acc, d) => {
    if (d.is_wicket) acc.wickets++
    acc.runs += (d.runs || 0) + (d.extras_runs || 0)
    if (isValidBall(d.extras_type)) acc.balls++
    return acc
  }, { runs: 0, wickets: 0, balls: 0 }), [deliveries])

  const overs = `${Math.floor(score.balls / 6)}.${score.balls % 6}`

  // Current over deliveries
  const currentOverDeliveries = useMemo(() => {
    const overNo = Math.floor(score.balls / 6)
    return deliveries.filter(d => d.over_number === overNo)
  }, [deliveries, score.balls])

  // Dismissed player IDs (out batsmen)
  const dismissedIds = useMemo(() =>
    new Set(deliveries.filter(d => d.is_wicket && d.batsman_id).map(d => d.batsman_id))
  , [deliveries])

  // Available next batsmen
  const availableBatsmen = battingPlayers.filter(p =>
    !dismissedIds.has(p.id) && p.id !== striker?.id && p.id !== nonStriker?.id
  )

  // Batsman stats
  const batsmanStats = useMemo(() => {
    const s = {}
    deliveries.forEach(d => {
      if (!d.batsman_id) return
      if (!s[d.batsman_id]) s[d.batsman_id] = { runs: 0, balls: 0, fours: 0, sixes: 0 }
      if (isValidBall(d.extras_type)) s[d.batsman_id].balls++
      if (!d.extras_type) {
        s[d.batsman_id].runs += d.runs || 0
        if (d.runs === 4) s[d.batsman_id].fours++
        if (d.runs === 6) s[d.batsman_id].sixes++
      }
    })
    return s
  }, [deliveries])

  // Bowler stats
  const allBowlerStats = useMemo(() => {
    const s = {}
    deliveries.forEach(d => {
      if (!d.bowler_id) return
      if (!s[d.bowler_id]) s[d.bowler_id] = { runs: 0, balls: 0, wickets: 0 }
      if (isValidBall(d.extras_type)) s[d.bowler_id].balls++
      s[d.bowler_id].runs += (d.runs || 0) + (d.extras_runs || 0)
      if (d.is_wicket && d.wicket_type !== 'run-out') s[d.bowler_id].wickets++
    })
    return s
  }, [deliveries])

  async function recordDelivery(runs) {
    if (!innings || saving) return
    if (!striker) return alert('Select the striker first')
    if (!bowler) return alert('Select the bowler first')

    setSaving(true)

    const validBall = isValidBall(extras)
    const overNo = Math.floor(score.balls / 6)
    const ballNo = score.balls % 6

    const extrasRuns = (extras === 'wide' || extras === 'no-ball') ? 1 : 0

    const delivery = {
      innings_id: innings.id,
      over_number: overNo,
      ball_number: ballNo,
      batsman_id: striker.id,
      bowler_id: bowler.id,
      runs,
      extras_type: extras || null,
      extras_runs: extrasRuns,
      is_wicket: wicket,
      wicket_type: wicket ? wicketType : null,
      is_valid_ball: validBall,
    }

    const { data: newDelivery } = await supabase
      .from('deliveries').insert(delivery).select().single()

    const newDeliveries = [...deliveries, newDelivery]
    setDeliveries(newDeliveries)

    const newBalls = validBall ? score.balls + 1 : score.balls
    const newWickets = score.wickets + (wicket ? 1 : 0)
    const newRuns = score.runs + runs + extrasRuns
    const isEndOfOver = validBall && newBalls > 0 && newBalls % 6 === 0

    await supabase.from('innings').update({
      total_runs: newRuns,
      total_wickets: newWickets,
      total_overs: newBalls / 6,
    }).eq('id', innings.id)

    // Reset inputs
    setExtras(null)
    setWicket(false)
    setSaving(false)

    // Check innings complete
    const matchOvers = match?.overs || 20
    if (newWickets >= 10 || (validBall && newBalls >= matchOvers * 6)) {
      await handleInningsEnd(newRuns, newWickets, newBalls)
      return
    }

    // Strike rotation
    let newStriker = striker, newNonStriker = nonStriker
    const shouldRotate = validBall && !wicket && runs % 2 === 1
    if (shouldRotate) {
      newStriker = nonStriker
      newNonStriker = striker
      setStriker(newStriker)
      setNonStriker(newNonStriker)
    }

    // End of over: rotate strike + prompt new bowler
    if (isEndOfOver) {
      if (!wicket) {
        newStriker = nonStriker
        newNonStriker = striker
        setStriker(newStriker)
        setNonStriker(newNonStriker)
      }
      setPendingBowlerChange(true)
    }

    await persistCurrentPlayers(newStriker, newNonStriker, bowler)

    // Wicket: prompt next batsman (takes priority over bowler change)
    if (wicket) {
      setShowNextBatsman(true)
    } else if (isEndOfOver) {
      setShowNewBowler(true)
    }
  }

  async function handleInningsEnd(runs, wickets, balls) {
    await supabase.from('innings').update({ status: 'completed', total_runs: runs, total_wickets: wickets, total_overs: balls / 6 }).eq('id', innings.id)

    if (innings.innings_number === 1) {
      await supabase.from('innings').insert({
        match_id: id,
        batting_team_id: innings.bowling_team_id,
        bowling_team_id: innings.batting_team_id,
        innings_number: 2,
        status: 'live',
      })
      window.location.reload()
    } else {
      await supabase.from('matches').update({ status: 'completed' }).eq('id', id)
      navigate(`/matches/${id}`)
    }
  }

  function handleNextBatsman(player) {
    setStriker(player)
    setShowNextBatsman(false)
    persistCurrentPlayers(player, nonStriker, bowler)
    if (pendingBowlerChange) {
      setShowNewBowler(true)
      setPendingBowlerChange(false)
    }
  }

  function handleNewBowler(player) {
    setBowler(player)
    setShowNewBowler(false)
    setPendingBowlerChange(false)
    persistCurrentPlayers(striker, nonStriker, player)
  }

  function handleStrikerChange(player) {
    setStriker(player)
    persistCurrentPlayers(player, nonStriker, bowler)
  }

  function handleNonStrikerChange(player) {
    setNonStriker(player)
    persistCurrentPlayers(striker, player, bowler)
  }

  function handleBowlerChange(player) {
    setBowler(player)
    persistCurrentPlayers(striker, nonStriker, player)
  }

  async function undoLast() {
    if (deliveries.length === 0 || saving) return
    const last = deliveries[deliveries.length - 1]
    await supabase.from('deliveries').delete().eq('id', last.id)
    setDeliveries(prev => prev.slice(0, -1))
  }

  if (loading) return <LoadingSpinner />

  const battingTeam = match?.match_teams?.find(mt => mt.team_id === innings?.batting_team_id)?.teams
  const bowlingTeam = match?.match_teams?.find(mt => mt.team_id === innings?.bowling_team_id)?.teams
  const overlayUrl = `${window.location.origin}/overlay/${id}`

  const strikerStat = striker ? (batsmanStats[striker.id] || { runs: 0, balls: 0, fours: 0, sixes: 0 }) : null
  const nonStrikerStat = nonStriker ? (batsmanStats[nonStriker.id] || { runs: 0, balls: 0 }) : null
  const bowlerStat = bowler ? (allBowlerStats[bowler.id] || { runs: 0, balls: 0, wickets: 0 }) : null

  // Second innings target
  const isSecondInnings = innings?.innings_number === 2
  let target = null, required = null, requiredRR = null
  if (isSecondInnings) {
    // Fetch first innings score from innings table data we already have
    target = innings?.target || null
  }

  return (
    <div className="min-h-screen pb-6">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">

        {/* Score Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide">{battingTeam?.name} batting · {innings?.innings_number === 2 ? '2nd innings' : '1st innings'}</p>
              <p className="text-5xl font-bold text-white leading-none mt-1">{score.runs}/{score.wickets}</p>
              <p className="text-gray-400 text-sm mt-1">{overs} / {match?.overs} overs</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">OBS Overlay</p>
              <button onClick={() => navigator.clipboard.writeText(overlayUrl)} className="text-xs text-primary-500 hover:underline">
                Copy URL
              </button>
            </div>
          </div>

          {/* Current over balls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 mr-1">This over:</span>
            {currentOverDeliveries.length === 0 && <span className="text-xs text-gray-600">—</span>}
            {currentOverDeliveries.map((d, i) => (
              <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
                d.is_wicket ? 'bg-red-500/20 border-red-500 text-red-400' :
                d.runs === 4 ? 'bg-blue-500/20 border-blue-500 text-blue-400' :
                d.runs === 6 ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                d.extras_type ? 'bg-orange-500/20 border-orange-500 text-orange-400' :
                'bg-gray-800 border-gray-700 text-gray-300'
              }`}>
                {ballLabel(d)}
              </span>
            ))}
          </div>
        </div>

        {/* Batsmen at crease */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-gray-800">
            <div className="p-3">
              <p className="text-xs text-primary-400 font-medium mb-1.5">Striker *</p>
              <select
                value={striker?.id || ''}
                onChange={e => handleStrikerChange(battingPlayers.find(p => p.id === e.target.value) || null)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none mb-1"
              >
                <option value="">Select</option>
                {battingPlayers.filter(p => !dismissedIds.has(p.id)).map(p => (
                  <option key={p.id} value={p.id}>{getName(p)}</option>
                ))}
              </select>
              {strikerStat && (
                <p className="text-xs text-gray-400">
                  {strikerStat.runs}({strikerStat.balls})
                  {strikerStat.fours > 0 && <span className="text-blue-400 ml-1">{strikerStat.fours}×4</span>}
                  {strikerStat.sixes > 0 && <span className="text-yellow-400 ml-1">{strikerStat.sixes}×6</span>}
                </p>
              )}
            </div>
            <div className="p-3">
              <p className="text-xs text-gray-400 font-medium mb-1.5">Non-Striker</p>
              <select
                value={nonStriker?.id || ''}
                onChange={e => handleNonStrikerChange(battingPlayers.find(p => p.id === e.target.value) || null)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none mb-1"
              >
                <option value="">Select</option>
                {battingPlayers.filter(p => !dismissedIds.has(p.id) && p.id !== striker?.id).map(p => (
                  <option key={p.id} value={p.id}>{getName(p)}</option>
                ))}
              </select>
              {nonStrikerStat && (
                <p className="text-xs text-gray-400">{nonStrikerStat.runs}({nonStrikerStat.balls})</p>
              )}
            </div>
          </div>
        </div>

        {/* Bowler */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-400 font-medium mb-1.5">Bowler</p>
          <select
            value={bowler?.id || ''}
            onChange={e => handleBowlerChange(bowlingPlayers.find(p => p.id === e.target.value) || null)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none"
          >
            <option value="">Select bowler</option>
            {bowlingPlayers.map(p => <option key={p.id} value={p.id}>{getName(p)}</option>)}
          </select>
          {bowlerStat && bowler && (
            <p className="text-xs text-gray-500 mt-1">
              {Math.floor(bowlerStat.balls / 6)}.{bowlerStat.balls % 6} ov &nbsp;·&nbsp; {bowlerStat.runs} runs &nbsp;·&nbsp; {bowlerStat.wickets} wkts
            </p>
          )}
        </div>

        {/* Extras + Wicket toggles */}
        <div className="flex gap-2 flex-wrap">
          {EXTRAS.map(e => (
            <button key={e} onClick={() => setExtras(extras === e ? null : e)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                extras === e ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}>
              {e}
            </button>
          ))}
          <button onClick={() => setWicket(!wicket)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              wicket ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}>
            🎯 Wicket
          </button>
        </div>

        {/* Wicket details */}
        {wicket && (
          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select value={wicketType} onChange={e => setWicketType(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none capitalize">
                {WICKET_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              {wicketType === 'run-out' && (
                <select value={runOutDismissed} onChange={e => setRunOutDismissed(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none">
                  <option value="striker">Striker run out</option>
                  <option value="non-striker">Non-striker run out</option>
                </select>
              )}
            </div>
          </div>
        )}

        {/* Run buttons */}
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map(runs => (
            <button key={runs} onClick={() => recordDelivery(runs)} disabled={saving}
              className={`py-5 rounded-xl text-2xl font-bold transition-all disabled:opacity-40 active:scale-95 ${
                runs === 4 ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                runs === 6 ? 'bg-yellow-500 hover:bg-yellow-600 text-black' :
                'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
              }`}>
              {runs}
            </button>
          ))}
          <button onClick={undoLast} disabled={saving || deliveries.length === 0}
            className="py-5 rounded-xl text-sm font-medium bg-gray-900 hover:bg-gray-800 text-gray-400 border border-gray-700 disabled:opacity-40 active:scale-95">
            ↩ Undo
          </button>
        </div>
      </div>

      {/* Next Batsman Modal */}
      {showNextBatsman && (
        <PlayerModal
          title="Wicket!"
          subtitle={`Select next batsman — ${availableBatsmen.length} remaining`}
          players={availableBatsmen}
          onSelect={handleNextBatsman}
          getPlayerName={getName}
        />
      )}

      {/* New Bowler Modal */}
      {showNewBowler && !showNextBatsman && (
        <PlayerModal
          title="End of Over"
          subtitle="Select next bowler"
          players={bowlingPlayers}
          excludeId={bowler?.id}
          onSelect={handleNewBowler}
          getPlayerName={getName}
          extraInfo={p => {
            const s = allBowlerStats[p.id]
            return s ? `${Math.floor(s.balls / 6)}.${s.balls % 6} ov · ${s.wickets} wkts` : null
          }}
        />
      )}
    </div>
  )
}
