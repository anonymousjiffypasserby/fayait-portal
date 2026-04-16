import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { T, isOnline } from './shared'

// ── View groups ───────────────────────────────────────────────────────────────

const ASSET_VIEWS = [
  { key: 'all',          label: 'List All',        icon: '≡' },
  { key: 'deployed',     label: 'Deployed',         icon: '●', status: 'Deployed' },
  { key: 'ready',        label: 'Ready to Deploy',  icon: '◯', status: 'Ready to Deploy' },
  { key: 'pending',      label: 'Pending',          icon: '◔', status: 'Pending' },
  { key: 'maintenance',  label: 'Maintenance',      icon: '⚙', status: 'Maintenance' },
  { key: 'undeployable', label: 'Un-deployable',    icon: '⊘', status: 'Un-deployable' },
  { key: 'archived',     label: 'Archived',         icon: '▣', status: 'Archived' },
  { key: 'lost_stolen',  label: 'Lost / Stolen',    icon: '⚠', status: 'Lost/Stolen' },
  { key: 'requestable',  label: 'Requestable',      icon: '✋' },
]

const ACTION_VIEWS = [
  { key: 'quick_scan',    label: 'Quick Scan Checkin', icon: '⌖' },
  { key: 'bulk_checkout', label: 'Bulk Checkout',      icon: '↗' },
  { key: 'bulk_audit',    label: 'Bulk Audit',         icon: '✎' },
  { key: 'import',        label: 'Import',             icon: '⬆' },
]

const MANAGE_VIEWS = [
  { key: 'maintenances', label: 'Maintenances',    icon: '⚒',  type: 'view' },
  { key: 'requests',     label: 'Requests',        icon: '📋', type: 'module' },
  { key: 'due_audit',    label: 'Due for Audit',   icon: '✎',  type: 'view' },
  { key: 'due_checkin',  label: 'Due for Checkin', icon: '↩',  type: 'view' },
  { key: 'deleted',      label: 'Deleted',         icon: '⊘',  type: 'view' },
]

// ── Inventory modules with their sub-views ────────────────────────────────────

const INVENTORY_MODULES = [
  {
    key: 'accessories', label: 'Accessories', icon: '🔌',
    views: [
      { key: 'all',        label: 'All' },
      { key: 'available',  label: 'Available' },
      { key: 'checkedout', label: 'Checked Out' },
      { key: 'requestable',label: 'Requestable' },
      { key: 'lowstock',   label: 'Low Stock' },
      { key: 'retired',    label: 'Retired' },
    ],
  },
  {
    key: 'consumables', label: 'Consumables', icon: '📦',
    views: [
      { key: 'all',        label: 'All' },
      { key: 'available',  label: 'Available' },
      { key: 'outofstock', label: 'Out of Stock' },
      { key: 'lowstock',   label: 'Low Stock' },
      { key: 'requestable',label: 'Requestable' },
      { key: 'retired',    label: 'Retired' },
    ],
  },
  {
    key: 'components', label: 'Components', icon: '🔩',
    views: [
      { key: 'all',       label: 'All' },
      { key: 'available', label: 'Available' },
      { key: 'installed', label: 'Installed' },
      { key: 'lowstock',  label: 'Low Stock' },
      { key: 'retired',   label: 'Retired' },
    ],
  },
  {
    key: 'kits', label: 'Predefined Kits', icon: '🗃',
    views: [
      { key: 'all',        label: 'All' },
      { key: 'available',  label: 'Available' },
      { key: 'checkedout', label: 'Checked Out' },
    ],
  },
  {
    key: 'licenses', label: 'Licenses', icon: '🔑',
    views: [],
  },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function Sidebar({ activeView, onViewChange, assets, mobileOpen, onMobileClose }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeModule  = searchParams.get('module')
  const activeSubView = searchParams.get('view') || 'all'

  // Track which inventory accordion is expanded (default: expand active module)
  const [expanded, setExpanded] = useState(activeModule || null)

  // ── Badge counts ────────────────────────────────────────────────────────────
  const countFor = (view) => {
    if (view.key === 'all') return assets.length
    if (view.status) return assets.filter(a => a.status === view.status && !a.retired).length
    if (view.key === 'requestable') return assets.filter(a => a.requestable && !a.retired).length
    if (view.key === 'due_audit') {
      const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
      return assets.filter(a => !a.last_audited_at || new Date(a.last_audited_at).getTime() < oneYearAgo).length
    }
    if (view.key === 'due_checkin') {
      return assets.filter(a => a.expected_checkin_date && new Date(a.expected_checkin_date) < new Date()).length
    }
    return null
  }

  // ── Shared styles ───────────────────────────────────────────────────────────
  const itemStyle = (active) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
    background: active ? T.navy : 'transparent',
    color: active ? '#fff' : T.text,
    fontSize: 13, fontWeight: active ? 600 : 400,
    transition: 'background 0.12s', marginBottom: 1, userSelect: 'none',
  })

  const hoverHandlers = (active) => ({
    onMouseEnter: e => { if (!active) e.currentTarget.style.background = '#eef0f3' },
    onMouseLeave: e => { if (!active) e.currentTarget.style.background = 'transparent' },
  })

  const NavItem = ({ view, active, onClick }) => {
    const count = countFor(view)
    return (
      <div onClick={onClick} style={itemStyle(active)} {...hoverHandlers(active)}>
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
    <div style={{
      padding: '14px 10px 4px', fontSize: 9, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: 1.2, color: T.muted,
    }}>
      {label}
    </div>
  )

  // ── Module navigation helpers ───────────────────────────────────────────────
  const goModule = (key) => setSearchParams({ module: key })

  const goModuleView = (moduleKey, viewKey) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('module', moduleKey)
      if (viewKey === 'all') next.delete('view'); else next.set('view', viewKey)
      return next
    })
  }

  const toggleModule = (key) => {
    if (expanded === key) {
      setExpanded(null)
    } else {
      setExpanded(key)
      goModule(key)
    }
  }

  const onlineCount  = assets.filter(isOnline).length
  const offlineCount = assets.length - onlineCount

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (isMobile && !mobileOpen) return null

  return (
    <>
    {isMobile && (
      <div
        onClick={onMobileClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 899 }}
      />
    )}
    <div className="assets-sidebar" style={{
      width: 210, flexShrink: 0,
      borderRight: `1px solid ${T.border}`,
      padding: '12px 8px 24px',
      background: '#fafbfc',
      minHeight: 'calc(100vh - 56px)',
      overflowY: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      boxSizing: 'border-box',
      ...(isMobile ? {
        position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 900, minHeight: '100vh', boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
      } : {}),
    }}>
      <style>{`.assets-sidebar::-webkit-scrollbar{display:none}`}</style>

      {/* Online / Offline mini stats */}
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

      {/* ── ASSETS ── */}
      <Divider label="Assets" />
      {ASSET_VIEWS.map(v => (
        <NavItem key={v.key} view={v}
          active={!activeModule && activeView === v.key}
          onClick={() => onViewChange(v.key)}
        />
      ))}

      {/* ── ACTIONS ── */}
      <Divider label="Actions" />
      {ACTION_VIEWS.map(v => (
        <NavItem key={v.key} view={v}
          active={!activeModule && activeView === v.key}
          onClick={() => onViewChange(v.key)}
        />
      ))}

      {/* ── OTHER INVENTORY (accordion) ── */}
      <Divider label="Other Inventory" />
      {INVENTORY_MODULES.map(m => {
        const isOpen = expanded === m.key
        const isActive = activeModule === m.key

        return (
          <div key={m.key}>
            {/* Module header row */}
            <div
              onClick={() => toggleModule(m.key)}
              style={{
                ...itemStyle(isActive && !searchParams.get('view')),
                justifyContent: 'space-between',
              }}
              {...hoverHandlers(isActive && !searchParams.get('view'))}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 13, width: 16, textAlign: 'center', opacity: 0.75 }}>{m.icon}</span>
                <span>{m.label}</span>
              </span>
              <span style={{
                fontSize: 10, color: isActive ? '#fff' : T.muted,
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s',
                display: 'inline-block',
              }}>▶</span>
            </div>

            {/* Sub-views (expanded) */}
            {isOpen && m.views.length > 0 && (
              <div style={{ marginLeft: 12, marginBottom: 2 }}>
                {m.views.map(sv => {
                  const subActive = isActive && activeSubView === sv.key
                  return (
                    <div
                      key={sv.key}
                      onClick={() => goModuleView(m.key, sv.key)}
                      style={{
                        ...itemStyle(subActive),
                        fontSize: 12,
                        padding: '6px 10px',
                      }}
                      {...hoverHandlers(subActive)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, color: subActive ? '#fff' : T.muted }}>–</span>
                        <span>{sv.label}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {isOpen && m.views.length === 0 && (
              <div style={{ marginLeft: 24, marginBottom: 6, fontSize: 11, color: T.muted, fontStyle: 'italic' }}>
                Coming soon
              </div>
            )}
          </div>
        )
      })}

      {/* ── MANAGE ── */}
      <Divider label="Manage" />
      {MANAGE_VIEWS.map(v => (
        <NavItem key={v.key} view={v}
          active={v.type === 'module' ? activeModule === v.key : (!activeModule && activeView === v.key)}
          onClick={() => v.type === 'module' ? goModule(v.key) : onViewChange(v.key)}
        />
      ))}

      {/* ── LINKS ── */}
      <Divider label="Links" />
      <NavItem
        view={{ key: 'reports', label: 'Reports', icon: '📊' }}
        active={activeModule === 'reports'}
        onClick={() => goModule('reports')}
      />
      <div
        onClick={() => navigate('/settings')}
        style={itemStyle(false)}
        {...hoverHandlers(false)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 13, width: 16, textAlign: 'center', opacity: 0.75 }}>⚙</span>
          <span>Settings</span>
        </span>
      </div>
    </div>
    </>
  )
}
