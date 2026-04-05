import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [lang, setLang] = useState('EN')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/', label: lang === 'EN' ? 'Dashboard' : 'Dashboard', section: 'Overview' },
    { to: '/tickets', label: lang === 'EN' ? 'Tickets' : 'Tickets', section: 'Services' },
    { to: '/assets', label: lang === 'EN' ? 'Assets' : 'Activa', section: null },
    { to: '/status', label: lang === 'EN' ? 'Status' : 'Status', section: null },
    { to: '/users', label: lang === 'EN' ? 'Users' : 'Gebruikers', section: 'Admin' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 220, background: 'var(--faya-navy)', display: 'flex',
        flexDirection: 'column', flexShrink: 0
      }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 4 }}>
            POWERED BY
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 8 }}>
            Faya IT Services
          </div>
          <span style={{
            background: 'var(--faya-orange)', color: '#fff',
            fontSize: 10, padding: '2px 10px', borderRadius: 20, fontWeight: 500
          }}>
            {user?.company || 'Acme Corp'}
          </span>
        </div>

        <div style={{ padding: '12px 20px' }}>
          <div style={{
            display: 'flex', gap: 4, background: 'rgba(255,255,255,0.08)',
            borderRadius: 6, padding: 3
          }}>
            {['EN', 'NL'].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                flex: 1, border: 'none', borderRadius: 4, padding: '4px 0',
                fontSize: 11, cursor: 'pointer',
                background: lang === l ? 'var(--faya-orange)' : 'transparent',
                color: lang === l ? '#fff' : 'rgba(255,255,255,0.4)'
              }}>{l}</button>
            ))}
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          {navItems.map((item, i) => (
            <div key={item.to}>
              {item.section && (
                <div style={{
                  fontSize: 10, color: 'rgba(255,255,255,0.25)',
                  letterSpacing: 2, padding: '14px 20px 6px',
                  textTransform: 'uppercase'
                }}>
                  {item.section}
                </div>
              )}
              <NavLink to={item.to} end={item.to === '/'} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px', fontSize: 13, cursor: 'pointer',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--faya-orange)' : '3px solid transparent',
                textDecoration: 'none'
              })}>
                {item.label}
              </NavLink>
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '0.5px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
            {user?.name}
          </div>
          <button onClick={handleLogout} style={{
            background: 'none', border: '0.5px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.6)', fontSize: 12, padding: '6px 12px',
            borderRadius: 6, cursor: 'pointer', width: '100%'
          }}>
            {lang === 'EN' ? 'Sign out' : 'Uitloggen'}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: 24, background: 'var(--faya-gray)', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
