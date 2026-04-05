import { useState } from 'react'

const mockUsers = [
  { id: 1, name: 'John Doe', email: 'john@acme.com', role: 'IT Admin', access: ['Tickets', 'Assets', 'Status', 'Passwords', 'Users'], status: 'active' },
  { id: 2, name: 'Maria Santos', email: 'maria@acme.com', role: 'Staff', access: ['Tickets', 'Status'], status: 'active' },
  { id: 3, name: 'Bob Leeflang', email: 'bob@acme.com', role: 'Staff', access: ['Tickets'], status: 'active' },
  { id: 4, name: 'Sarah Chin', email: 'sarah@acme.com', role: 'Staff', access: ['Tickets', 'Status'], status: 'invited' },
]

export default function Users() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--faya-navy)' }}>Users</h1>
        <button onClick={() => setShowModal(true)} style={{
          background: 'var(--faya-orange)', color: '#fff', border: 'none',
          borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer'
        }}>
          + Add user
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f4f5f7', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              {['Name', 'Email', 'Role', 'Access', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#5F5E5A', fontSize: 12 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockUsers.map(user => (
              <tr key={user.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--faya-orange)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 500, flexShrink: 0
                    }}>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span style={{ fontWeight: 500, color: 'var(--faya-navy)' }}>{user.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: '#5F5E5A' }}>{user.email}</td>
                <td style={{ padding: '12px 16px', color: '#5F5E5A' }}>{user.role}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {user.access.map(a => (
                      <span key={a} style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 4,
                        background: '#F1EFE8', color: '#5F5E5A', fontWeight: 500
                      }}>{a}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
                    background: user.status === 'active' ? '#EAF3DE' : '#FAEEDA',
                    color: user.status === 'active' ? '#3B6D11' : '#633806'
                  }}>
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24, width: 400,
            border: '0.5px solid rgba(0,0,0,0.08)'
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--faya-navy)', marginBottom: 20 }}>Add user</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>Full name</label>
              <input style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 13 }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 13 }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>Role</label>
              <select style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 13 }}>
                <option>Staff</option>
                <option>IT Admin</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 8 }}>Access</label>
              {['Tickets', 'Assets', 'Status', 'Passwords', 'Chat'].map(item => (
                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6, cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked={item === 'Tickets'} />
                  {item}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowModal(false)} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)',
                background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#5F5E5A'
              }}>Cancel</button>
              <button style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                background: 'var(--faya-orange)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer'
              }}>Send invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
