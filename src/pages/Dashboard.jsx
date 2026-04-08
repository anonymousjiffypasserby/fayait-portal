import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0]
  const services = user?.services || {}

  const stats = [
    { label: 'Open Tickets', value: '—', sub: 'View in tickets', icon: '🎫', path: '/tickets', color: '#ff6b35' },
    { label: 'Total Assets', value: '—', sub: 'View in assets', icon: '💻', path: '/assets', color: '#378ADD' },
    { label: 'Services Active', value: Object.values(services).filter(s => s === 'active').length, sub: 'of ' + Object.keys(services).length + ' total', icon: '🟢', color: '#1D9E75' },
    { label: 'Team Members', value: '—', sub: 'Manage users', icon: '👥', path: '/users', color: '#9b59b6' },
  ]

  const activeServiceList = Object.entries(services).filter(([, s]) => s === 'active').map(([k]) => k)

  const serviceIcons = { tickets: '🎫', assets: '💻', chat: '💬', files: '📁', projects: '📋', status: '🟢', grafana: '📊' }
  const serviceLabels = { tickets: 'Tickets', assets: 'Assets', chat: 'Chat', files: 'Files', projects: 'Projects', status: 'Status', grafana: 'Analytics' }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 28, background: '#f0f2f5' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1f2e', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
          {greeting}, {firstName} 👋
        </h1>
        <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>
          {user?.company} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {stats.map((stat, i) => (
          <div key={i} onClick={() => stat.path && navigate(stat.path)} style={{
            background: '#fff', borderRadius: 12, padding: '18px 20px',
            border: '1px solid rgba(0,0,0,0.06)', cursor: stat.path ? 'pointer' : 'default',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500 }}>{stat.label}</span>
              <span style={{ fontSize: 18 }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, lineHeight: 1, marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid rgba(0,0,0,0.06)', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f2e', marginBottom: 16 }}>Your Services</div>
        {activeServiceList.length === 0 ? (
          <div style={{ fontSize: 13, color: '#aaa' }}>No services activated yet. Contact Faya IT to get started.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {activeServiceList.map(key => (
              <button key={key} onClick={() => navigate('/' + key)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#f7f8fa', border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 8, padding: '10px 16px', fontSize: 13,
                color: '#1a1f2e', cursor: 'pointer', fontWeight: 500,
              }}>
                <span>{serviceIcons[key] || '⚙️'}</span>
                <span>{serviceLabels[key] || key}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #ff6b35 0%, #f7a173 100%)',
        borderRadius: 12, padding: '20px 24px', color: '#fff',
      }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, fontWeight: 500 }}>FROM FAYA IT</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Welcome to your Faya IT portal 🔥</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Your IT workspace is ready. Use the sidebar to navigate your services.</div>
      </div>
    </div>
  )
}
