import { useState, useEffect, useCallback } from 'react'
import { listConversations } from '../api/conversations'
import { useWebSocketEvent } from './useWebSocket'
import { WS_EVENTS } from '../websocket/events'

export function useConversations() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await listConversations()
      setConversations(data.conversations)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  // Bubble updated conversation to the top on new message
  const handleNewMessage = useCallback((payload) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === payload.conversation_id)
      if (idx === -1) return prev
      const updated = [...prev]
      const [conv] = updated.splice(idx, 1)
      return [
        {
          ...conv,
          last_message: {
            content: payload.content,
            sender_id: payload.sender_id,
            created_at: payload.created_at,
          },
        },
        ...updated,
      ]
    })
  }, [])

  useWebSocketEvent(WS_EVENTS.NEW_MESSAGE, handleNewMessage)

  return { conversations, loading, error, refetch: fetchConversations }
}
