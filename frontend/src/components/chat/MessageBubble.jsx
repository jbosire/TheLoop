import { formatTime } from '../../utils/formatters'

export default function MessageBubble({ message, isMine, onRetry }) {
  const { status } = message

  return (
    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} mb-1`}>
      <div
        className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl ${
          isMine ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'
        } ${status === 'failed' ? 'opacity-60' : ''}`}
      >
        {!isMine && message.sender_username && (
          <p className="text-xs font-semibold text-primary mb-0.5">{message.sender_username}</p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMine ? 'text-primary-light' : 'text-gray-400'}`}>
          <span className="text-xs">{formatTime(message.created_at)}</span>
          {isMine && (
            <span className="text-xs">
              {status === 'sending' && '·'}
              {status === 'sent' && '✓'}
              {status === 'failed' && <span className="text-red-300">!</span>}
            </span>
          )}
        </div>
      </div>

      {isMine && status === 'failed' && (
        <button
          onClick={() => onRetry?.(message.client_msg_id)}
          className="mt-0.5 text-xs text-red-500 hover:text-red-700 hover:underline"
        >
          Failed to send · Retry
        </button>
      )}
    </div>
  )
}
