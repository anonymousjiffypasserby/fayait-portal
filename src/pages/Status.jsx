const mockServices = [
  { name: 'Email', url: 'mail.acme.com', status: 'down', uptime: '98.2%', response: 'N/A' },
  { name: 'File storage', url: 'files.acme.com', status: 'up', uptime: '99.9%', response: '142ms' },
  { name: 'Chat', url: 'chat.fayait.com', status: 'up', uptime: '99.9%', response: '89ms' },
  { name: 'VPN', url: 'vpn.acme.com', status: 'up', uptime: '99.7%', response: '201ms' },
  { name: 'Backup', url: 'backup.acme.com', status: 'up', uptime: '100%', response: '310ms' },
  { name: 'Website', url: 'acme.com', status: 'up', uptime: '99.9%', response: '95ms' },
]

export default function Status() {
  const allUp = mockServices.every(s => s.status === 'up')
  const downCount = mockServices.filter(s => s.status === 'down').length

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--faya-navy)', marginBottom: 8 }}>Service status</h1>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: allUp ? '#EAF3DE' : '#FCEBEB',
          color: allUp ? '#3B6D11' : '#A32D2D',
          padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: allUp ? '#1D9E75' : '#E24B4A' }} />
          {allUp ? 'All systems operational' : `${downCount} service${downCount > 1 ? 's' : ''} down`}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f4f5f7', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              {['Service', 'URL', 'Status', 'Uptime (30d)', 'Response'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#5F5E5A', fontSize: 12 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockServices.map(service => (
              <tr key={service.name} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px', color: 'var(--faya-navy)', fontWeight: 500 }}>{service.name}</td>
                <td style={{ padding: '12px 16px', color: '#888780', fontSize: 12, fontFamily: 'monospace' }}>{service.url}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: service.status === 'up' ? '#1D9E75' : '#E24B4A' }} />
                    <span style={{ color: service.status === 'up' ? '#1D9E75' : '#E24B4A', fontSize: 12 }}>
                      {service.status === 'up' ? 'Online' : 'Down'}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: '#5F5E5A' }}>{service.uptime}</td>
                <td style={{ padding: '12px 16px', color: '#5F5E5A' }}>{service.response}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
