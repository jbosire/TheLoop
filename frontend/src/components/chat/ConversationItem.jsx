import { formatRelativeTime, truncate } from '../../utils/formatters'
import Avatar from '../common/Avatar'

export default function ConversationItem({ conversation, isActive, onClick }) {
  const { type, name, participants, last_message } = conversation
  const displayName = type === 'group' ? name : (participants[0]?.username ?? 'Unknown')
  const preview = last_message ? truncate(last_message.content, 45) : 'No messages yet'
  const time = last_message ? formatRelativeTime(last_message.created_at) : ''

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-surface text-left transition-colors ${
        isActive ? 'bg-primary-surface border-r-2 border-primary' : ''
      }`}
    >
      <Avatar user={participants[0]} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <span className="font-medium text-sm text-gray-900 truncate">{displayName}</span>
          {time && <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{time}</span>}
        </div>
        <p className="text-xs text-gray-500 truncate">{preview}</p>
      </div>
    </button>
  )
}
