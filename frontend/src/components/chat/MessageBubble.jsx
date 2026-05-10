import { formatTime } from '../../utils/formatters'

const STATUS_ICONS = { sending: '·', sent: '✓', failed: '!' }

export default function MessageBubble({ message, isMine }) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-0.5`}>
      <div
        className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl ${
          isMine ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'
        } ${message.status === 'failed' ? 'opacity-60' : ''}`}
      >
        {!isMine && message.sender_username && (
          <p className="text-xs font-medium text-blue-600 mb-0.5">{message.sender_username}</p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
          <span className="text-xs">{formatTime(message.created_at)}</span>
          {isMine && message.status && message.status !== 'received' && (
            <span className={`text-xs ${message.status === 'failed' ? 'text-red-300' : ''}`}>
              {STATUS_ICONS[message.status] ?? '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
