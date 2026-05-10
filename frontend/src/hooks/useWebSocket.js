import { useCallback, useEffect } from 'react'
import { useWebSocketContext } from '../context/WebSocketContext'

export function useWebSocket() {
  const { wsClient, status } = useWebSocketContext()
  const send = useCallback(
    (type, payload) => wsClient.send(type, payload),
    [wsClient],
  )
  return { wsClient, status, send }
}

export function useWebSocketEvent(eventType, callback) {
  const { wsClient } = useWebSocketContext()
  useEffect(() => {
    const unsubscribe = wsClient.on(eventType, callback)
    return unsubscribe
  }, [wsClient, eventType, callback])
}
