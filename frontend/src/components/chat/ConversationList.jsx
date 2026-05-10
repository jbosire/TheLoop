import { useConversations } from '../../hooks/useConversations'
import ConversationItem from './ConversationItem'
import LoadingSpinner from '../common/LoadingSpinner'

export default function ConversationList({ activeId, onSelect }) {
  const { conversations, loading } = useConversations()

  if (loading) return <LoadingSpinner className="flex-1" />

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <input
          type="text"
          placeholder="Search…"
          className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={conv.id === activeId}
            onClick={() => onSelect(conv)}
          />
        ))}
        {conversations.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-10">No conversations yet</p>
        )}
      </div>
    </div>
  )
}
