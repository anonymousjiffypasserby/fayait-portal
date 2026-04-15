import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const T = {
  card: '#fff', navy: '#1a1f2e', orange: '#ff6b35',
  border: 'rgba(0,0,0,0.08)', text: '#1a1f2e', muted: '#888',
  green: '#1D9E75', red: '#e74c3c',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

export default function NotificationBell({ hovered }) {
  const [count,   setCount]   = useState(0)
  const [open,    setOpen]    = useState(false)
  const [notifs,  setNotifs]  = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  // Poll unread count every 60s
  useEffect(() => {
    const fetchCount = () =>
      api.getNotificationCount().then(d => setCount(d.count || 0)).catch(() => {})
    fetchCount()
    const id = setInterval(fetchCount, 60000)
    return () => clearInterval(id)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    try {
      const data = await api.getNotifications()
      setNotifs(Array.isArray(data) ? data.slice(0, 20) : [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifs(prev => prev.map(n => ({ ...n, read: true })))
      setCount(0)
    } catch { /* ignore */ }
  }

  const handleClick = async (notif) => {
    if (!notif.read) {
      api.markNotificationRead(notif.id).catch(() => {})
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
      setCount(prev => Math.max(0, prev - 1))
    }
    setOpen(false)
    if (notif.link) navigate(notif.link)
  }

  const fmtAgo = (d) => {
    if (!d) return ''
    const ms = Date.now() - new Date(d).getTime()
    const m  = Math.floor(ms / 60000)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        title="Notifications"
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: '6px', borderRadius: 6,
          color: open ? '#ff6b35' : 'rgba(255,255,255,0.45)',
          fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
      >
        🔔
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 16, height: 16, borderRadius: '50%',
            background: T.red, color: '#fff',
            fontSize: 9, fontWeight: 700, fontFamily: T.font,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed', left: 68, bottom: 60,
          width: 300, maxHeight: 380,
          background: T.card, borderRadius: 12,
          border: `1px solid ${T.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          fontFamily: T.font, zIndex: 200,
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Notifications</span>
            {count > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 11, color: T.muted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.font }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '20px 14px', fontSize: 12, color: T.muted, textAlign: 'center' }}>Loading…</div>
            ) : notifs.length === 0 ? (
              <div style={{ padding: '30px 14px', fontSize: 13, color: T.muted, textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>🔕</div>
                No notifications
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    padding: '10px 14px', cursor: n.link ? 'pointer' : 'default',
                    borderBottom: `1px solid ${T.border}`,
                    background: n.read ? T.card : '#f0f7ff',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f0f7ff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.read ? T.card : '#f0f7ff' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {!n.read && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.red, flexShrink: 0, marginTop: 5 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: n.read ? 400 : 600, color: T.text }}>{n.title}</div>
                      {n.body && <div style={{ fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>}
                      <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>{fmtAgo(n.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
