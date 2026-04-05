import { useAuth } from '../context/AuthContext'

const mockTickets = [
  { id: 1, title: 'Email server not responding', status: 'open', priority: 'high', time: '2h ago', assignee: 'Anfarcio' },
  { id: 2, title: 'VPN access for new employee', status: 'progress', priority: 'medium', time: '5h ago', assignee: 'Anfarcio' },
  { id: 3, title: 'Printer offline — floor 2', status: 'open', priority: 'low', time: 'Yesterday', assignee: 'Unassigned' },
  { id: 4, title: 'Password reset — Maria S.', status: 'closed', priority: 'low', time: '2d ago', assignee: 'Anfarcio' },
  { id: 5, title: 'Laptop setup for new hire', status: 'closed', priority: 'medium', time: '3d ago', assignee: 'Anfarcio' },
]

const statusStyle = {
  open: { background: '#FDF0EA', color: '#E85D24' },
  progress: { background: '#E6F1FB', color: '#185FA5' },
  closed: { background: '#EAF3DE', color: '#3B6D11' },
}

const priorityStyle = {
  high: { background: '#FCEBEB', color: '#A32D2D' },
  medium: { background: '#FAEEDA', color: '#633806' },
  low: { background: '#F1EFE8', color: '#5F5E5A' },
}

export default function Tickets() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--faya-navy)' }}>Tickets</h1>
        <button style={{
          background: 'var(--faya-orange)', color: '#fff', border: 'none',
          borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer'
        }}>
          + New ticket
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f4f5f7', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              {['#', 'Title', 'Status', 'Priority', 'Assignee', 'Time'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#5F5E5A', fontSize: 12 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockTickets.map(ticket => (
              <tr key={ticket.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px', color: '#888780' }}>#{ticket.id}</td>
                <td style={{ padding: '12px 16px', color: 'var(--faya-navy)', fontWeight: 500 }}>{ticket.title}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, ...statusStyle[ticket.status] }}>
                    {ticket.status === 'progress' ? 'In progress' : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, ...priorityStyle[ticket.priority] }}>
                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#5F5E5A' }}>{ticket.assignee}</td>
                <td style={{ padding: '12px 16px', color: '#888780' }}>{ticket.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
