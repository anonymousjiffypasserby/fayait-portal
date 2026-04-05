import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useTheme } from '../context/ThemeContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const { lang, switchLang, t } = useLang()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/', label: t('dashboard'), section: t('overview') },
    { to: '/tickets', label: t('tickets'), section: t('services') },
    { to: '/assets', label: t('assets'), section: null },
    { to: '/status', label: t('status'), section: null },
    { to: '/users', label: t('users'), section: t('admin') },
  ]

  const isDark = theme === 'dark'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: isDark ? '#0f1420' : 'var(--faya-gray)' }}>
      <aside style={{
        width: 220, background: isDark ? '#0a0f1a' : 'var(--faya-navy)',
        display: 'flex', flexDirection: 'column', flexShrink: 0
      }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 4 }}>
            {t('poweredBy').toUpperCase()}
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 8 }}>
            Faya IT Services
          </div>
          <span style={{
            background: 'var(--faya-orange)', color: '#fff',
            fontSize: 10, padding: '2px 10px', borderRadius: 20, fontWeight: 500
          }}>
            {user?.company}
          </span>
        </div>

        <div style={{ padding: '12px 20px' }}>
          <div style={{
            display: 'flex', gap: 4, background: 'rgba(255,255,255,0.08)',
            borderRadius: 6, padding: 3
          }}>
            {['EN', 'NL'].map(l => (
              <button key={l} onClick={() => switchLang(l)} style={{
                flex: 1, border: 'none', borderRadius: 4, padding: '4px 0',
                fontSize: 11, cursor: 'pointer',
                background: lang === l ? 'var(--faya-orange)' : 'transparent',
                color: lang === l ? '#fff' : 'rgba(255,255,255,0.4)'
              }}>{l}</button>
            ))}
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          {navItems.map((item) => (
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{user?.name}</div>
            <button onClick={toggleTheme} style={{
              background: 'rgba(255,255,255,0.08)', border: 'none',
              color: 'rgba(255,255,255,0.6)', fontSize: 14, padding: '4px 8px',
              borderRadius: 6, cursor: 'pointer'
            }}>
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
          <button onClick={handleLogout} style={{
            background: 'none', border: '0.5px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.6)', fontSize: 12, padding: '6px 12px',
            borderRadius: 6, cursor: 'pointer', width: '100%'
          }}>
            {t('signOut')}
          </button>
        </div>
      </aside>

      <main style={{
        flex: 1, padding: 24,
        background: isDark ? '#0f1420' : 'var(--faya-gray)',
        overflowY: 'auto'
      }}>
        <Outlet />
      </main>
    </div>
  )
}
