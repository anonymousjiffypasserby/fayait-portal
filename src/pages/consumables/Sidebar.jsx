import { T, isLowStock, isOutOfStock } from './shared'

const VIEWS = [
  { key: 'all',         label: 'List All',     icon: '≡' },
  { key: 'available',   label: 'Available',    icon: '◯' },
  { key: 'outofstock',  label: 'Out of Stock', icon: '⊘' },
  { key: 'lowstock',    label: 'Low Stock',    icon: '⚠' },
  { key: 'requestable', label: 'Requestable',  icon: '✋' },
  { key: 'retired',     label: 'Retired',      icon: '▣' },
]

export default function Sidebar({ activeView, onViewChange, consumables }) {
  const countFor = (view) => {
    if (view.key === 'all')        return consumables.length
    if (view.key === 'available')  return consumables.filter(c => !c.retired && (c.quantity || 0) > 0).length
    if (view.key === 'outofstock') return consumables.filter(isOutOfStock).length
    if (view.key === 'lowstock')   return consumables.filter(isLowStock).length
    if (view.key === 'requestable')return consumables.filter(c => c.requestable && !c.retired).length
    if (view.key === 'retired')    return null
    return null
  }

  const totalQty = consumables.reduce((s, c) => s + (c.quantity || 0), 0)
  const outCount = consumables.filter(isOutOfStock).length

  const NavItem = ({ view }) => {
    const active = activeView === view.key
    const count  = countFor(view)
    const warn   = (view.key === 'lowstock' || view.key === 'outofstock') && count > 0
    return (
      <div
        onClick={() => onViewChange(view.key)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
          background: active ? T.navy : 'transparent',
          color: active ? '#fff' : warn ? (view.key === 'outofstock' ? T.red : T.yellow) : T.text,
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
            background: active ? 'rgba(255,255,255,0.18)' : warn
              ? (view.key === 'outofstock' ? T.red + '22' : T.yellow + '22')
              : '#e8eaed',
            color: active ? '#fff' : warn
              ? (view.key === 'outofstock' ? T.red : T.yellow)
              : T.muted,
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
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, padding: '0 2px' }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '8px 10px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>In Stock</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.navy }}>{totalQty}</div>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '8px 10px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Out</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: outCount > 0 ? T.red : T.muted }}>{outCount}</div>
        </div>
      </div>

      <Divider label="Consumables" />
      {VIEWS.map(v => <NavItem key={v.key} view={v} />)}
    </div>
  )
}
