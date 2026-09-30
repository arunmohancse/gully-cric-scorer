import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/common/Navbar'

const ROLES = ['batsman', 'bowler', 'all-rounder', 'wicket-keeper']

export default function NewTeamPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function addPlayer() {
    setPlayers(prev => [...prev, { name: '', role: 'batsman', tempId: Date.now() }])
  }

  function updatePlayer(idx, field, value) {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  function removePlayer(idx) {
    setPlayers(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Team name is required')
    setLoading(true)
    setError('')

    try {
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .insert({ name: name.trim(), created_by: user.id, is_saved: true })
        .select().single()
      if (teamErr) throw teamErr

      const validPlayers = players.filter(p => p.name.trim())
      if (validPlayers.length > 0) {
        await supabase.from('players').insert(
          validPlayers.map((p, i) => ({
            team_id: team.id, name: p.name.trim(), role: p.role, batting_order: i + 1
          }))
        )
      }

      navigate(`/teams/${team.id}`)
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
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/teams')} className="text-gray-400 hover:text-white text-sm">← Teams</button>
        </div>

        <h1 className="text-2xl font-bold text-white mb-6">Create New Team</h1>

        {error && <p className="text-red-400 text-sm mb-4 bg-red-400/10 p-3 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <label className="text-sm text-gray-400 block mb-1">Team Name</label>
            <input
              type="text"
              placeholder="e.g. Chennai Warriors"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <h3 className="font-semibold text-white">Players</h3>
              <button type="button" onClick={addPlayer} className="text-sm text-primary-500 hover:text-primary-400">
                + Add Player
              </button>
            </div>

            {players.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">
                No players added yet.{' '}
                <button type="button" onClick={addPlayer} className="text-primary-500 hover:underline">Add one</button>
              </p>
            ) : (
              <div className="divide-y divide-gray-800">
                {players.map((player, idx) => (
                  <div key={player.tempId} className="flex gap-2 px-4 py-2.5">
                    <input
                      type="text"
                      placeholder="Player name"
                      value={player.name}
                      onChange={e => updatePlayer(idx, 'name', e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-primary-500"
                    />
                    <select
                      value={player.role}
                      onChange={e => updatePlayer(idx, 'role', e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button type="button" onClick={() => removePlayer(idx)} className="text-gray-500 hover:text-red-400 text-sm px-1">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Team →'}
          </button>
        </form>
      </div>
    </div>
  )
}
