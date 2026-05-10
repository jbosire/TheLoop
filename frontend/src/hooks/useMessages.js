import { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { getMessages } from '../api/messages'
import { useWebSocket, useWebSocketEvent } from './useWebSocket'
import { WS_EVENTS } from '../websocket/events'
import { MESSAGE_ACK_TIMEOUT } from '../utils/constants'

export function useMessages(conversationId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const { send } = useWebSocket()
  const pendingRef = useRef(new Map()) // client_msg_id → true while awaiting ack

  useEffect(() => {
    if (!conversationId) return
    setMessages([])
    setLoading(true)
    setHasMore(false)
    setCursor(null)
    pendingRef.current.clear()

    getMessages(conversationId)
      .then(({ data }) => {
        setMessages(data.messages)
        setHasMore(data.has_more)
        setCursor(data.next_cursor)
      })
      .finally(() => setLoading(false))

    send(WS_EVENTS.JOIN_CONVERSATION, { conversation_id: conversationId })
  }, [conversationId, send])

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor) return
    const { data } = await getMessages(conversationId, { cursor })
    setMessages((prev) => [...data.messages, ...prev])
    setHasMore(data.has_more)
    setCursor(data.next_cursor)
  }, [conversationId, hasMore, cursor])

  const sendMessage = useCallback((content) => {
    const clientMsgId = uuidv4()
    const optimistic = {
      id: null,
      client_msg_id: clientMsgId,
      conversation_id: conversationId,
      sender_id: null,
      content_type: 'text',
      content,
      created_at: new Date().toISOString(),
      status: 'sending',
    }
    pendingRef.current.set(clientMsgId, true)
    setMessages((prev) => [...prev, optimistic])

    const sent = send(WS_EVENTS.SEND_MESSAGE, {
      client_msg_id: clientMsgId,
      conversation_id: conversationId,
      content,
      content_type: 'text',
    })

    if (!sent) {
      pendingRef.current.delete(clientMsgId)
      setMessages((prev) =>
        prev.map((m) => m.client_msg_id === clientMsgId ? { ...m, status: 'failed' } : m),
      )
      return
    }

    // Mark failed if no ack arrives within timeout
    setTimeout(() => {
      if (!pendingRef.current.has(clientMsgId)) return
      pendingRef.current.delete(clientMsgId)
      setMessages((prev) =>
        prev.map((m) =>
          m.client_msg_id === clientMsgId && m.status === 'sending'
            ? { ...m, status: 'failed' }
            : m,
        ),
      )
    }, MESSAGE_ACK_TIMEOUT)
  }, [conversationId, send])

  const handleNewMessage = useCallback((payload) => {
    if (payload.conversation_id !== conversationId) return
    setMessages((prev) => {
      if (prev.some((m) => m.client_msg_id === payload.client_msg_id)) return prev
      return [...prev, { ...payload, status: 'received' }]
    })
  }, [conversationId])

  const handleMessageAck = useCallback((payload) => {
    pendingRef.current.delete(payload.client_msg_id)
    setMessages((prev) =>
      prev.map((m) =>
        m.client_msg_id === payload.client_msg_id
          ? { ...m, id: payload.id, created_at: payload.created_at, status: 'sent' }
          : m,
      ),
    )
  }, [])

  useWebSocketEvent(WS_EVENTS.NEW_MESSAGE, handleNewMessage)
  useWebSocketEvent(WS_EVENTS.MESSAGE_ACK, handleMessageAck)

  return { messages, loading, hasMore, loadMore, sendMessage }
}
