import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AuthGuard from './components/auth/AuthGuard'
import LoadingSpinner from './components/common/LoadingSpinner'

import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import MatchesPage from './pages/MatchesPage'
import NewMatchPage from './pages/NewMatchPage'
import MatchSetupPage from './pages/MatchSetupPage'
import ScoringPage from './pages/ScoringPage'
import ScorecardPage from './pages/ScorecardPage'
import OverlayPage from './pages/OverlayPage'
import ProfilePage from './pages/ProfilePage'
import TeamsPage from './pages/TeamsPage'
import TeamPage from './pages/TeamPage'
import NewTeamPage from './pages/NewTeamPage'

export default function App() {
  const { loading } = useAuth()
  if (loading) return <LoadingSpinner />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/overlay/:id" element={<OverlayPage />} />
      <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
      <Route path="/matches" element={<AuthGuard><MatchesPage /></AuthGuard>} />
      <Route path="/matches/new" element={<AuthGuard><NewMatchPage /></AuthGuard>} />
      <Route path="/matches/:id/setup" element={<AuthGuard><MatchSetupPage /></AuthGuard>} />
      <Route path="/matches/:id" element={<AuthGuard><ScorecardPage /></AuthGuard>} />
      <Route path="/scoring/:id" element={<AuthGuard><ScoringPage /></AuthGuard>} />
      <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
      <Route path="/teams" element={<AuthGuard><TeamsPage /></AuthGuard>} />
      <Route path="/teams/new" element={<AuthGuard><NewTeamPage /></AuthGuard>} />
      <Route path="/teams/:id" element={<AuthGuard><TeamPage /></AuthGuard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
