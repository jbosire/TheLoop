import { useState, useRef } from 'react'

export default function ComposeArea({ onSend, disabled }) {
  const [text, setText] = useState('')
  const ref = useRef(null)

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    // Reset height
    if (ref.current) ref.current.style.height = 'auto'
    ref.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
  }

  return (
    <div className="border-t px-4 py-3 flex items-end gap-3 flex-shrink-0">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        rows={1}
        placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
        disabled={disabled}
        className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary overflow-y-auto disabled:opacity-50"
        style={{ maxHeight: '8rem' }}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className="bg-primary text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-primary-dark disabled:opacity-40 flex-shrink-0 transition-colors"
        aria-label="Send"
      >
        <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2 21L23 12 2 3v7l15 2-15 2v7z" />
        </svg>
      </button>
    </div>
  )
}
