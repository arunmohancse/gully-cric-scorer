import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import LoadingSpinner from '../common/LoadingSpinner'

export default function AuthGuard({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}
