import { useState } from 'react'
import ChatLayout from '../components/layout/ChatLayout'
import ConversationList from '../components/chat/ConversationList'
import MessageThread from '../components/chat/MessageThread'
import ComposeArea from '../components/chat/ComposeArea'
import ConversationDetails from '../components/chat/ConversationDetails'
import { useMessages } from '../hooks/useMessages'
import { useWebSocketContext } from '../context/WebSocketContext'
import { useNavigate } from 'react-router-dom'

export default function ChatPage() {
  const [activeConversation, setActiveConversation] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const { status } = useWebSocketContext()
  const { messages, loading, hasMore, loadMore, sendMessage } = useMessages(activeConversation?.id)
  const navigate = useNavigate()

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
        <h1 className="font-bold text-lg text-gray-900">TheLoop</h1>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-gray-300'}`}
            title={status}
          />
          <button
            onClick={() => navigate('/settings')}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ConversationList
          activeId={activeConversation?.id}
          onSelect={setActiveConversation}
        />
      </div>
    </div>
  )

  const thread = activeConversation ? (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="font-semibold text-gray-900">
            {activeConversation.type === 'group'
              ? activeConversation.name
              : activeConversation.participants[0]?.username}
          </h2>
          <p className="text-xs text-gray-400 capitalize">{activeConversation.type}</p>
        </div>
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          {showDetails ? 'Hide info' : 'Info'}
        </button>
      </div>
      <MessageThread
        messages={messages}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
      <ComposeArea onSend={sendMessage} disabled={status !== 'connected'} />
    </div>
  ) : (
    <div className="flex-1 flex items-center justify-center text-gray-400">
      <p>Select a conversation to start chatting</p>
    </div>
  )

  return (
    <ChatLayout
      sidebar={sidebar}
      thread={thread}
      details={<ConversationDetails conversation={activeConversation} />}
      showDetails={showDetails && !!activeConversation}
    />
  )
}
