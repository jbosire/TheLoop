import { formatRelativeTime, truncate } from '../../utils/formatters'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../common/Avatar'

export default function ConversationItem({ conversation, isActive, onClick }) {
  const { user } = useAuth()
  const { type, name, participants, last_message } = conversation

  const other = type === 'direct'
    ? (participants.find((p) => p.user_id !== user?.id) ?? participants[0])
    : null
  const displayName = type === 'group' ? (name ?? 'Group') : (other?.username ?? 'Unknown')
  const preview = last_message ? truncate(last_message.content, 45) : 'No messages yet'
  const time = last_message ? formatRelativeTime(last_message.created_at) : ''

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        isActive
          ? 'bg-primary-surface border-r-2 border-primary'
          : 'hover:bg-gray-50'
      }`}
    >
      <Avatar user={{ username: displayName }} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <span className={`text-sm truncate ${isActive ? 'font-semibold text-primary' : 'font-medium text-gray-900'}`}>
            {displayName}
          </span>
          {time && (
            <span className="text-xs text-gray-400 flex-shrink-0">{time}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{preview}</p>
      </div>
    </button>
  )
}
