import { T, isLowStock, availableQty } from './shared'

const VIEWS = [
  { key: 'all',         label: 'List All',    icon: '≡' },
  { key: 'available',   label: 'Available',   icon: '◯' },
  { key: 'checkedout',  label: 'Checked Out', icon: '↗' },
  { key: 'requestable', label: 'Requestable', icon: '✋' },
  { key: 'lowstock',    label: 'Low Stock',   icon: '⚠' },
  { key: 'retired',     label: 'Retired',     icon: '⊘' },
]

export default function Sidebar({ activeView, onViewChange, accessories }) {
  const countFor = (view) => {
    if (view.key === 'all')        return accessories.length
    if (view.key === 'available')  return accessories.filter(a => availableQty(a) > 0 && !a.retired).length
    if (view.key === 'checkedout') return accessories.filter(a => (a.qty_checked_out || 0) > 0).length
    if (view.key === 'requestable')return accessories.filter(a => a.requestable && !a.retired).length
    if (view.key === 'lowstock')   return accessories.filter(isLowStock).length
    if (view.key === 'retired')    return null
    return null
  }

  const totalQty      = accessories.reduce((s, a) => s + (a.quantity || 0), 0)
  const checkedOutQty = accessories.reduce((s, a) => s + (a.qty_checked_out || 0), 0)

  const NavItem = ({ view }) => {
    const active = activeView === view.key
    const count  = countFor(view)
    const warn   = view.key === 'lowstock' && count > 0
    return (
      <div
        onClick={() => onViewChange(view.key)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
          background: active ? T.navy : 'transparent',
          color: active ? '#fff' : warn ? T.yellow : T.text,
          fontSize: 13, fontWeight: active ? 600 : 400,
          transition: 'background 0.12s', marginBottom: 1, userSelect: 'none',
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
            background: active ? 'rgba(255,255,255,0.18)' : warn ? T.yellow + '22' : '#e8eaed',
            color: active ? '#fff' : warn ? T.yellow : T.muted,
            padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center',
          }}>{count}</span>
        )}
      </div>
    )
  }

  const Divider = ({ label }) => (
    <div style={{ padding: '12px 10px 4px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: T.muted }}>
      {label}
    </div>
  )

  return (
    <div style={{
      width: 200, flexShrink: 0,
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
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Total</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.navy }}>{totalQty}</div>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '8px 10px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Out</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.blue }}>{checkedOutQty}</div>
        </div>
      </div>

      <Divider label="Accessories" />
      {VIEWS.map(v => <NavItem key={v.key} view={v} />)}
    </div>
  )
}
