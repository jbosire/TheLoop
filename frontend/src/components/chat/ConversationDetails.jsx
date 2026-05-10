import Avatar from '../common/Avatar'

export default function ConversationDetails({ conversation }) {
  if (!conversation) return null
  const { type, name, participants } = conversation

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-900">{type === 'group' ? name : 'Direct Message'}</h3>
      <div>
        <p className="text-xs text-gray-500 uppercase font-medium tracking-wide mb-2">Members</p>
        <ul className="space-y-2">
          {participants.map((p) => (
            <li key={p.user_id} className="flex items-center gap-2">
              <Avatar user={{ username: p.username }} size="sm" />
              <span className="text-sm text-gray-800 truncate">{p.username}</span>
              {p.role === 'admin' && (
                <span className="text-xs text-blue-500 font-medium ml-auto">admin</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
