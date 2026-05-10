import { useState } from 'react'
import { useConversations } from '../../hooks/useConversations'
import ConversationItem from './ConversationItem'
import NewConversationModal from './NewConversationModal'
import LoadingSpinner from '../common/LoadingSpinner'

export default function ConversationList({ activeId, onSelect }) {
  const { conversations, loading, refetch } = useConversations()
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtered = conversations.filter((conv) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    if (conv.type === 'group') return conv.name?.toLowerCase().includes(q)
    return conv.participants.some((p) => p.username.toLowerCase().includes(q))
  })

  const handleCreated = async (conv) => {
    await refetch()
    onSelect(conv)
  }

  if (loading) return <LoadingSpinner className="flex-1" />

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-3 border-b space-y-2">
          <button
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center gap-1.5 bg-primary text-white text-sm font-medium py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New conversation
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeId}
              onClick={() => onSelect(conv)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm mt-10">
              {query.trim() ? 'No matching conversations' : 'No conversations yet'}
            </p>
          )}
        </div>
      </div>

      <NewConversationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
      />
    </>
  )
}
