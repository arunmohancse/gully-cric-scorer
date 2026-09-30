export default function PlayerRow({ player, onRemove, showRemove = true }) {
  const roleColors = {
    batsman: 'text-blue-400',
    bowler: 'text-red-400',
    'all-rounder': 'text-yellow-400',
    'wicket-keeper': 'text-purple-400',
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
          {player.name?.charAt(0)?.toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{player.name}</p>
          <p className={`text-xs capitalize ${roleColors[player.role] || 'text-gray-400'}`}>{player.role}</p>
        </div>
      </div>
      {showRemove && onRemove && (
        <button onClick={() => onRemove(player.id)} className="text-gray-500 hover:text-red-400 text-xs">
          Remove
        </button>
      )}
    </div>
  )
}
