import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { listenNotifications, markNotificationRead, markAllNotificationsRead } from '../../firebase/firestore.js'

function timeAgo(ts) {
  if (!ts?.toDate) return ''
  const diffMs = Date.now() - ts.toDate().getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationBell() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!currentUser) return
    const unsub = listenNotifications(currentUser.uid, setNotifications)
    return unsub
  }, [currentUser])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  function handleItemClick(n) {
    if (!n.read) markNotificationRead(n.id)
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  if (!currentUser) return null

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative w-10 h-10 grid place-items-center rounded-full hover:bg-sooji transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full grid place-items-center animate-popIn">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto bg-white border border-sooji rounded-2xl shadow-lg z-50 animate-fadeUp">
          <div className="flex items-center justify-between px-4 py-3 border-b border-sooji sticky top-0 bg-white">
            <span className="font-bold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button className="text-xs text-tamarind font-semibold" onClick={() => markAllNotificationsRead(notifications)}>
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-center text-charcoal-soft text-sm py-8">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`block w-full text-left px-4 py-3 border-b border-sooji last:border-b-0 hover:bg-dahi transition-colors ${!n.read ? 'bg-[#FBEDE8]' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm">{n.title}</span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-masala flex-shrink-0 mt-1.5" />}
                </div>
                <p className="text-xs text-charcoal-soft mt-1">{n.message}</p>
                <span className="text-[10px] text-charcoal-soft/70 font-mono mt-1 block">{timeAgo(n.createdAt)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
