import { useState, useEffect, Component } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePermission } from '../hooks/usePermission'
import NotificationBell from './NotificationBell'
import ServiceFrame from '../pages/ServiceFrame'

class ServiceFrameBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(err) { return { error: err } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#f0f2f5', color: '#888', fontSize: 13 }}>
          Service unavailable
        </div>
      )
    }
    return this.props.children
  }
}

const IFRAME_SERVICES = [
  { key: 'chat',    path: '/chat'    },
  { key: 'grafana', path: '/grafana' },
  { key: 'files',   path: '/files'   },
  { key: 'status',  path: '/status'  },
  // tickets and hr are custom React modules — not iframe services
]

const SERVICES = [
  {
    section: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: '⊞', path: '/' },
    ]
  },
  {
    section: 'Workspace',
    items: [
      { key: 'tickets',  label: 'Tickets',  icon: '🎫', path: '/tickets' },
      { key: 'assets',   label: 'Assets',   icon: '💻', path: '/assets',   permissionModule: 'assets' },
      { key: 'chat',     label: 'Chat',     icon: '💬', path: '/chat' },
      { key: 'files',    label: 'Files',    icon: '📁', path: '/files' },
      { key: 'projects', label: 'Projects', icon: '📋', path: '/projects', permissionModule: 'projects' },
      { key: 'hr',       label: 'HR',       icon: '👔', path: '/hr',       permissionModule: 'hr_employees' },
    ]
  },
  {
    section: 'Monitoring',
    items: [
      { key: 'status',  label: 'Status',    icon: '🟢', path: '/status' },
      { key: 'grafana', label: 'Analytics', icon: '📊', path: '/grafana' },
    ]
  },
  {
    section: 'Account',
    items: [
      { key: 'users',   label: 'Users',   icon: '👥', path: '/users',   permissionModule: 'users' },
      { key: 'billing', label: 'Billing', icon: '💳', path: '/billing' },
      { key: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
    ]
  },
  {
    section: 'Admin',
    adminOnly: true,
    items: [
      { key: 'settings', label: 'Settings',  icon: '⚙', path: '/settings', alwaysVisible: true },
      { key: 'reports',  label: 'Reports',   icon: '📈', path: '/reports',  alwaysVisible: true, permissionModule: 'reports' },
      { key: 'admin',    label: 'Companies', icon: '🏢', path: '/admin',    alwaysVisible: true, superadminOnly: true },
    ]
  },
]

const ADMIN_ROLES = ['superadmin', 'admin']

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { hasPermission } = usePermission()
  const navigate = useNavigate()
  const location = useLocation()
  const [hovered, setHovered] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [globalToast, setGlobalToast] = useState(null)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      setGlobalToast(e.detail?.message || 'Permission denied')
      setTimeout(() => setGlobalToast(null), 4000)
    }
    window.addEventListener('app:error', handler)
    return () => window.removeEventListener('app:error', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const isAdmin = ADMIN_ROLES.includes(user?.role)
  const services = user?.services || {}

  const visibleSections = SERVICES.map(section => {
    if (section.adminOnly && !isAdmin) return { ...section, items: [] }
    return {
      ...section,
      items: section.items.filter(item => {
        if (item.superadminOnly && user?.role !== 'superadmin') return false
        if (item.alwaysVisible) return !item.permissionModule || hasPermission(item.permissionModule, 'view')
        if (item.key === 'dashboard') return true
        if (['billing', 'profile'].includes(item.key)) return true
        if (item.permissionModule && !hasPermission(item.permissionModule, 'view')) return false
        if (item.key === 'users') return true
        const status = services[item.key]
        if (status === 'active') return true
        if (isAdmin) return true
        return false
      })
    }
  }).filter(section => section.items.length > 0)

  return (
    <>
    <style>{`.faya-nav::-webkit-scrollbar{display:none}`}</style>
    {globalToast && (
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        background: '#1e1e2e', color: '#fff', borderRadius: 10,
        padding: '12px 18px', fontSize: 13, fontWeight: 500,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,100,100,0.3)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ color: '#f87171' }}>⛔</span>
        {globalToast}
      </div>
    )}
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: '#0b0f1a',
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      position: 'relative',
    }}>
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar - overlays content */}
      <aside
        onMouseEnter={() => !isMobile && setHovered(true)}
        onMouseLeave={() => !isMobile && setHovered(false)}
        style={{
          position: isMobile ? 'fixed' : 'absolute',
          top: 0,
          left: isMobile && !mobileOpen ? -220 : 0,
          bottom: 0,
          width: isMobile ? 220 : hovered ? 220 : 60,
          background: '#0b0f1a',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          transition: isMobile ? 'left 0.2s ease' : 'width 0.2s ease',
          overflow: 'hidden',
          zIndex: isMobile ? 1000 : 100,
          boxShadow: (hovered || mobileOpen) ? '4px 0 24px rgba(0,0,0,0.4)' : 'none',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}>
          <div style={{
            width: 28, height: 28,
            background: 'linear-gradient(135deg, #ff6b35, #f7c59f)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>F</div>
          {(hovered || isMobile) && (
            <div style={{ marginLeft: 10, flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>Faya IT</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{user?.company}</div>
            </div>
          )}
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 18, cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}
            >✕</button>
          )}
        </div>

        {/* Nav */}
        <nav className="faya-nav" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {visibleSections.map((section) => (
            <div key={section.section}>
              {(hovered || isMobile) && (
                <div style={{
                  fontSize: 9, color: 'rgba(255,255,255,0.2)',
                  letterSpacing: 1.5, textTransform: 'uppercase',
                  padding: '12px 16px 4px', whiteSpace: 'nowrap',
                }}>
                  {section.section}
                </div>
              )}
              {section.items.map((item) => {
                const active = isActive(item.path)
                const status = services[item.key]
                const locked = status !== 'active' && !['dashboard', 'users', 'billing', 'profile'].includes(item.key)
                return (
                  <button
                    key={item.key}
                    onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false) }}
                    title={!hovered ? item.label : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '9px 16px',
                      border: 'none',
                      background: active ? 'rgba(255,107,53,0.12)' : 'transparent',
                      borderLeft: active ? '2px solid #ff6b35' : '2px solid transparent',
                      color: active ? '#ff6b35' : locked ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.55)',
                      cursor: 'pointer', fontSize: 13, textAlign: 'left',
                      whiteSpace: 'nowrap', overflow: 'hidden',
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0, width: 20, textAlign: 'center' }}>{item.icon}</span>
                    {(hovered || isMobile) && (
                      <span style={{ flex: 1 }}>{item.label}</span>
                    )}
                    {(hovered || isMobile) && locked && (
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>🔒</span>
                    )}
                  </button>
                )
              })}
              {!hovered && <div style={{ height: 8 }} />}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '8px 16px', flexShrink: 0,
          overflow: 'hidden', whiteSpace: 'nowrap',
        }}>
          {/* Notification bell row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: (hovered || isMobile) ? 'flex-start' : 'center', marginBottom: 6 }}>
            <NotificationBell hovered={hovered || isMobile} />
            {(hovered || isMobile) && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>Notifications</span>}
          </div>
          {(hovered || isMobile) ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{user?.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>{user?.role}</div>
              </div>
              <button onClick={handleLogout} style={{
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: 'rgba(255,255,255,0.4)', fontSize: 16,
                width: 30, height: 30, borderRadius: 6, cursor: 'pointer',
              }}>⇥</button>
            </div>
          ) : (
            <button onClick={handleLogout} style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.3)', fontSize: 18,
              cursor: 'pointer', padding: 0,
            }}>⇥</button>
          )}
        </div>
      </aside>

      {/* Main - full width, sidebar overlays it */}
      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : 60,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#f0f2f5',
        height: '100vh',
        position: 'relative',
      }}>
        {isMobile && (
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              position: 'fixed', top: 10, left: 10, zIndex: 998,
              background: '#0b0f1a', border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 20, width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >☰</button>
        )}

        {/* Persistent iframe services — mounted once, shown/hidden by path */}
        {IFRAME_SERVICES.map(({ key, path }) => {
          if (services[key] !== 'active') return null
          const visible = location.pathname === path || location.pathname.startsWith(path + '/')
          return (
            <div
              key={key}
              style={{
                position: 'absolute', inset: 0,
                display: visible ? 'flex' : 'none',
                zIndex: 50,
              }}
            >
              <ServiceFrameBoundary>
                <ServiceFrame service={key} />
              </ServiceFrameBoundary>
            </div>
          )
        })}

        {children}
      </main>
    </div>
    </>
  )
}
