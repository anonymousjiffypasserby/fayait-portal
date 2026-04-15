import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.06)', muted: '#888', mutedLight: '#aaa',
  red: '#e74c3c', yellow: '#d97706', blue: '#2563eb', green: '#1D9E75',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const SEV = {
  critical: { color: T.red,    symbol: '●', label: 'Critical' },
  warning:  { color: T.yellow, symbol: '▲', label: 'Warning'  },
  info:     { color: T.blue,   symbol: 'ℹ', label: 'Info'     },
}
const SEV_ORDER = { critical: 0, warning: 1, info: 2 }

const fmtAgo = (d) => {
  if (!d) return ''
  const ms = Date.now() - new Date(d).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
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

export default function Dashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [assetCount,    setAssetCount]    = useState('—')
  const [offlineCount,  setOfflineCount]  = useState(0)
  const [alerts,        setAlerts]        = useState([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [alertsMin,     setAlertsMin]     = useState(false)
  const esRef = useRef(null)

  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0]
  const services  = user?.services || {}

  // Assets fetch — also derive offline count
  useEffect(() => {
    if (services.assets === 'active') {
      api.getAssets()
        .then(data => {
          const rows = data.rows || []
          setAssetCount(data.total ?? rows.length)
          setOfflineCount(rows.filter(a => !a.online).length)
        })
        .catch(() => {})
    }
  }, [])

  // Notifications fetch
  useEffect(() => {
    setAlertsLoading(true)
    api.getNotifications()
      .then(data => {
        const unread = (Array.isArray(data) ? data : []).filter(n => !n.read)
        setAlerts(unread)
      })
      .catch(() => {})
      .finally(() => setAlertsLoading(false))
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
        setAlerts(prev => [n, ...prev])
      } catch { /* ignore */ }
    }
    es.onerror = () => { /* EventSource auto-reconnects */ }
    return () => es.close()
  }, [])

  // Derived
  const criticalCount  = alerts.filter(n => n.severity === 'critical').length
  const warrantyCount  = alerts.filter(n => n.type === 'warranty_expiring').length

  const sorted = [...alerts]
    .sort((a, b) =>
      (SEV_ORDER[a.severity] ?? 2) - (SEV_ORDER[b.severity] ?? 2) ||
      new Date(b.created_at) - new Date(a.created_at)
    )
    .slice(0, 10)

  const groups = ['critical', 'warning', 'info']
    .map(sev => ({ sev, items: sorted.filter(n => (n.severity || 'info') === sev) }))
    .filter(g => g.items.length > 0)

  // Stats
  const stats = [
    {
      label: 'Open Tickets', value: '—', icon: '🎫',
      path: '/tickets', color: '#ff6b35',
      sub: 'View in tickets',
    },
    {
      label: 'Total Assets', value: assetCount, icon: '💻',
      path: '/assets', color: '#378ADD',
      sub: 'View in assets',
      offline: offlineCount,
    },
    {
      label: 'Services Active',
      value: Object.values(services).filter(s => s === 'active').length,
      icon: '🟢', color: '#1D9E75',
      sub: `of ${Object.keys(services).length} total`,
    },
    {
      label: 'Team Members', value: '—', icon: '👥',
      path: '/users', color: '#9b59b6',
      sub: 'Manage users',
    },
  ]

  const activeServiceList = Object.entries(services).filter(([, s]) => s === 'active').map(([k]) => k)
  const serviceIcons  = { tickets: '🎫', assets: '💻', chat: '💬', files: '📁', projects: '📋', status: '🟢', grafana: '📊' }
  const serviceLabels = { tickets: 'Tickets', assets: 'Assets', chat: 'Chat', files: 'Files', projects: 'Projects', status: 'Status', grafana: 'Analytics' }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 28, background: T.bg }}>

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: T.navy, margin: 0, fontFamily: T.font }}>
          {greeting}, {firstName} 👋
        </h1>
        <p style={{ fontSize: 13, color: T.muted, margin: '4px 0 0' }}>
          {user?.company} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {stats.map((stat, i) => (
          <div
            key={i}
            onClick={() => stat.path && navigate(stat.path)}
            style={{
              background: T.card, borderRadius: 12, padding: '18px 20px',
              border: `1px solid ${T.border}`, cursor: stat.path ? 'pointer' : 'default',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500 }}>
                {stat.label}
              </span>
              <span style={{ fontSize: 18 }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, lineHeight: 1, marginBottom: 6 }}>
              {stat.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 11, color: T.mutedLight }}>{stat.sub}</div>
              {stat.offline > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 9,
                  background: T.yellow + '22', color: T.yellow, letterSpacing: 0.2,
                }}>
                  {stat.offline} offline
                </span>
              )}
              {stat.label === 'Total Assets' && warrantyCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 9,
                  background: T.red + '18', color: T.red, letterSpacing: 0.2,
                }}>
                  {warrantyCount} warranty
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Services */}
      <div style={{ background: T.card, borderRadius: 12, padding: '20px 24px', border: `1px solid ${T.border}`, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 16 }}>Your Services</div>
        {activeServiceList.length === 0 ? (
          <div style={{ fontSize: 13, color: '#aaa' }}>No services activated yet. Contact Faya IT to get started.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {activeServiceList.map(key => (
              <button key={key} onClick={() => navigate('/' + key)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#f7f8fa', border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 8, padding: '10px 16px', fontSize: 13,
                color: T.navy, cursor: 'pointer', fontWeight: 500,
              }}>
                <span>{serviceIcons[key] || '⚙️'}</span>
                <span>{serviceLabels[key] || key}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Alerts widget ─────────────────────────────────────────────────────── */}
      <div style={{
        background: T.card, borderRadius: 12,
        border: `1px solid ${T.border}`,
        marginBottom: 16, overflow: 'hidden',
      }}>

        {/* Widget header — click to minimize */}
        <div
          onClick={() => setAlertsMin(m => !m)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', cursor: 'pointer', userSelect: 'none',
            borderBottom: alertsMin ? 'none' : `1px solid ${T.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 15 }}>🔔</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.navy, fontFamily: T.font }}>Alerts</span>
            {alerts.length > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 9, lineHeight: 1.6,
                background: criticalCount > 0 ? T.red : T.yellow,
                color: '#fff',
              }}>
                {alerts.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!alertsMin && alerts.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); navigate('/notifications') }}
                style={{
                  fontSize: 11, color: T.navy, background: 'none', border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontFamily: T.font, padding: 0,
                }}
              >
                View all →
              </button>
            )}
            <span style={{ fontSize: 11, color: T.muted }}>
              {alertsMin ? '▼' : '▲'}
            </span>
          </div>
        </div>

        {/* Widget body */}
        {!alertsMin && (
          alertsLoading ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: T.muted, fontSize: 13 }}>
              Loading…
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.green }}>All clear</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>No unread alerts</div>
            </div>
          ) : (
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {groups.map(({ sev, items }) => {
                const s = SEV[sev] || SEV.info
                return (
                  <div key={sev}>

                    {/* Group label */}
                    <div style={{
                      padding: '5px 20px 4px',
                      fontSize: 10, fontWeight: 700, letterSpacing: 0.9,
                      textTransform: 'uppercase', color: s.color,
                      background: s.color + '0d',
                      borderBottom: `1px solid ${s.color}22`,
                    }}>
                      {s.label} · {items.length}
                    </div>

                    {/* Rows */}
                    {items.map((n, idx) => {
                      const msg = n.message || n.body
                      const url = resourceUrl(n.resource_type, n.resource_id) || n.link
                      return (
                        <div
                          key={n.id}
                          onClick={() => url && navigate(url)}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 20px',
                            borderBottom: idx < items.length - 1
                              ? `1px solid ${T.border}` : 'none',
                            cursor: url ? 'pointer' : 'default',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => { if (url) e.currentTarget.style.background = '#f8f9fc' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          {/* Severity icon */}
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: s.color + '18', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginTop: 1,
                          }}>
                            <span style={{ fontSize: 11, color: s.color, fontWeight: 700, lineHeight: 1 }}>
                              {s.symbol}
                            </span>
                          </div>

                          {/* Text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 12, fontWeight: 700, color: T.navy,
                              lineHeight: 1.35, marginBottom: msg ? 2 : 0,
                            }}>
                              {n.title}
                            </div>
                            {msg && (
                              <div style={{
                                fontSize: 11, color: T.muted, lineHeight: 1.4,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {msg}
                              </div>
                            )}
                          </div>

                          {/* Meta */}
                          <div style={{ flexShrink: 0, textAlign: 'right', paddingLeft: 6 }}>
                            <div style={{ fontSize: 10, color: T.muted, whiteSpace: 'nowrap' }}>
                              {fmtAgo(n.created_at)}
                            </div>
                            {url && (
                              <div style={{ fontSize: 10, color: T.navy, fontWeight: 600, marginTop: 3 }}>
                                View →
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              {/* Footer */}
              <div style={{
                padding: '9px 20px',
                borderTop: `1px solid ${T.border}`,
                textAlign: 'center',
              }}>
                <button
                  onClick={() => navigate('/notifications')}
                  style={{
                    fontSize: 11, color: T.navy, background: 'none', border: 'none',
                    cursor: 'pointer', fontWeight: 600, fontFamily: T.font,
                  }}
                >
                  View all notifications →
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Faya IT banner */}
      <div style={{
        background: 'linear-gradient(135deg, #ff6b35 0%, #f7a173 100%)',
        borderRadius: 12, padding: '20px 24px', color: '#fff',
      }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, fontWeight: 500 }}>FROM FAYA IT</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Welcome to your Faya IT portal 🔥</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
          Your IT workspace is ready. Use the sidebar to navigate your services.
        </div>
      </div>

    </div>
  )
}
