import { useAuth } from '../context/AuthContext'

const SERVICE_MOBILE_URLS = {
  tickets: 'https://zammad.fayait.com/mobile',
}

const SERVICE_URLS = {
  tickets: 'https://zammad.fayait.com',
  assets: 'https://snipe.fayait.com',
  chat: 'https://chat.fayait.com',
  files: 'https://nextcloud.fayait.com',
  projects: 'https://plane.fayait.com',
  status: 'https://uptime.fayait.com',
  grafana: 'https://grafana.fayait.com',
}

const SERVICE_INFO = {
  tickets: {
    name: 'Helpdesk & Ticketing',
    description: 'Submit and track IT support requests. Your team can create tickets for any IT issue — hardware, software, access requests — and get updates in real time.',
    icon: '🎫',
  },
  assets: {
    name: 'Asset Management',
    description: 'Keep track of all your company devices — laptops, desktops, printers, servers. Know what you own, who has it, and when warranties expire.',
    icon: '💻',
  },
  chat: {
    name: 'Team Chat',
    description: 'A secure, private team messaging platform. Create channels for departments, share files, and collaborate — all hosted on your own infrastructure.',
    icon: '💬',
  },
  files: {
    name: 'File Storage',
    description: 'Secure cloud storage for your company files. Share documents, collaborate in real time with built-in office tools, and control who has access to what.',
    icon: '📁',
  },
  projects: {
    name: 'Project Management',
    description: 'Plan and track projects with boards, timelines, and task assignments. Keep your team aligned and deadlines visible.',
    icon: '📋',
  },
  status: {
    name: 'Service Status',
    description: 'Real-time uptime monitoring for all your services. See what\'s online, get notified of outages, and review historical uptime reports.',
    icon: '🟢',
  },
  grafana: {
    name: 'Analytics',
    description: 'Visual dashboards showing your infrastructure health, performance metrics, and trends. Understand your systems at a glance.',
    icon: '📊',
  },
}

const ADMIN_ROLES = ['superadmin', 'admin']

export default function ServiceFrame({ service }) {
  const { user } = useAuth()
  const isMobile = window.innerWidth < 768
  const url = (isMobile && SERVICE_MOBILE_URLS[service]) || SERVICE_URLS[service]
  const services = user?.services || {}
  const isActive = services[service] === 'active'
  const isAdmin = ADMIN_ROLES.includes(user?.role)
  const info = SERVICE_INFO[service] || { name: service, description: '', icon: '⚙️' }

  if (!isActive) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
        padding: 40,
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '48px 40px',
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>{info.icon}</div>
          <div style={{ fontSize: 11, color: '#ff6b35', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            Not activated
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1f2e', marginBottom: 12 }}>
            {info.name}
          </div>
          <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 28 }}>
            {info.description}
          </div>
          {isAdmin && (
            <div style={{
              background: '#fff8f5',
              border: '1px solid rgba(255,107,53,0.2)',
              borderRadius: 10,
              padding: '14px 18px',
              marginBottom: 24,
              fontSize: 13,
              color: '#888',
              textAlign: 'left',
            }}>
              <strong style={{ color: '#1a1f2e' }}>Admin note:</strong> Contact Faya IT to activate this service for your organization.
            </div>
          )}
          <a href="mailto:support@fayait.com" style={{
            display: 'inline-block',
            background: '#ff6b35',
            color: '#fff',
            padding: '12px 28px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}>
            Contact Faya IT to unlock
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <iframe
        src={url}
        style={{ flex: 1, width: '100%', border: 'none', display: 'block' }}
        title={service}
        allow="fullscreen"
      />
    </div>
  )
}
