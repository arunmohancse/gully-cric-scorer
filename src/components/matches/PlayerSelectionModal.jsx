import { useState, useMemo } from 'react'

const roleColors = {
  batsman: 'text-blue-400',
  bowler: 'text-red-400',
  'all-rounder': 'text-yellow-400',
  'wicket-keeper': 'text-purple-400',
}

export default function PlayerSelectionModal({ team, players, selectedIds, onConfirm, onClose }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set(selectedIds))

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return players
    return players.filter(p => {
      const name = p.profiles?.display_name || p.name || ''
      return name.toLowerCase().includes(q)
    })
  }, [search, players])

  function toggle(playerId) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(playerId) ? next.delete(playerId) : next.add(playerId)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(players.map(p => p.id)))
  }

  function clearAll() {
    setSelected(new Set())
  }

  function handleConfirm() {
    const selectedPlayers = players.filter(p => selected.has(p.id))
    onConfirm(selectedPlayers)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-white">{team.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {selected.size} of {players.length} players selected
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <input
            type="text"
            placeholder="Search player..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
          />
          <div className="flex gap-3 mt-2">
            <button onClick={selectAll} className="text-xs text-primary-500 hover:text-primary-400">Select all</button>
            <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
          </div>
        </div>

        {/* Player list */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No players found</p>
          ) : (
            filtered.map(player => {
              const name = player.profiles?.display_name || player.name || 'Unknown'
              const isSelected = selected.has(player.id)
              return (
                <button
                  key={player.id}
                  onClick={() => toggle(player.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-800 transition-colors text-left ${
                    isSelected ? 'bg-primary-600/10' : 'hover:bg-gray-800'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-600'
                  }`}>
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + role */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{name}</p>
                    <p className={`text-xs capitalize ${roleColors[player.role] || 'text-gray-400'}`}>{player.role}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800 flex-shrink-0">
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-40"
          >
            Confirm {selected.size > 0 ? `(${selected.size} players)` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
