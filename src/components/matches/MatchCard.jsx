import { Link } from 'react-router-dom'

const statusColors = {
  upcoming: 'bg-yellow-500/20 text-yellow-400',
  live: 'bg-green-500/20 text-green-400',
  completed: 'bg-gray-500/20 text-gray-400',
}

export default function MatchCard({ match }) {
  const teams = match.match_teams || []
  const teamNames = teams.map(t => t.teams?.name).filter(Boolean).join(' vs ') || 'Teams TBD'

  return (
    <Link
      to={match.status === 'live' ? `/scoring/${match.id}` : `/matches/${match.id}`}
      className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-primary-500 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-white">{match.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[match.status] || statusColors.upcoming}`}>
          {match.status}
        </span>
      </div>
      <p className="text-gray-400 text-sm mb-1">{teamNames}</p>
      <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
        <span>📍 {match.venue || 'Venue TBD'}</span>
        <span>🏏 {match.overs} overs</span>
      </div>
    </Link>
  )
}
