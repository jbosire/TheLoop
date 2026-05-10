export default function ChatLayout({ sidebar, thread, details, showDetails }) {
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <aside className="w-72 border-r flex flex-col flex-shrink-0">
        {sidebar}
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        {thread}
      </main>
      {showDetails && (
        <aside className="w-64 border-l flex flex-col flex-shrink-0 overflow-y-auto">
          {details}
        </aside>
      )}
    </div>
  )
}
