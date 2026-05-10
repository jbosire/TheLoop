import { useState, useEffect, useRef } from 'react'
import Modal from '../common/Modal'
import Avatar from '../common/Avatar'
import { searchUsers } from '../../api/users'
import { createConversation } from '../../api/conversations'

export default function NewConversationModal({ isOpen, onClose, onCreated }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState([])
  const [groupName, setGroupName] = useState('')
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setSelected([])
      setGroupName('')
      setError('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await searchUsers(query.trim())
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const toggleUser = (user) =>
    setSelected((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    )

  const isSelected = (id) => selected.some((u) => u.id === id)
  const isGroup = selected.length > 1
  const canSubmit = selected.length > 0 && (!isGroup || groupName.trim())

  const handleCreate = async () => {
    if (!canSubmit || creating) return
    setCreating(true)
    setError('')
    try {
      const payload = isGroup
        ? { type: 'group', name: groupName.trim(), participant_ids: selected.map((u) => u.id) }
        : { type: 'direct', participant_ids: [selected[0].id] }
      const { data } = await createConversation(payload)
      onCreated(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to create conversation')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New conversation">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selected.map((u) => (
            <span
              key={u.id}
              className="flex items-center gap-1 bg-primary-surface text-primary text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {u.username}
              <button
                onClick={() => toggleUser(u)}
                className="hover:text-primary-dark leading-none"
                aria-label={`Remove ${u.username}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Group name — shown as soon as 2+ selected */}
      {isGroup && (
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group name…"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      )}

      {/* Search input */}
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by username…"
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {/* Results list */}
      <div className="mt-2 max-h-52 overflow-y-auto -mx-1 px-1">
        {searching && (
          <p className="text-xs text-gray-400 text-center py-4">Searching…</p>
        )}
        {!searching && query.trim() && results.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No users found</p>
        )}
        {results.map((user) => {
          const selected_ = isSelected(user.id)
          return (
            <button
              key={user.id}
              onClick={() => toggleUser(user)}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
                selected_ ? 'bg-primary-surface' : 'hover:bg-gray-50'
              }`}
            >
              <Avatar user={user} size="sm" />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-gray-400 truncate">@{user.username}</p>
              </div>
              {selected_ && (
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}

      <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-md"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!canSubmit || creating}
          className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-40 transition-colors"
        >
          {creating ? 'Creating…' : isGroup ? 'Create group' : 'Start chat'}
        </button>
      </div>
    </Modal>
  )
}
