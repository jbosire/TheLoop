import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { updateMe } from '../api/users'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState(user?.username ?? '')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFeedback('')
    try {
      await updateMe({ username })
      setFeedback('Saved!')
    } catch {
      setFeedback('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="text-blue-500 hover:underline text-sm">
            ← Back to chat
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <form onSubmit={handleSave} className="space-y-4">
            <h2 className="font-semibold text-gray-700">Profile</h2>
            {feedback && (
              <p className={`text-sm ${feedback === 'Saved!' ? 'text-green-600' : 'text-red-600'}`}>
                {feedback}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
          <hr />
          <div>
            <h2 className="font-semibold text-gray-700 mb-3">Account</h2>
            <button onClick={handleLogout} className="text-red-600 text-sm hover:underline">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
