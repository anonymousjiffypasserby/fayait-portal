import { useAuth } from '../context/AuthContext'

const mockTickets = [
  { id: 1, title: 'Email server not responding', status: 'open', time: '2h ago' },
  { id: 2, title: 'VPN access for new employee', status: 'progress', time: '5h ago' },
  { id: 3, title: 'Printer offline — floor 2', status: 'open', time: 'Yesterday' },
  { id: 4, title: 'Password reset — Maria S.', status: 'closed', time: '2d ago' },
]

const mockServices = [
  { name: 'Email', status: 'down' },
  { name: 'File storage', status: 'up' },
  { name: 'Chat', status: 'up' },
  { name: 'VPN', status: 'up' },
  { name: 'Backup', status: 'up' },
]

const badgeStyle = {
  open: { background: '#FDF0EA', color: '#E85D24' },
  progress: { background: '#E6F1FB', color: '#185FA5' },
  closed: { background: '#EAF3DE', color: '#3B6D11' },
}

const badgeLabel = {
  open: { EN: 'Open', NL: 'Open' },
  progress: { EN: 'In progress', NL: 'In behandeling' },
  closed: { EN: 'Closed', NL: 'Gesloten' },
}

export default function Dashboard({ lang = 'EN' }) {
  const { user } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const greetingNL = hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--faya-navy)' }}>
          {lang === 'EN' ? greeting : greetingNL}, {user?.name?.split(' ')[0]}
        </h1>
        <div style={{ fontSize: 13, color: '#888780' }}>
          {user?.company} · {user?.role}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: lang === 'EN' ? 'Open tickets' : 'Open tickets', value: '3', sub: lang === 'EN' ? '2 need response' : '2 wachten op reactie', accent: true, red: true },
          { label: lang === 'EN' ? 'Assets' : 'Activa', value: '24', sub: lang === 'EN' ? '2 expiring soon' : '2 verlopen binnenkort' },
          { label: lang === 'EN' ? 'Services up' : 'Services actief', value: '7/8', sub: lang === 'EN' ? '1 degraded' : '1 verstoord', green: true },
          { label: lang === 'EN' ? 'Users' : 'Gebruikers', value: '12', sub: lang === 'EN' ? '1 pending invite' : '1 uitnodiging open' },
        ].map((card, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 10, padding: 16,
            border: '0.5px solid rgba(0,0,0,0.08)',
            borderLeft: card.accent ? '3px solid var(--faya-orange)' : undefined,
            borderRadius: card.accent ? '0 10px 10px 0' : 10,
          }}>
            <div style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 500, color: card.red ? '#E24B4A' : card.green ? '#1D9E75' : 'var(--faya-navy)', lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 4 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--faya-navy)' }}>
              {lang === 'EN' ? 'Recent tickets' : 'Recente tickets'}
            </span>
            <a href="/tickets" style={{ fontSize: 11, color: 'var(--faya-orange)' }}>
              {lang === 'EN' ? 'View all' : 'Bekijk alles'}
            </a>
          </div>
          {mockTickets.map(ticket => (
            <div key={ticket.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)',
              fontSize: 12
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: ticket.status === 'closed' ? '#1D9E75' : ticket.status === 'progress' ? '#378ADD' : '#E85D24'
              }} />
              <div style={{ flex: 1, color: 'var(--faya-navy)' }}>{ticket.title}</div>
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 500,
                ...badgeStyle[ticket.status]
              }}>
                {badgeLabel[ticket.status][lang]}
              </span>
              <div style={{ fontSize: 11, color: '#888780' }}>{ticket.time}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--faya-navy)' }}>
              {lang === 'EN' ? 'Service status' : 'Servicestatus'}
            </span>
            <a href="/status" style={{ fontSize: 11, color: 'var(--faya-orange)' }}>
              {lang === 'EN' ? 'Details' : 'Details'}
            </a>
          </div>
          {mockServices.map(service => (
            <div key={service.name} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)', fontSize: 12
            }}>
              <div style={{ color: 'var(--faya-navy)' }}>{service.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: service.status === 'up' ? '#1D9E75' : '#E24B4A'
                }} />
                <span style={{ fontSize: 11, color: service.status === 'up' ? '#1D9E75' : '#E24B4A' }}>
                  {service.status === 'up'
                    ? (lang === 'EN' ? 'Online' : 'Online')
                    : (lang === 'EN' ? 'Degraded' : 'Verstoord')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
