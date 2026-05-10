import { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import * as authApi from '../api/auth'
import { getMe } from '../api/users'

const AuthContext = createContext(null)

const initialState = { user: null, isAuthenticated: false, isLoading: true }

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { user: action.user, isAuthenticated: true, isLoading: false }
    case 'CLEAR_USER':
      return { user: null, isAuthenticated: false, isLoading: false }
    default:
      return state
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // On mount: restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      dispatch({ type: 'CLEAR_USER' })
      return
    }
    getMe()
      .then(({ data }) => dispatch({ type: 'SET_USER', user: data }))
      .catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        dispatch({ type: 'CLEAR_USER' })
      })
  }, [])

  // Listen for forced logout from the API interceptor (refresh failed)
  useEffect(() => {
    const handle = () => dispatch({ type: 'CLEAR_USER' })
    window.addEventListener('auth:logout', handle)
    return () => window.removeEventListener('auth:logout', handle)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password })
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    dispatch({ type: 'SET_USER', user: data.user })
  }, [])

  const register = useCallback(async (formData) => {
    const { data } = await authApi.register(formData)
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    dispatch({ type: 'SET_USER', user: data.user })
  }, [])

  const logout = useCallback(async () => {
    try { await authApi.logout() } catch { /* best-effort */ }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    dispatch({ type: 'CLEAR_USER' })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
