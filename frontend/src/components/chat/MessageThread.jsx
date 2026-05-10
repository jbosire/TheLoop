import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import LoadingSpinner from '../common/LoadingSpinner'
import { useAuth } from '../../context/AuthContext'

export default function MessageThread({ messages, loading, hasMore, onLoadMore }) {
  const { user } = useAuth()
  const bottomRef = useRef(null)
  const prevCountRef = useRef(0)

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevCountRef.current = messages.length
  }, [messages.length])

  if (loading) return <LoadingSpinner className="flex-1" />

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
      {hasMore && (
        <button
          onClick={onLoadMore}
          className="w-full text-xs text-blue-500 hover:underline py-2"
        >
          Load earlier messages
        </button>
      )}
      {messages.map((msg) => (
        <MessageBubble
          key={msg.client_msg_id ?? msg.id}
          message={msg}
          isMine={msg.sender_id === user?.id}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
