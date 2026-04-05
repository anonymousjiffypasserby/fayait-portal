const mockAssets = [
  { id: 1, name: 'Dell Latitude 5520', type: 'Laptop', user: 'John Doe', status: 'deployed', serial: 'DL5520-001' },
  { id: 2, name: 'HP LaserJet Pro', type: 'Printer', user: 'Floor 2', status: 'deployed', serial: 'HP-LJ-002' },
  { id: 3, name: 'Cisco Switch 24P', type: 'Network', user: 'Server Room', status: 'deployed', serial: 'CS-SW-003' },
  { id: 4, name: 'Dell Latitude 5520', type: 'Laptop', user: 'Unassigned', status: 'available', serial: 'DL5520-004' },
  { id: 5, name: 'iPhone 14', type: 'Mobile', user: 'Maria S.', status: 'deployed', serial: 'IP14-005' },
]

const statusStyle = {
  deployed: { background: '#EAF3DE', color: '#3B6D11' },
  available: { background: '#E6F1FB', color: '#185FA5' },
  maintenance: { background: '#FAEEDA', color: '#633806' },
}

export default function Assets() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--faya-navy)' }}>Assets</h1>
        <div style={{ fontSize: 13, color: '#888780' }}>24 total assets</div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f4f5f7', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              {['#', 'Name', 'Type', 'Assigned to', 'Serial', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#5F5E5A', fontSize: 12 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockAssets.map(asset => (
              <tr key={asset.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px', color: '#888780' }}>#{asset.id}</td>
                <td style={{ padding: '12px 16px', color: 'var(--faya-navy)', fontWeight: 500 }}>{asset.name}</td>
                <td style={{ padding: '12px 16px', color: '#5F5E5A' }}>{asset.type}</td>
                <td style={{ padding: '12px 16px', color: '#5F5E5A' }}>{asset.user}</td>
                <td style={{ padding: '12px 16px', color: '#888780', fontFamily: 'monospace', fontSize: 12 }}>{asset.serial}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, ...statusStyle[asset.status] }}>
                    {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
