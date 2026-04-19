import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const T = {
  card: '#fff', navy: '#1a1f2e', orange: '#ff6b35',
  border: 'rgba(0,0,0,0.08)', text: '#1a1f2e', muted: '#888',
  green: '#1D9E75', red: '#e74c3c', yellow: '#d97706', blue: '#2563eb',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const SEVERITY_ICON = {
  critical: { symbol: '●', color: T.red },
  warning:  { symbol: '▲', color: T.yellow },
  info:     { symbol: 'ℹ', color: T.blue },
}

const resourceUrl = (type, id) => {
  if (!type) return null
  switch (type) {
    // Asset types
    case 'asset':       return `/assets?open=${id}`
    case 'accessory':   return `/assets?module=accessories`
    case 'consumable':  return `/assets?module=consumables`
    case 'component':   return `/assets?module=components`
    case 'request':     return `/assets?module=requests`
    // HR types
    case 'leave':
    case 'leave_reminder':
    case 'leave_requested':
    case 'leave_approved':
    case 'leave_denied':
    case 'timesheet':
    case 'timesheet_submitted':
    case 'timesheet_approved':
    case 'timesheet_rejected':
    case 'payslip_ready':
    case 'shift_swap_requested':
    case 'shift_swap_approved':
    case 'schedule_published':
    case 'schedule_reminder':
    case 'goal_set':
    case 'review_completed':
    case 'review_due':
    case 'contract_expiring':
    case 'document_expiring':
    case 'employee':
    case 'goal':
    case 'review':
    case 'document':
    case 'schedule':
      return '/hr'
    default:
      return null
  }
}

const fmtAgo = (d) => {
  if (!d) return ''
  const ms = Date.now() - new Date(d).getTime()
  const m  = Math.floor(ms / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NotificationBell({ hovered }) {
  const [count,   setCount]   = useState(0)
  const [open,    setOpen]    = useState(false)
  const [notifs,  setNotifs]  = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)
  const esRef = useRef(null)
  const navigate = useNavigate()

  // Poll unread count every 60s
  useEffect(() => {
    const fetch_ = () =>
      api.getNotificationCount().then(d => setCount(d.count || 0)).catch(() => {})
    fetch_()
    const id = setInterval(fetch_, 60000)
    return () => clearInterval(id)
  }, [])

  // SSE — real-time notification push
  useEffect(() => {
    const url = api.getNotificationsLiveUrl()
    const es  = new EventSource(url)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type !== 'notification') return
        const n = { ...data.notification, message: data.notification.message || data.notification.body }
        setNotifs(prev => [n, ...prev.slice(0, 49)])
        setCount(prev => prev + 1)
      } catch { /* ignore */ }
    }

    es.onerror = () => { /* EventSource auto-reconnects */ }

    return () => es.close()
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
      setNotifs(Array.isArray(data) ? data : [])
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
    const url = resourceUrl(notif.resource_type, notif.resource_id) || notif.link
    setOpen(false)
    if (url) navigate(url)
  }

  const unreadCount = notifs.filter(n => !n.read).length

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
        onMouseLeave={e => { if (!open) e.currentTarget.style.color = open ? '#ff6b35' : 'rgba(255,255,255,0.45)' }}
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
          position: 'fixed', right: 8, left: 'auto', bottom: 60,
          width: 320, maxWidth: 'calc(100vw - 16px)', maxHeight: 420,
          background: T.card, borderRadius: 12,
          border: `1px solid ${T.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          fontFamily: T.font, zIndex: 200,
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 9, background: T.red, color: '#fff' }}>{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
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
              notifs.slice(0, 20).map(n => {
                const sev = SEVERITY_ICON[n.severity] || SEVERITY_ICON.info
                const msg = n.message || n.body
                const hasLink = !!(resourceUrl(n.resource_type, n.resource_id) || n.link)
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      padding: '10px 14px',
                      cursor: hasLink ? 'pointer' : 'default',
                      borderBottom: `1px solid ${T.border}`,
                      background: n.read ? T.card : '#f0f7ff',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f5f7ff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = n.read ? T.card : '#f0f7ff' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 12, color: sev.color, flexShrink: 0, marginTop: 1, fontWeight: 700 }}>{sev.symbol}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: T.text, lineHeight: 1.3 }}>{n.title}</div>
                        {msg && <div style={{ fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{msg}</div>}
                        <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>{fmtAgo(n.created_at)}</div>
                      </div>
                      {!n.read && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.red, flexShrink: 0, marginTop: 5 }} />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '8px 14px', borderTop: `1px solid ${T.border}`, flexShrink: 0, textAlign: 'center' }}>
            <button
              onClick={() => { setOpen(false); navigate('/notifications') }}
              style={{ fontSize: 11, color: T.navy, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.font, fontWeight: 600 }}
            >
              See all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
