import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/common/Navbar'
import LoadingSpinner from '../components/common/LoadingSpinner'

const ROLES = ['batsman', 'bowler', 'all-rounder', 'wicket-keeper']

const roleColors = {
  batsman: 'text-blue-400 bg-blue-400/10',
  bowler: 'text-red-400 bg-red-400/10',
  'all-rounder': 'text-yellow-400 bg-yellow-400/10',
  'wicket-keeper': 'text-purple-400 bg-purple-400/10',
}

function UserSearchInput({ onSelect, excludeUserIds = [] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)

    if (!val.trim()) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .ilike('display_name', `%${val}%`)
        .not('id', 'in', `(${excludeUserIds.join(',') || '00000000-0000-0000-0000-000000000000'})`)
        .limit(8)
      setResults(data || [])
      setSearching(false)
    }, 300)
  }

  function handleSelect(profile) {
    onSelect(profile)
    setQuery('')
    setResults([])
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search player by name..."
        value={query}
        onChange={handleChange}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
      />
      {searching && (
        <p className="text-xs text-gray-500 mt-1 px-1">Searching...</p>
      )}
      {results.length > 0 && (
        <div className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded-lg mt-1 shadow-xl overflow-hidden">
          {results.map(profile => (
            <button
              key={profile.id}
              type="button"
              onClick={() => handleSelect(profile)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-primary-600/30 flex items-center justify-center text-sm font-bold text-primary-400 flex-shrink-0">
                {profile.display_name?.charAt(0)?.toUpperCase()}
              </div>
              <span className="text-white text-sm">{profile.display_name}</span>
            </button>
          ))}
        </div>
      )}
      {query && !searching && results.length === 0 && (
        <p className="text-xs text-gray-500 mt-1 px-1">No users found. They need to register first.</p>
      )}
    </div>
  )
}

export default function TeamPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [newRole, setNewRole] = useState('batsman')
  const [editRole, setEditRole] = useState('batsman')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single()

      const { data: playersData } = await supabase
        .from('players')
        .select('*, profiles(display_name, avatar_url)')
        .eq('team_id', id)
        .order('batting_order', { ascending: true, nullsFirst: false })

      setTeam(teamData)
      setPlayers(playersData || [])
      setLoading(false)
    }
    load()
  }, [id])

  const existingUserIds = players.map(p => p.user_id).filter(Boolean)

  async function handleAddPlayer() {
    if (!selectedUser) return
    setSaving(true)
    setError('')

    const { data, error } = await supabase
      .from('players')
      .insert({
        team_id: id,
        user_id: selectedUser.id,
        name: selectedUser.display_name,
        role: newRole,
        batting_order: players.length + 1,
      })
      .select('*, profiles(display_name, avatar_url)')
      .single()

    if (error) {
      setError(error.message)
    } else {
      setPlayers(prev => [...prev, data])
      setSelectedUser(null)
      setNewRole('batsman')
      setAdding(false)
    }
    setSaving(false)
  }

  async function handleSaveEdit(playerId) {
    setSaving(true)
    const { data, error } = await supabase
      .from('players')
      .update({ role: editRole })
      .eq('id', playerId)
      .select('*, profiles(display_name, avatar_url)')
      .single()

    if (!error) {
      setPlayers(prev => prev.map(p => p.id === playerId ? data : p))
      setEditingId(null)
    }
    setSaving(false)
  }

  async function handleRemovePlayer(playerId) {
    await supabase.from('players').delete().eq('id', playerId)
    setPlayers(prev => prev.filter(p => p.id !== playerId))
  }

  function getDisplayName(player) {
    return player.profiles?.display_name || player.name || 'Unknown'
  }

  if (loading) return <LoadingSpinner />
  if (!team) return <div className="text-center py-20 text-gray-400">Team not found</div>

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">

        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/teams')} className="text-gray-400 hover:text-white text-sm">← Teams</button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{team.name}</h1>
              <p className="text-gray-400 text-sm mt-1">{players.length} players</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-xl font-bold text-primary-400">
              {team.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h2 className="font-semibold text-white">Players</h2>
            {!adding && (
              <button
                onClick={() => { setAdding(true); setEditingId(null) }}
                className="text-sm text-primary-500 hover:text-primary-400"
              >
                + Add Player
              </button>
            )}
          </div>

          {error && <p className="text-red-400 text-xs px-4 py-2 bg-red-400/10">{error}</p>}

          {players.length === 0 && !adding && (
            <p className="text-gray-500 text-sm text-center py-8">No players yet. Add registered users to this team.</p>
          )}

          <div className="divide-y divide-gray-800">
            {players.map((player, idx) => (
              <div key={player.id} className="px-4 py-3">
                {editingId === player.id ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {getDisplayName(player).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white text-sm flex-1">{getDisplayName(player)}</span>
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button onClick={() => handleSaveEdit(player.id)} disabled={saving} className="text-primary-500 text-sm hover:text-primary-400">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500 text-sm hover:text-white">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600 text-xs w-4">{idx + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white">
                        {getDisplayName(player).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{getDisplayName(player)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${roleColors[player.role] || 'text-gray-400'}`}>
                          {player.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => { setEditingId(player.id); setEditRole(player.role); setAdding(false) }} className="text-gray-500 hover:text-white text-xs">Edit</button>
                      <button onClick={() => handleRemovePlayer(player.id)} className="text-gray-500 hover:text-red-400 text-xs">Remove</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add player panel */}
          {adding && (
            <div className="px-4 py-4 border-t border-gray-800 bg-gray-800/40 space-y-3">
              <p className="text-xs text-gray-400">Search by the player's registered name</p>
              <UserSearchInput onSelect={setSelectedUser} excludeUserIds={existingUserIds} />

              {selectedUser && (
                <div className="flex items-center gap-3 bg-primary-600/10 border border-primary-500/30 rounded-lg px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-primary-600/30 flex items-center justify-center text-sm font-bold text-primary-400">
                    {selectedUser.display_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="text-white text-sm flex-1">{selectedUser.display_name}</span>
                  <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
                </div>
              )}

              {selectedUser && (
                <div className="flex gap-2">
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button
                    onClick={handleAddPlayer}
                    disabled={saving}
                    className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              )}

              <button onClick={() => { setAdding(false); setSelectedUser(null) }} className="text-xs text-gray-500 hover:text-white">
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Stats placeholder */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-3">Team Stats</h2>
          <p className="text-gray-500 text-sm text-center py-4">Stats will appear here once matches are played.</p>
        </div>
      </div>
    </div>
  )
}
