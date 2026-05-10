import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <LoadingSpinner className="min-h-screen" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}
