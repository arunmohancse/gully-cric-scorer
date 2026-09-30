import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/common/Navbar'
import PlayerSelectionModal from '../components/matches/PlayerSelectionModal'

function TeamSelector({ teamNumber, existingTeams, selectedTeamId, onSelectExisting, playingPlayers, onPlayersChange }) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [teamPlayers, setTeamPlayers] = useState([])
  const selectedTeam = existingTeams.find(t => t.id === selectedTeamId)

  const filteredTeams = search.trim()
    ? existingTeams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : []

  useEffect(() => {
    if (!selectedTeamId) { setTeamPlayers([]); return }
    supabase
      .from('players')
      .select('*, profiles(display_name, avatar_url)')
      .eq('team_id', selectedTeamId)
      .then(({ data }) => setTeamPlayers(data || []))
  }, [selectedTeamId])

  function handleSelectTeam(teamId) {
    onSelectExisting(teamId)
    onPlayersChange([])
    setSearch('')
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="font-semibold text-white mb-3">Team {teamNumber}</h3>

      {existingTeams.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-3">No teams found. Create a team first from the Teams section.</p>
      ) : (
        <>
          <input
            type="text"
            placeholder="Search team by name..."
            value={search}
            onChange={e => { setSearch(e.target.value); if (selectedTeamId) onSelectExisting('') }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-2 focus:outline-none focus:border-primary-500"
          />

          {/* Search results */}
          {search && (
            <div className="space-y-1 max-h-48 overflow-y-auto mb-2">
              {filteredTeams.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-3">No teams match "{search}"</p>
              ) : (
                filteredTeams.map(team => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => handleSelectTeam(team.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border bg-gray-800 border-gray-700 text-gray-300 hover:border-primary-500 hover:text-white transition-colors text-left"
                  >
                    <p className="font-medium text-sm">{team.name}</p>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Selected team card */}
          {selectedTeam && !search && (
            <div className="border border-primary-500/40 rounded-xl overflow-hidden">
              {/* Team header — clickable to open player selection */}
              <button
                type="button"
                onClick={() => teamPlayers.length > 0 && setShowModal(true)}
                className="w-full flex items-center justify-between px-3 py-3 bg-primary-600/10 hover:bg-primary-600/20 transition-colors text-left"
              >
                <div>
                  <p className="font-semibold text-white">{selectedTeam.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {playingPlayers.length > 0
                      ? `${playingPlayers.length} players selected for this match`
                      : teamPlayers.length > 0
                        ? `Tap to select playing XI from ${teamPlayers.length} players`
                        : 'No players in this team yet'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {playingPlayers.length > 0 && (
                    <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      {playingPlayers.length}
                    </span>
                  )}
                  {teamPlayers.length > 0 && <span className="text-gray-400 text-sm">›</span>}
                </div>
              </button>

              {/* Selected players preview */}
              {playingPlayers.length > 0 && (
                <div className="px-3 py-2 divide-y divide-gray-800/60">
                  {playingPlayers.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-300">{p.profiles?.display_name || p.name}</span>
                      <span className="text-xs text-gray-500 capitalize">{p.role}</span>
                    </div>
                  ))}
                  {playingPlayers.length > 4 && (
                    <p className="text-xs text-gray-500 pt-1.5">+{playingPlayers.length - 4} more</p>
                  )}
                </div>
              )}

              <div className="px-3 py-2 border-t border-gray-800">
                <button type="button" onClick={() => onSelectExisting('')} className="text-xs text-gray-500 hover:text-red-400">
                  Change team
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && selectedTeam && (
        <PlayerSelectionModal
          team={selectedTeam}
          players={teamPlayers}
          selectedIds={playingPlayers.map(p => p.id)}
          onConfirm={selected => { onPlayersChange(selected); setShowModal(false) }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

export default function NewMatchPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingTeams, setExistingTeams] = useState([])

  const [form, setForm] = useState({
    title: '',
    venue: '',
    overs: 20,
    date: new Date().toISOString().split('T')[0],
  })

  const [selectedTeamAId, setSelectedTeamAId] = useState('')
  const [selectedTeamBId, setSelectedTeamBId] = useState('')
  const [playingPlayersA, setPlayingPlayersA] = useState([])
  const [playingPlayersB, setPlayingPlayersB] = useState([])

  useEffect(() => {
    async function loadTeams() {
      const { data } = await supabase
        .from('teams')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
      setExistingTeams(data || [])
    }
    if (user) loadTeams()
  }, [user])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedTeamAId || !selectedTeamBId) return setError('Both teams are required')
    if (selectedTeamAId === selectedTeamBId) return setError('Both teams cannot be the same')
    if (!form.title) return setError('Match title is required')

    setLoading(true)
    setError('')

    try {
      const { data: match, error: matchErr } = await supabase
        .from('matches')
        .insert({ ...form, created_by: user.id, status: 'upcoming' })
        .select().single()
      if (matchErr) throw matchErr

      await supabase.from('match_teams').insert([
        { match_id: match.id, team_id: selectedTeamAId, innings_no: 1 },
        { match_id: match.id, team_id: selectedTeamBId, innings_no: 2 },
      ])

      // Save playing XI for each team
      const matchPlayers = [
        ...playingPlayersA.map((p, i) => ({ match_id: match.id, player_id: p.id, team_id: selectedTeamAId, batting_order: i + 1 })),
        ...playingPlayersB.map((p, i) => ({ match_id: match.id, player_id: p.id, team_id: selectedTeamBId, batting_order: i + 1 })),
      ]
      if (matchPlayers.length > 0) {
        await supabase.from('match_players').insert(matchPlayers)
      }

      navigate(`/matches/${match.id}/setup`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-6">Create New Match</h1>

        {error && <p className="text-red-400 text-sm mb-4 bg-red-400/10 p-3 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-white">Match Details</h3>
            <input
              type="text"
              placeholder="Match title (e.g. Sunday League - Week 3)"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
            />
            <input
              type="text"
              placeholder="Venue"
              value={form.venue}
              onChange={e => setForm({ ...form, venue: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">Overs</label>
                <input
                  type="number"
                  value={form.overs}
                  onChange={e => setForm({ ...form, overs: parseInt(e.target.value) })}
                  min={1} max={50}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <TeamSelector
            teamNumber="A"
            existingTeams={existingTeams}
            selectedTeamId={selectedTeamAId}
            onSelectExisting={setSelectedTeamAId}
            playingPlayers={playingPlayersA}
            onPlayersChange={setPlayingPlayersA}
          />

          <TeamSelector
            teamNumber="B"
            existingTeams={existingTeams}
            selectedTeamId={selectedTeamBId}
            onSelectExisting={setSelectedTeamBId}
            playingPlayers={playingPlayersB}
            onPlayersChange={setPlayingPlayersB}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Match →'}
          </button>
        </form>
      </div>
    </div>
  )
}
