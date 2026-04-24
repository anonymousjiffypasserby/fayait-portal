import { T } from '../shared'

const PERMISSIONS = [
  { label: 'View own assets',       staff: true,  deptHead: true,  admin: true  },
  { label: 'View dept assets',      staff: false, deptHead: true,  admin: true  },
  { label: 'View all assets',       staff: false, deptHead: false, admin: true  },
  { label: 'Check out assets',      staff: false, deptHead: true,  admin: true  },
  { label: 'Edit assets',           staff: false, deptHead: false, admin: true  },
  { label: 'View own schedule',     staff: true,  deptHead: true,  admin: true  },
  { label: 'View dept schedule',    staff: false, deptHead: true,  admin: true  },
  { label: 'Approve timesheets',    staff: false, deptHead: true,  admin: true  },
  { label: 'Approve leave',         staff: false, deptHead: true,  admin: true  },
  { label: 'Run payroll',           staff: false, deptHead: false, admin: true  },
  { label: 'Manage users',          staff: false, deptHead: false, admin: true  },
  { label: 'Manage settings',       staff: false, deptHead: false, admin: true  },
  { label: 'View reports',          staff: false, deptHead: true,  admin: true  },
  { label: 'Export data',           staff: false, deptHead: false, admin: true  },
]

const Check = ({ yes }) => (
  <span style={{ fontSize: 16 }}>{yes ? '✅' : '❌'}</span>
)

const TH = ({ children, center }) => (
  <th style={{
    padding: '10px 20px', textAlign: center ? 'center' : 'left',
    fontSize: 11, fontWeight: 700, color: T.muted,
    background: '#f4f5f7', textTransform: 'uppercase', letterSpacing: 0.5,
    borderBottom: `1px solid ${T.border}`,
  }}>
    {children}
  </th>
)

const TD = ({ children, center }) => (
  <td style={{
    padding: '10px 20px', fontSize: 13,
    textAlign: center ? 'center' : 'left',
    borderBottom: `1px solid ${T.border}`,
  }}>
    {children}
  </td>
)

export default function RolesPermissions() {
  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: T.navy }}>Roles & Permissions</h2>
      </div>
      <p style={{ fontSize: 13, color: T.muted, marginBottom: 20, marginTop: 4 }}>
        Permissions are role-based and apply to all users with that role.
      </p>

      <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <TH>Permission</TH>
              <TH center>Staff</TH>
              <TH center>Dept Head</TH>
              <TH center>Admin</TH>
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map(p => (
              <tr key={p.label} style={{ background: '#fff' }}>
                <TD>{p.label}</TD>
                <TD center><Check yes={p.staff} /></TD>
                <TD center><Check yes={p.deptHead} /></TD>
                <TD center><Check yes={p.admin} /></TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        background: '#FEF3C7', border: '1px solid #FDE68A',
        borderRadius: 8, padding: '10px 16px', fontSize: 12, color: '#92400E',
      }}>
        Custom permissions coming soon — per-user overrides will be configurable in a future release.
      </div>
    </div>
  )
}
