import { createContext, useContext, useEffect, useState } from 'react'
import { wsClient } from '../websocket/client'
import { WS_EVENTS } from '../websocket/events'
import { useAuth } from './AuthContext'

const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [status, setStatus] = useState('disconnected')

  useEffect(() => {
    if (!isAuthenticated) {
      wsClient.disconnect()
      setStatus('disconnected')
      return
    }

    setStatus('connecting')
    wsClient.connect(() => localStorage.getItem('access_token'))

    const offConnected = wsClient.on(WS_EVENTS.CONNECTED, () => setStatus('connected'))
    const offDisconnected = wsClient.on(WS_EVENTS.DISCONNECTED, () => setStatus('disconnected'))

    return () => {
      offConnected()
      offDisconnected()
    }
  }, [isAuthenticated])

  return (
    <WebSocketContext.Provider value={{ wsClient, status }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext() {
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocketContext must be used within WebSocketProvider')
  return ctx
}
