import { useNavigate } from 'react-router-dom'
import { T, isOnline } from './shared'

const VIEWS = [
  { key: 'all', label: 'List All', icon: '≡' },
  { key: 'deployed', label: 'Deployed', icon: '●', status: 'Deployed' },
  { key: 'ready', label: 'Ready to Deploy', icon: '◯', status: 'Ready to Deploy' },
  { key: 'pending', label: 'Pending', icon: '◔', status: 'Pending' },
  { key: 'maintenance', label: 'Maintenance', icon: '⚙', status: 'Maintenance' },
  { key: 'archived', label: 'Archived', icon: '▣', status: 'Archived' },
  { key: 'undeployable', label: 'Un-deployable', icon: '⊘', status: 'Un-deployable' },
  { key: 'lost_stolen', label: 'Lost / Stolen', icon: '⚠', status: 'Lost/Stolen' },
]

const REPORT_VIEWS = [
  { key: 'due_audit', label: 'Due for Audit', icon: '✎' },
  { key: 'due_checkin', label: 'Due for Checkin', icon: '↩' },
  { key: 'deleted', label: 'Deleted', icon: '⊘' },
]

const TOOL_VIEWS = [
  { key: 'maintenances', label: 'Maintenances', icon: '⚒' },
]

export default function Sidebar({ activeView, onViewChange, assets }) {
  const navigate = useNavigate()
  const countFor = (view) => {
    if (view.key === 'all') return assets.length
    if (view.key === 'deleted') return null // needs separate fetch
    if (view.key === 'maintenances') return null
    if (view.key === 'due_audit') {
      const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
      return assets.filter(a => !a.last_audited_at || new Date(a.last_audited_at).getTime() < oneYearAgo).length
    }
    if (view.key === 'due_checkin') {
      return assets.filter(a => a.expected_checkin_date && new Date(a.expected_checkin_date) < new Date()).length
    }
    if (view.status) return assets.filter(a => a.status === view.status).length
    return null
  }

  const NavItem = ({ view }) => {
    const active = activeView === view.key
    const count = countFor(view)
    return (
      <div
        onClick={() => onViewChange(view.key)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px',
          borderRadius: 7,
          cursor: 'pointer',
          background: active ? T.navy : 'transparent',
          color: active ? '#fff' : T.text,
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          transition: 'background 0.12s',
          marginBottom: 1,
          userSelect: 'none',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#eef0f3' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 13, width: 16, textAlign: 'center', opacity: 0.75 }}>{view.icon}</span>
          <span>{view.label}</span>
        </span>
        {count !== null && count > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700,
            background: active ? 'rgba(255,255,255,0.18)' : '#e8eaed',
            color: active ? '#fff' : T.muted,
            padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center',
          }}>
            {count}
          </span>
        )}
      </div>
    )
  }

  const Divider = ({ label }) => (
    <div style={{ padding: '12px 10px 4px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: T.muted }}>
      {label}
    </div>
  )

  // Online/offline mini stats
  const onlineCount = assets.filter(isOnline).length
  const offlineCount = assets.length - onlineCount

  return (
    <div style={{
      width: 200,
      flexShrink: 0,
      borderRight: `1px solid ${T.border}`,
      padding: '12px 8px 24px',
      background: '#fafbfc',
      minHeight: 'calc(100vh - 56px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
    }}>
      {/* Quick stats */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, padding: '0 2px' }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '8px 10px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Online</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.green }}>{onlineCount}</div>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '8px 10px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Offline</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.red }}>{offlineCount}</div>
        </div>
      </div>

      <Divider label="Assets" />
      {VIEWS.map(v => <NavItem key={v.key} view={v} />)}

      <Divider label="Reports" />
      {REPORT_VIEWS.map(v => <NavItem key={v.key} view={v} />)}

      <Divider label="Tools" />
      {TOOL_VIEWS.map(v => <NavItem key={v.key} view={v} />)}

      <Divider label="Inventory" />
      <div
        onClick={() => navigate('/accessories')}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
          color: T.text, fontSize: 13, userSelect: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#eef0f3' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ fontSize: 13, width: 16, textAlign: 'center', opacity: 0.75 }}>🔌</span>
        <span>Accessories</span>
      </div>
      <div
        onClick={() => navigate('/consumables')}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
          color: T.text, fontSize: 13, userSelect: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#eef0f3' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ fontSize: 13, width: 16, textAlign: 'center', opacity: 0.75 }}>📦</span>
        <span>Consumables</span>
      </div>
      <div
        onClick={() => navigate('/components')}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
          color: T.text, fontSize: 13, userSelect: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#eef0f3' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ fontSize: 13, width: 16, textAlign: 'center', opacity: 0.75 }}>🔩</span>
        <span>Components</span>
      </div>
    </div>
  )
}
