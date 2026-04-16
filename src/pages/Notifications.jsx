import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const T = {
  card: '#fff', navy: '#1a1f2e', border: '#e5e7eb',
  text: '#1a1f2e', muted: '#6b7280', bg: '#f0f2f5',
  green: '#1D9E75', red: '#e74c3c', yellow: '#d97706', blue: '#2563eb',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const SEVERITY_ICON  = { critical: { symbol: '●', color: T.red }, warning: { symbol: '▲', color: T.yellow }, info: { symbol: 'ℹ', color: T.blue } }
const SEVERITY_LABEL = { critical: 'Critical', warning: 'Warning', info: 'Info' }

const TYPE_LABELS = {
  low_stock:          'Low Stock',
  warranty_expiring:  'Warranty Expiring',
  asset_offline:      'Asset Offline',
  license_expiring:   'License Expiring',
  audit_due:          'Audit Due',
  update_available:   'Update Available',
  request_submitted:  'Request Submitted',
  request_reviewed:   'Request Reviewed',
  command_completed:  'Command Completed',
  command_failed:     'Command Failed',
  welcome:            'Welcome',
}

const fmtAgo = (d) => {
  if (!d) return ''
  const ms = Date.now() - new Date(d).getTime()
  const m  = Math.floor(ms / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const selStyle = (active) => ({
  padding: '7px 11px', borderRadius: 8, fontSize: 13, fontFamily: T.font,
  border: `1px solid ${active ? T.navy : T.border}`,
  background: active ? '#eef1ff' : T.card,
  color: active ? T.navy : T.text,
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
})

export default function Notifications() {
  const [notifs,     setNotifs]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterSev,  setFilterSev]  = useState('')
  const [filterRead, setFilterRead] = useState('') // '' | 'unread' | 'read'
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    api.getNotifications()
      .then(d => setNotifs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const markAllRead = async () => {
    await api.markAllNotificationsRead().catch(() => {})
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markRead = async (id) => {
    await api.markNotificationRead(id).catch(() => {})
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const dismiss = async (id) => {
    await api.deleteNotification(id).catch(() => {})
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  const clearRead = async () => {
    const readIds = notifs.filter(n => n.read).map(n => n.id)
    await Promise.all(readIds.map(id => api.deleteNotification(id).catch(() => {})))
    setNotifs(prev => prev.filter(n => !n.read))
  }

  const resourceUrl = (type, id) => {
    if (!type || !id) return null
    switch (type) {
      case 'asset':      return `/assets?open=${id}`
      case 'accessory':  return `/assets?module=accessories`
      case 'consumable': return `/assets?module=consumables`
      case 'component':  return `/assets?module=components`
      case 'request':    return `/assets?module=requests`
      default:           return null
    }
  }

  const handleClick = async (n) => {
    if (!n.read) await markRead(n.id)
    const url = resourceUrl(n.resource_type, n.resource_id) || n.link
    if (url) navigate(url)
  }

  const allTypes = [...new Set(notifs.map(n => n.type).filter(Boolean))].sort()

  const filtered = notifs.filter(n => {
    if (filterType && n.type !== filterType) return false
    if (filterSev  && n.severity !== filterSev) return false
    if (filterRead === 'unread' &&  n.read) return false
    if (filterRead === 'read'   && !n.read) return false
    return true
  })

  const unreadCount = notifs.filter(n => !n.read).length
  const readCount   = notifs.filter(n =>  n.read).length

  return (
    <div style={{ padding: '28px 32px', fontFamily: T.font, maxWidth: 820, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.navy }}>Notifications</h1>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            {unreadCount > 0 ? <span style={{ color: T.red, fontWeight: 600 }}>{unreadCount} unread</span> : 'All read'}
            {readCount > 0 && <span style={{ marginLeft: 8 }}>• {readCount} read</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', fontWeight: 600, fontFamily: T.font, color: T.navy }}>
              Mark all read
            </button>
          )}
          {readCount > 0 && (
            <button onClick={clearRead} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', fontWeight: 600, fontFamily: T.font, color: T.muted }}>
              Clear read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...selStyle(!!filterType), outline: 'none' }}>
          <option value="">All Types</option>
          {allTypes.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
        </select>
        <select value={filterSev} onChange={e => setFilterSev(e.target.value)} style={{ ...selStyle(!!filterSev), outline: 'none' }}>
          <option value="">All Severities</option>
          {['critical', 'warning', 'info'].map(s => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
        </select>
        {['', 'unread', 'read'].map(v => (
          <button key={v} onClick={() => setFilterRead(v)}
            style={{ ...selStyle(filterRead === v && v !== ''), padding: '7px 14px', border: `1px solid ${filterRead === v ? T.navy : T.border}`, background: filterRead === v ? '#eef1ff' : T.card, color: filterRead === v ? T.navy : T.text }}>
            {v === '' ? 'All' : v === 'unread' ? 'Unread' : 'Read'}
          </button>
        ))}
        {(filterType || filterSev || filterRead) && (
          <button onClick={() => { setFilterType(''); setFilterSev(''); setFilterRead('') }}
            style={{ fontSize: 12, padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.muted, cursor: 'pointer', fontFamily: T.font }}>
            × Clear
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: T.muted, padding: 40 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: T.muted, padding: 60, background: T.card, borderRadius: 12, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
          <div style={{ fontSize: 14 }}>No notifications</div>
        </div>
      ) : (
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          {filtered.map((n, i) => {
            const sev = SEVERITY_ICON[n.severity] || SEVERITY_ICON.info
            const msg = n.message || n.body
            const hasLink = !!(resourceUrl(n.resource_type, n.resource_id) || n.link)
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '14px 18px',
                  borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none',
                  background: n.read ? T.card : '#f5f8ff',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8f9fc' }}
                onMouseLeave={e => { e.currentTarget.style.background = n.read ? T.card : '#f5f8ff' }}
              >
                {/* Severity icon */}
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: sev.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: sev.color, fontWeight: 700 }}>{sev.symbol}</span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, cursor: hasLink ? 'pointer' : 'default' }} onClick={() => handleClick(n)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: T.text }}>{n.title}</span>
                    {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.red, display: 'inline-block', flexShrink: 0 }} />}
                    {n.type && (
                      <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 9, background: '#f0f2f5', color: T.muted, fontWeight: 500 }}>
                        {TYPE_LABELS[n.type] || n.type}
                      </span>
                    )}
                  </div>
                  {msg && <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{msg}</div>}
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>{fmtAgo(n.created_at)}</div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 5, flexShrink: 0, marginTop: 2 }}>
                  {!n.read && (
                    <button
                      onClick={e => { e.stopPropagation(); markRead(n.id) }}
                      title="Mark read"
                      style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.muted, fontFamily: T.font }}
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                    title="Dismiss"
                    style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: `1px solid #fca5a5`, background: '#fef2f2', cursor: 'pointer', color: T.red, fontFamily: T.font }}
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
