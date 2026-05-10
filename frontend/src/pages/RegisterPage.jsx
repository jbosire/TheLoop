import { Navigate } from 'react-router-dom'
import RegisterForm from '../components/auth/RegisterForm'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth()
  if (!isLoading && isAuthenticated) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Create account</h1>
        <RegisterForm />
      </div>
    </div>
  )
}
