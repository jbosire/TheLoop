import { useEffect, useRef, useCallback } from 'react'
import MessageBubble from './MessageBubble'
import LoadingSpinner from '../common/LoadingSpinner'
import { useAuth } from '../../context/AuthContext'

export default function MessageThread({ messages, loading, hasMore, onLoadMore, onRetry }) {
  const { user } = useAuth()
  const containerRef = useRef(null)
  const bottomRef = useRef(null)
  const prevCountRef = useRef(0)
  const savedScrollRef = useRef(null) // { height, top } before load-more

  // Auto-scroll to bottom only when messages are appended (not when prepended via load-more)
  useEffect(() => {
    const appended = messages.length > prevCountRef.current && savedScrollRef.current === null
    if (appended) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    prevCountRef.current = messages.length
  }, [messages.length])

  // Restore scroll position after load-more prepend
  useEffect(() => {
    if (!savedScrollRef.current) return
    const el = containerRef.current
    if (!el) return
    const delta = el.scrollHeight - savedScrollRef.current.height
    el.scrollTop = savedScrollRef.current.top + delta
    savedScrollRef.current = null
  }, [messages.length])

  const handleLoadMore = useCallback(() => {
    const el = containerRef.current
    if (el) savedScrollRef.current = { height: el.scrollHeight, top: el.scrollTop }
    onLoadMore()
  }, [onLoadMore])

  if (loading) return <LoadingSpinner className="flex-1" />

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3">
      {hasMore && (
        <button
          onClick={handleLoadMore}
          className="w-full text-xs text-primary hover:underline py-2 mb-1"
        >
          Load earlier messages
        </button>
      )}
      {messages.length === 0 && !loading && (
        <p className="text-center text-gray-400 text-sm mt-16">No messages yet. Say hello!</p>
      )}
      {messages.map((msg) => (
        <MessageBubble
          key={msg.client_msg_id ?? msg.id}
          message={msg}
          isMine={msg.sender_id === user?.id || msg.sender_id === null}
          onRetry={onRetry}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
