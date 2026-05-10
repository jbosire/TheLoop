export default function Avatar({ user, size = 'md' }) {
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  }
  const initials =
    [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('') ||
    user?.username?.[0]?.toUpperCase() ||
    '?'

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.username}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0`}
      />
    )
  }
  return (
    <div
      className={`${sizes[size]} rounded-full bg-blue-500 text-white flex items-center justify-center font-medium flex-shrink-0`}
    >
      {initials}
    </div>
  )
}
