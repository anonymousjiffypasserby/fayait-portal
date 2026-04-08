import { useAuth } from '../context/AuthContext'

const SERVICE_URLS = {
  tickets: 'https://zammad.fayait.com',
  assets: 'https://snipe.fayait.com',
  chat: 'https://chat.fayait.com',
  files: 'https://nextcloud.fayait.com',
  projects: 'https://plane.fayait.com',
  status: 'https://uptime.fayait.com',
  grafana: 'https://grafana.fayait.com',
}

export default function ServiceFrame({ service }) {
  const { user } = useAuth()
  const url = SERVICE_URLS[service]
  const activeServices = user?.services || {}
  const isActive = activeServices[service] === 'active'

  if (!isActive) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#f0f2f5', gap: 16, height: '100%',
      }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1f2e' }}>Service not activated</div>
        <div style={{ fontSize: 14, color: '#888', textAlign: 'center', maxWidth: 320 }}>
          This service is not included in your current plan. Contact Faya IT to activate it.
        </div>
        <a href="mailto:support@fayait.com" style={{
          background: '#ff6b35', color: '#fff',
          padding: '10px 24px', borderRadius: 8,
          fontSize: 13, fontWeight: 500, textDecoration: 'none', marginTop: 8,
        }}>
          Contact support
        </a>
      </div>
    )
  }

  if (!url) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#888', fontSize: 14, height: '100%',
      }}>
        Service URL not configured
      </div>
    )
  }

  return (
    <iframe
      src={url}
      style={{ flex: 1, width: '100%', height: '100%', border: 'none', display: 'block' }}
      title={service}
      allow="fullscreen"
    />
  )
}
