import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
      { key: 'tickets', label: 'Tickets', icon: '🎫', path: '/tickets' },
      { key: 'assets',       label: 'Assets',       icon: '💻', path: '/assets' },
      { key: 'accessories', label: 'Accessories',  icon: '🔌', path: '/accessories', alwaysVisible: true },
      { key: 'consumables', label: 'Consumables',  icon: '📦', path: '/consumables', alwaysVisible: true },
      { key: 'components',  label: 'Components',   icon: '🔩', path: '/components',  alwaysVisible: true },
      { key: 'chat', label: 'Chat', icon: '💬', path: '/chat' },
      { key: 'files', label: 'Files', icon: '📁', path: '/files' },
      { key: 'projects', label: 'Projects', icon: '📋', path: '/projects' },
    ]
  },
  {
    section: 'Monitoring',
    items: [
      { key: 'status', label: 'Status', icon: '🟢', path: '/status' },
      { key: 'grafana', label: 'Analytics', icon: '📊', path: '/grafana' },
    ]
  },
  {
    section: 'Account',
    items: [
      { key: 'users', label: 'Users', icon: '👥', path: '/users' },
      { key: 'billing', label: 'Billing', icon: '💳', path: '/billing' },
      { key: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
    ]
  },
  {
    section: 'Admin',
    adminOnly: true,
    items: [
      { key: 'settings', label: 'Settings', icon: '⚙', path: '/settings', alwaysVisible: true },
    ]
  },
]

const ADMIN_ROLES = ['superadmin', 'admin']

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [hovered, setHovered] = useState(false)

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
        if (item.alwaysVisible) return true
        if (item.key === 'dashboard') return true
        if (['users', 'billing', 'profile'].includes(item.key)) return true
        const status = services[item.key]
        if (status === 'active') return true
        if (isAdmin) return true
        return false
      })
    }
  }).filter(section => section.items.length > 0)

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: '#0b0f1a',
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      position: 'relative',
    }}>
      {/* Sidebar - overlays content */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: hovered ? 220 : 60,
          background: '#0b0f1a',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
          zIndex: 100,
          boxShadow: hovered ? '4px 0 24px rgba(0,0,0,0.4)' : 'none',
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
          {hovered && (
            <div style={{ marginLeft: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>Faya IT</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{user?.company}</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
          {visibleSections.map((section) => (
            <div key={section.section}>
              {hovered && (
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
                    onClick={() => navigate(item.path)}
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
                    {hovered && (
                      <span style={{ flex: 1 }}>{item.label}</span>
                    )}
                    {hovered && locked && (
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
          padding: '12px 16px', flexShrink: 0,
          overflow: 'hidden', whiteSpace: 'nowrap',
        }}>
          {hovered ? (
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
        marginLeft: 60,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#f0f2f5',
        height: '100vh',
      }}>
        {children}
      </main>
    </div>
  )
}
