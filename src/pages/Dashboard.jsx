import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.06)', muted: '#888', mutedLight: '#aaa',
  red: '#e74c3c', yellow: '#d97706', blue: '#2563eb', green: '#1D9E75',
  orange: '#f97316', purple: '#9b59b6',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const STATUS_COLORS = {
  'Deployed':        '#2563eb',
  'Ready to Deploy': '#1D9E75',
  'Pending':         '#d97706',
  'Maintenance':     '#f97316',
  'Un-deployable':   '#e74c3c',
  'Archived':        '#6b7280',
  'Lost/Stolen':     '#1a1f2e',
}

const ACTIVITY_ICONS = {
  checked_out:      '📤',
  checked_in:       '📥',
  created:          '➕',
  deleted:          '🗑️',
  audited:          '✅',
  user_created:     '👤',
  request_approved: '✅',
  request_denied:   '❌',
}

const SEV = {
  critical: { color: T.red,    symbol: '●', label: 'Critical' },
  warning:  { color: T.yellow, symbol: '▲', label: 'Warning'  },
  info:     { color: T.blue,   symbol: 'ℹ', label: 'Info'     },
}
const SEV_ORDER = { critical: 0, warning: 1, info: 2 }

// ── Helpers ───────────────────────────────────────────────────────────────────
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

const initials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
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

// ── localStorage-backed minimized state ──────────────────────────────────────
function useWidget(key, defaultMin = false) {
  const storageKey = `dash_widget_min_${key}`
  const [minimized, setMinimized] = useState(() => {
    try { const v = localStorage.getItem(storageKey); return v !== null ? v === 'true' : defaultMin }
    catch { return defaultMin }
  })
  const toggle = useCallback(() => {
    setMinimized(m => {
      const next = !m
      try { localStorage.setItem(storageKey, String(next)) } catch {}
      return next
    })
  }, [storageKey])
  return [minimized, toggle]
}

// ── WidgetCard ────────────────────────────────────────────────────────────────
function WidgetCard({ title, icon, badge, badgeColor, minimized, onToggle, action, children, style = {} }) {
  return (
    <div style={{
      background: T.card, borderRadius: 12,
      border: `1px solid ${T.border}`,
      overflow: 'hidden', ...style,
    }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 18px', cursor: 'pointer', userSelect: 'none',
          borderBottom: minimized ? 'none' : `1px solid ${T.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.navy, fontFamily: T.font }}>{title}</span>
          {badge != null && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 9, lineHeight: 1.6,
              background: (badgeColor || T.blue) + '18', color: badgeColor || T.blue,
            }}>{badge}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!minimized && action}
          <span style={{ fontSize: 10, color: T.muted }}>{minimized ? '▼' : '▲'}</span>
        </div>
      </div>
      {!minimized && children}
    </div>
  )
}

// ── Pure SVG Donut ────────────────────────────────────────────────────────────
function Donut({ segments, size = 130, thickness = 22, label, sublabel }) {
  const r    = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const cx   = size / 2
  const cy   = size / 2
  const total = segments.reduce((s, g) => s + g.value, 0)

  let cumOffset = 0
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {total === 0
          ? <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={thickness} />
          : segments.filter(s => s.value > 0).map((seg, i) => {
              const dash = (seg.value / total) * circ
              const offset = circ - cumOffset
              cumOffset += dash
              return (
                <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                  stroke={seg.color} strokeWidth={thickness}
                  strokeDasharray={`${dash} ${circ}`}
                  strokeDashoffset={offset}
                />
              )
            })
        }
      </svg>
      {(label != null) && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, lineHeight: 1 }}>{label}</div>
          {sublabel && <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{sublabel}</div>}
        </div>
      )}
    </div>
  )
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ value, max, color }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 7, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color || T.blue, borderRadius: 4, transition: 'width 0.4s ease' }} />
    </div>
  )
}

// ── Widgets ───────────────────────────────────────────────────────────────────

// Asset Summary
function AssetSummaryWidget({ statusMap, total }) {
  const [min, toggle] = useWidget('asset-summary')
  const navigate = useNavigate()
  const STATUSES = ['Deployed','Ready to Deploy','Pending','Maintenance','Un-deployable','Archived','Lost/Stolen']

  const segments = STATUSES
    .filter(s => (statusMap[s] || 0) > 0)
    .map(s => ({ color: STATUS_COLORS[s] || '#94a3b8', value: statusMap[s] || 0 }))

  return (
    <WidgetCard title="Asset Summary" icon="💻" badge={total || null} badgeColor={T.blue}
      minimized={min} onToggle={toggle}
      style={{ gridColumn: '1 / -1' }}
    >
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
          <Donut segments={segments} size={130} thickness={22} label={total} sublabel="total" />
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 8, minWidth: 200 }}>
            {STATUSES.map(s => {
              const count = statusMap[s] || 0
              return (
                <div
                  key={s}
                  onClick={() => navigate(`/assets?status=${encodeURIComponent(s)}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                    border: `1.5px solid ${count > 0 ? STATUS_COLORS[s] + '44' : T.border}`,
                    background: count > 0 ? STATUS_COLORS[s] + '0d' : '#fafafa',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (count > 0) e.currentTarget.style.background = STATUS_COLORS[s] + '1a' }}
                  onMouseLeave={e => { e.currentTarget.style.background = count > 0 ? STATUS_COLORS[s] + '0d' : '#fafafa' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s] || '#94a3b8', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: T.navy, fontWeight: 500 }}>{s}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: count > 0 ? STATUS_COLORS[s] : T.muted }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </WidgetCard>
  )
}

// Online / Offline
function OnlineWidget({ online, offline, total, liveUrl }) {
  const [min, toggle] = useWidget('online-offline')
  const navigate = useNavigate()
  const [liveOnline,  setLiveOnline]  = useState(online)
  const [liveOffline, setLiveOffline] = useState(offline)
  const prevRef = useRef({})

  // Sync when props settle from initial load
  useEffect(() => { setLiveOnline(online);  }, [online])
  useEffect(() => { setLiveOffline(offline) }, [offline])

  useEffect(() => {
    if (!liveUrl) return
    const es = new EventSource(liveUrl)
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        const id = d.id
        if (!id) return
        const wasOnline = prevRef.current[id]
        const isOnline  = d.online !== false
        prevRef.current[id] = isOnline
        if (wasOnline === undefined) return // first time seeing this asset, no delta
        if (wasOnline && !isOnline) {
          setLiveOnline(n => Math.max(0, n - 1))
          setLiveOffline(n => n + 1)
        } else if (!wasOnline && isOnline) {
          setLiveOffline(n => Math.max(0, n - 1))
          setLiveOnline(n => n + 1)
        }
      } catch {}
    }
    return () => es.close()
  }, [liveUrl])

  const pct = total > 0 ? Math.round((liveOnline / total) * 100) : 0

  return (
    <WidgetCard title="Online / Offline" icon="🟢" minimized={min} onToggle={toggle}>
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', gap: 24, marginBottom: 16, alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>Online</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: T.green, lineHeight: 1 }}>{liveOnline}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>Offline</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: T.muted, lineHeight: 1 }}>{liveOffline}</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.navy }}>{pct}%</div>
            <div style={{ fontSize: 11, color: T.muted }}>online rate</div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ background: '#f1f5f9', borderRadius: 6, height: 10, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: 6,
            background: pct >= 80 ? T.green : pct >= 50 ? T.yellow : T.red,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <button
          onClick={() => navigate('/assets?online=offline')}
          style={{
            fontSize: 12, color: T.blue, background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, fontWeight: 600, fontFamily: T.font,
          }}
        >
          View offline assets →
        </button>
      </div>
    </WidgetCard>
  )
}

// Recent Activity
function ActivityWidget({ rows: initialRows }) {
  const [min, toggle]   = useWidget('activity')
  const [rows, setRows] = useState(initialRows || [])
  const navigate        = useNavigate()

  useEffect(() => { setRows(initialRows || []) }, [initialRows])

  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(() => {
      api.getActivity(10).then(d => setRows(d.rows || [])).catch(() => {})
    }, 60000)
    return () => clearInterval(t)
  }, [])

  const describeAction = (row) => {
    const icon = ACTIVITY_ICONS[row.action] || '📋'
    const asset = row.hostname || row.asset_tag || 'an asset'
    const actor = row.performed_by || 'Someone'
    const actionLabel = {
      checked_out: `checked out ${asset}`,
      checked_in:  `checked in ${asset}`,
      created:     `added ${asset}`,
      deleted:     `retired ${asset}`,
      audited:     `audited ${asset}`,
    }[row.action] || `${row.action} on ${asset}`
    return { icon, actor, actionLabel }
  }

  const viewAllAction = (
    <button
      onClick={e => { e.stopPropagation(); navigate('/reports') }}
      style={{ fontSize: 11, color: T.navy, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: T.font, padding: 0 }}
    >
      View all →
    </button>
  )

  return (
    <WidgetCard title="Recent Activity" icon="📋" badge={rows.length || null}
      minimized={min} onToggle={toggle} action={viewAllAction}
    >
      {rows.length === 0
        ? <div style={{ padding: '36px 20px', textAlign: 'center', color: T.muted, fontSize: 13 }}>No recent activity.</div>
        : <div>
            {rows.map((row, i) => {
              const { icon, actor, actionLabel } = describeAction(row)
              return (
                <div key={row.id || i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '9px 18px',
                  borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : 'none',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, flexShrink: 0, marginTop: 1,
                  }}>{icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: T.navy, lineHeight: 1.35 }}>
                      <strong>{actor}</strong> {actionLabel}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, whiteSpace: 'nowrap', flexShrink: 0, paddingTop: 1 }}>
                    {fmtAgo(row.created_at)}
                  </div>
                </div>
              )
            })}
            <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.border}`, textAlign: 'center' }}>
              <button
                onClick={() => navigate('/reports')}
                style={{ fontSize: 11, color: T.navy, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: T.font }}
              >
                View all activity →
              </button>
            </div>
          </div>
      }
    </WidgetCard>
  )
}

// Categories Breakdown
function CategoriesWidget({ categoryMap }) {
  const [min, toggle] = useWidget('categories')
  const navigate = useNavigate()

  const entries = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  const max = entries[0]?.[1] || 1

  const COLORS = ['#2563eb','#1D9E75','#d97706','#f97316','#e74c3c','#9b59b6','#6b7280','#1a1f2e']

  return (
    <WidgetCard title="Categories" icon="🗂️" minimized={min} onToggle={toggle}>
      {entries.length === 0
        ? <div style={{ padding: '36px 20px', textAlign: 'center', color: T.muted, fontSize: 13 }}>No category data.</div>
        : <div style={{ padding: '12px 18px' }}>
            {entries.map(([cat, count], i) => (
              <div
                key={cat}
                onClick={() => navigate(`/assets?type=${encodeURIComponent(cat)}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 0', cursor: 'pointer',
                  borderBottom: i < entries.length - 1 ? `1px solid ${T.border}` : 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: T.navy, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</span>
                <HBar value={count} max={max} color={COLORS[i % COLORS.length]} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.navy, minWidth: 24, textAlign: 'right' }}>{count}</span>
              </div>
            ))}
          </div>
      }
    </WidgetCard>
  )
}

// Locations
function LocationsWidget({ locationMap }) {
  const [min, toggle]     = useWidget('locations')
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const entries = Object.entries(locationMap)
    .filter(([k]) => k && k !== '(No Location)')
    .sort((a, b) => b[1] - a[1])
  const visible  = expanded ? entries : entries.slice(0, 5)
  const max      = entries[0]?.[1] || 1

  const viewAllAction = entries.length > 5 && !expanded
    ? <button
        onClick={e => { e.stopPropagation(); setExpanded(true) }}
        style={{ fontSize: 11, color: T.navy, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: T.font, padding: 0 }}
      >
        +{entries.length - 5} more
      </button>
    : null

  return (
    <WidgetCard title="Locations" icon="📍" minimized={min} onToggle={toggle} action={viewAllAction}>
      {visible.length === 0
        ? <div style={{ padding: '36px 20px', textAlign: 'center', color: T.muted, fontSize: 13 }}>No location data.</div>
        : <div style={{ padding: '12px 18px' }}>
            {visible.map(([loc, count], i) => (
              <div
                key={loc}
                onClick={() => navigate(`/assets?loc=${encodeURIComponent(loc)}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 0', cursor: 'pointer',
                  borderBottom: i < visible.length - 1 ? `1px solid ${T.border}` : 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 13 }}>📍</span>
                <span style={{ fontSize: 12, color: T.navy, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc}</span>
                <HBar value={count} max={max} color={T.blue} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.navy, minWidth: 24, textAlign: 'right' }}>{count}</span>
              </div>
            ))}
            {expanded && entries.length > 5 && (
              <button
                onClick={() => setExpanded(false)}
                style={{ fontSize: 11, color: T.muted, background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, padding: 0, fontFamily: T.font }}
              >
                Show less
              </button>
            )}
          </div>
      }
    </WidgetCard>
  )
}

// People Summary
function PeopleWidget({ users }) {
  const [min, toggle] = useWidget('people')
  const navigate = useNavigate()

  const active   = users.filter(u => u.active !== false)
  const inactive = users.filter(u => u.active === false)
  const recent   = [...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3)

  const ROLE_COLORS = { superadmin: T.red, admin: T.orange, staff: T.blue }

  const viewAllAction = (
    <button
      onClick={e => { e.stopPropagation(); navigate('/settings') }}
      style={{ fontSize: 11, color: T.navy, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: T.font, padding: 0 }}
    >
      Manage →
    </button>
  )

  return (
    <WidgetCard title="People" icon="👥" badge={users.length || null} badgeColor={T.purple}
      minimized={min} onToggle={toggle} action={viewAllAction}
    >
      <div style={{ padding: '14px 18px' }}>
        {/* Active / Inactive row */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>Active</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.green }}>{active.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>Inactive</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.muted }}>{inactive.length}</div>
          </div>
        </div>
        {/* Recent users */}
        {recent.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Recently Added</div>
            {recent.map((u, i) => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '5px 0',
                borderBottom: i < recent.length - 1 ? `1px solid ${T.border}` : 'none',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: ROLE_COLORS[u.role] || T.blue,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>{initials(u.name || u.email)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.name || u.email}
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, textTransform: 'capitalize' }}>{u.role}</div>
                </div>
                <div style={{ fontSize: 10, color: T.muted }}>{fmtAgo(u.created_at)}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </WidgetCard>
  )
}

// Alerts widget
function AlertsWidget({ alerts, loading }) {
  const [min, toggle] = useWidget('alerts')
  const navigate = useNavigate()

  const criticalCount = alerts.filter(n => n.severity === 'critical').length
  const warrantyCount = alerts.filter(n => n.type === 'warranty_expiring').length

  const sorted = [...alerts]
    .sort((a, b) =>
      (SEV_ORDER[a.severity] ?? 2) - (SEV_ORDER[b.severity] ?? 2) ||
      new Date(b.created_at) - new Date(a.created_at)
    )
    .slice(0, 10)

  const groups = ['critical', 'warning', 'info']
    .map(sev => ({ sev, items: sorted.filter(n => (n.severity || 'info') === sev) }))
    .filter(g => g.items.length > 0)

  const viewAllAction = alerts.length > 0
    ? <button
        onClick={e => { e.stopPropagation(); navigate('/notifications') }}
        style={{ fontSize: 11, color: T.navy, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: T.font, padding: 0 }}
      >
        View all →
      </button>
    : null

  const badge = alerts.length > 0 ? alerts.length : null
  const badgeColor = criticalCount > 0 ? T.red : T.yellow

  return (
    <WidgetCard title="Alerts" icon="🔔" badge={badge} badgeColor={badgeColor}
      minimized={min} onToggle={toggle} action={viewAllAction}
    >
      {loading
        ? <div style={{ padding: '32px 20px', textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
        : sorted.length === 0
          ? <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>All clear</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>No unread alerts</div>
            </div>
          : <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {groups.map(({ sev, items }) => {
                const s = SEV[sev] || SEV.info
                return (
                  <div key={sev}>
                    <div style={{
                      padding: '5px 18px 4px', fontSize: 10, fontWeight: 700,
                      letterSpacing: 0.9, textTransform: 'uppercase', color: s.color,
                      background: s.color + '0d', borderBottom: `1px solid ${s.color}22`,
                    }}>
                      {s.label} · {items.length}
                    </div>
                    {items.map((n, idx) => {
                      const msg = n.message || n.body
                      const url = resourceUrl(n.resource_type, n.resource_id) || n.link
                      return (
                        <div
                          key={n.id}
                          onClick={() => url && navigate(url)}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '9px 18px',
                            borderBottom: idx < items.length - 1 ? `1px solid ${T.border}` : 'none',
                            cursor: url ? 'pointer' : 'default',
                          }}
                          onMouseEnter={e => { if (url) e.currentTarget.style.background = '#f8f9fc' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: s.color + '18', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                          }}>
                            <span style={{ fontSize: 11, color: s.color, fontWeight: 700, lineHeight: 1 }}>{s.symbol}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.navy, lineHeight: 1.35, marginBottom: msg ? 2 : 0 }}>{n.title}</div>
                            {msg && <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg}</div>}
                          </div>
                          <div style={{ flexShrink: 0, textAlign: 'right', paddingLeft: 6 }}>
                            <div style={{ fontSize: 10, color: T.muted, whiteSpace: 'nowrap' }}>{fmtAgo(n.created_at)}</div>
                            {url && <div style={{ fontSize: 10, color: T.navy, fontWeight: 600, marginTop: 3 }}>View →</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.border}`, textAlign: 'center' }}>
                <button
                  onClick={() => navigate('/notifications')}
                  style={{ fontSize: 11, color: T.navy, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: T.font }}
                >
                  View all notifications →
                </button>
              </div>
            </div>
      }
    </WidgetCard>
  )
}

// ── My Projects Widget ────────────────────────────────────────────────────────
const PROJECT_STATUS_COLORS = {
  todo:        { color: '#64748b', bg: '#f1f5f9', label: 'To Do'       },
  in_progress: { color: '#2563eb', bg: '#eff6ff', label: 'In Progress' },
  review:      { color: '#d97706', bg: '#fffbeb', label: 'Review'      },
  done:        { color: '#16a34a', bg: '#f0fdf4', label: 'Done'        },
}

function MyProjectsWidget() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [min, toggle]           = useWidget('my-projects')
  const navigate                = useNavigate()

  useEffect(() => {
    if (min) return
    api.getProjects('?assigned_to=me&limit=5')
      .then(data => setProjects((data.rows || data || []).slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [min])

  const fmtShort = (d) => {
    if (!d) return null
    const dt = new Date(d)
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <WidgetCard
      title="My Projects"
      icon="📋"
      badge={projects.length || null}
      badgeColor="#6366f1"
      minimized={min}
      onToggle={toggle}
      action={
        <button
          onClick={e => { e.stopPropagation(); navigate('/projects') }}
          style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: T.font }}
        >
          View all →
        </button>
      }
    >
      {loading ? (
        <div style={{ padding: '16px 20px', fontSize: 12, color: T.muted }}>Loading…</div>
      ) : projects.length === 0 ? (
        <div style={{ padding: '16px 20px', fontSize: 12, color: T.muted }}>
          No active projects.{' '}
          <span
            onClick={() => navigate('/projects')}
            style={{ color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}
          >
            Create one →
          </span>
        </div>
      ) : (
        <div>
          {projects.map((p, idx) => {
            const sc = PROJECT_STATUS_COLORS[p.status] || PROJECT_STATUS_COLORS.todo
            const due = fmtShort(p.due_date)
            const overdue = p.due_date && p.status !== 'done' && new Date(p.due_date) < new Date()
            return (
              <div
                key={p.id}
                onClick={() => navigate('/projects')}
                style={{
                  padding: '10px 18px',
                  borderBottom: idx < projects.length - 1 ? `1px solid ${T.border}` : 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8f9fc' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 3, height: 32, borderRadius: 2, background: p.cover_color || '#6366f1', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                        background: sc.bg, color: sc.color,
                      }}>
                        {sc.label}
                      </span>
                      {due && (
                        <span style={{ fontSize: 10, color: overdue ? T.red : T.muted, fontWeight: overdue ? 600 : 400 }}>
                          {overdue ? '⚠ ' : ''}{due}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.navy }}>{p.progress || 0}%</div>
                    <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${p.progress || 0}%`, height: '100%', background: '#6366f1', borderRadius: 2 }} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.border}`, textAlign: 'center' }}>
            <button
              onClick={() => navigate('/projects')}
              style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: T.font }}
            >
              View all projects →
            </button>
          </div>
        </div>
      )}
    </WidgetCard>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  // ── State ──
  const [tickets,    setTickets]    = useState({ open: null, pending: null, resolved: null })
  const [assets,     setAssets]     = useState([])
  const [users,      setUsers]      = useState([])
  const [activity,   setActivity]   = useState([])
  const [alerts,     setAlerts]     = useState([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [loading,    setLoading]    = useState(true)
  const [categoryMap, setCategoryMap] = useState({})
  const [locationMap, setLocationMap] = useState({})

  const esAlertRef = useRef(null)

  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0]
  const services  = user?.services || {}

  // ── Parallel data load ──
  useEffect(() => {
    Promise.all([
      api.getAssets().catch(() => ({ rows: [], total: 0 })),
      api.getTicketCount().catch(() => ({ open: null, pending: null, resolved: null })),
      api.getUsers().catch(() => []),
      api.getActivity(10).catch(() => ({ rows: [] })),
    ]).then(([assetData, ticketData, userData, activityData]) => {
      setAssets(assetData.rows || [])
      setTickets(ticketData)
      setUsers(Array.isArray(userData) ? userData : [])
      setActivity(activityData.rows || [])
      setLoading(false)
    })
  }, [])

  // ── Notifications ──
  useEffect(() => {
    setAlertsLoading(true)
    api.getNotifications()
      .then(data => setAlerts((Array.isArray(data) ? data : []).filter(n => !n.read)))
      .catch(() => {})
      .finally(() => setAlertsLoading(false))
  }, [])

  // ── Notifications SSE ──
  useEffect(() => {
    const url = api.getNotificationsLiveUrl()
    const es  = new EventSource(url)
    esAlertRef.current = es
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type !== 'notification') return
        const n = { ...data.notification, message: data.notification.message || data.notification.body }
        setAlerts(prev => [n, ...prev])
      } catch {}
    }
    return () => es.close()
  }, [])

  // ── Category / Location maps from API ──
  useEffect(() => {
    api.getAssetsByCategory()
      .then(data => setCategoryMap(Object.fromEntries((data.rows || []).map(r => [r.category, parseInt(r.count)]))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    api.getAssetsByLocation()
      .then(data => setLocationMap(Object.fromEntries((data.rows || []).map(r => [r.location, parseInt(r.count)]))))
      .catch(() => {})
  }, [])

  // ── Derived data ──
  const total        = assets.length
  const onlineCount  = assets.filter(a => a.online).length
  const offlineCount = assets.filter(a => !a.online).length

  const statusMap = assets.reduce((acc, a) => {
    const s = a.status || 'Unknown'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const warrantyCount = alerts.filter(n => n.type === 'warranty_expiring').length
  const activeServiceList = Object.entries(services).filter(([, s]) => s === 'active').map(([k]) => k)
  const serviceIcons  = { tickets: '🎫', assets: '💻', chat: '💬', files: '📁', projects: '📋', status: '🟢', grafana: '📊' }
  const serviceLabels = { tickets: 'Tickets', assets: 'Assets', chat: 'Chat', files: 'Files', projects: 'Projects', status: 'Status', grafana: 'Analytics' }

  const stats = [
    {
      label: 'Open Tickets',
      value: tickets.open ?? '—',
      icon: '🎫', color: '#ff6b35',
      sub: tickets.pending != null ? `${tickets.pending} pending` : 'View in tickets',
      path: '/tickets',
    },
    {
      label: 'Total Assets',
      value: loading ? '…' : total,
      icon: '💻', color: '#378ADD',
      sub: 'View in assets',
      path: '/assets',
      offline: offlineCount,
      warranty: warrantyCount,
    },
    {
      label: 'Services Active',
      value: activeServiceList.length,
      icon: '🟢', color: T.green,
      sub: `of ${Object.keys(services).length} total`,
    },
    {
      label: 'Team Members',
      value: loading ? '…' : users.length,
      icon: '👥', color: T.purple,
      sub: `${users.filter(u => u.active !== false).length} active`,
      path: '/settings',
    },
  ]

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 28, background: T.bg, fontFamily: T.font }}>

      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: T.navy, margin: 0 }}>
          {greeting}, {firstName} 👋
        </h1>
        <p style={{ fontSize: 13, color: T.muted, margin: '4px 0 0' }}>
          {user?.company} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500 }}>{stat.label}</span>
              <span style={{ fontSize: 18 }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, lineHeight: 1, marginBottom: 6 }}>
              {stat.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 11, color: T.mutedLight }}>{stat.sub}</div>
              {stat.offline > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 9, background: T.yellow + '22', color: T.yellow }}>
                  {stat.offline} offline
                </span>
              )}
              {stat.warranty > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 9, background: T.red + '18', color: T.red }}>
                  {stat.warranty} warranty
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Your Services */}
      {activeServiceList.length > 0 && (
        <div style={{ background: T.card, borderRadius: 12, padding: '16px 20px', border: `1px solid ${T.border}`, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 }}>Your Services</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {activeServiceList.map(key => (
              <button key={key} onClick={() => navigate('/' + key)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: '#f7f8fa', border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 8, padding: '8px 14px', fontSize: 13,
                color: T.navy, cursor: 'pointer', fontWeight: 500, fontFamily: T.font,
              }}>
                <span>{serviceIcons[key] || '⚙️'}</span>
                <span>{serviceLabels[key] || key}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Widget grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>

        {/* Row 1: Asset Summary — full width */}
        <AssetSummaryWidget statusMap={statusMap} total={total} />

        {/* Row 2 */}
        <OnlineWidget
          online={onlineCount}
          offline={offlineCount}
          total={total}
          liveUrl={services.assets === 'active' ? api.getLiveUrl() : null}
        />
        <ActivityWidget rows={activity} />

        {/* Row 3 */}
        <CategoriesWidget categoryMap={categoryMap} />
        <LocationsWidget locationMap={locationMap} />

        {/* Row 4 */}
        <PeopleWidget users={users} />
        <AlertsWidget alerts={alerts} loading={alertsLoading} />

        {/* Row 5 — Projects (only if service active) */}
        {services.projects === 'active' && (
          <MyProjectsWidget />
        )}

      </div>
    </div>
  )
}
