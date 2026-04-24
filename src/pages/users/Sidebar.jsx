import { T, ADMIN_ROLES, DEPT_HEAD_ROLES } from './shared'

const SECTIONS = [
  {
    key: 'myprofile',
    label: 'MY PROFILE',
    items: [
      { key: 'myprofile', label: 'My Profile' },
    ],
    roles: null, // all
  },
  {
    key: 'people',
    label: 'PEOPLE',
    items: [
      { key: 'all',       label: 'All Users',   countKey: 'all' },
      { key: 'active',    label: 'Active',       countKey: 'active' },
      { key: 'inactive',  label: 'Inactive',     countKey: 'inactive' },
      { key: 'invited',   label: 'Invited',      countKey: 'invited' },
      { key: 'deptHeads', label: 'Dept Heads',   countKey: 'deptHeads' },
      { key: 'admins',    label: 'Admins',        countKey: 'admins' },
    ],
    roles: DEPT_HEAD_ROLES,
  },
  {
    key: 'organization',
    label: 'ORGANIZATION',
    items: [
      { key: 'departments', label: 'Departments' },
      { key: 'orgchart',    label: 'Org Chart' },
      { key: 'jobfunctions',label: 'Job Functions' },
    ],
    roles: ADMIN_ROLES,
  },
  {
    key: 'access',
    label: 'ACCESS',
    items: [
      { key: 'roles', label: 'Roles & Permissions' },
    ],
    roles: ADMIN_ROLES,
  },
  {
    key: 'tools',
    label: 'TOOLS',
    items: [
      { key: 'import',      label: 'Import Users' },
      { key: 'activitylog', label: 'Activity Log' },
    ],
    roles: ADMIN_ROLES,
  },
]

export default function Sidebar({ view, setView, userRole, counts }) {
  const visibleSections = SECTIONS.filter(s =>
    s.roles === null || s.roles.includes(userRole)
  )

  return (
    <aside style={{
      width: 200, flexShrink: 0,
      background: '#fff',
      borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column',
      paddingTop: 20,
      overflowY: 'auto',
    }}>
      {visibleSections.map(section => (
        <div key={section.key} style={{ marginBottom: 8 }}>
          <div style={{
            padding: '6px 20px 4px',
            fontSize: 10, fontWeight: 700, color: '#9ca3af',
            letterSpacing: 1, textTransform: 'uppercase',
          }}>
            {section.label}
          </div>
          {section.items.map(item => {
            const active = view === item.key
            const count = item.countKey != null ? counts?.[item.countKey] : null
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', textAlign: 'left',
                  padding: '8px 20px', border: 'none',
                  background: active ? '#fff7f4' : 'transparent',
                  borderLeft: active ? `3px solid ${T.orange}` : '3px solid transparent',
                  color: active ? T.orange : '#374151',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                <span>{item.label}</span>
                {count != null && (
                  <span style={{
                    fontSize: 10, borderRadius: 10, padding: '1px 6px',
                    background: active ? '#ffe8dc' : '#f3f4f6',
                    color: active ? T.orange : T.muted,
                    fontWeight: 500,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </aside>
  )
}
