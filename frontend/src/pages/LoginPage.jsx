import { Navigate } from 'react-router-dom'
import LoginForm from '../components/auth/LoginForm'
import { LogoFull } from '../components/common/brand'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth()
  if (!isLoading && isAuthenticated) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-primary-surface flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <LogoFull width={180} />
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
