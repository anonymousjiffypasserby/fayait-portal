import { T, PRIORITIES, STATUS_COLORS, isAdmin } from './shared'

const sectionLabel = {
  fontSize: 9, color: 'rgba(0,0,0,0.3)', letterSpacing: 1.5,
  textTransform: 'uppercase', padding: '14px 16px 4px', fontWeight: 600,
}

const navBtn = (active) => ({
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '7px 16px',
  border: 'none', borderRadius: 0, cursor: 'pointer',
  background: active ? 'rgba(99,102,241,0.08)' : 'transparent',
  borderLeft: active ? '2px solid #6366f1' : '2px solid transparent',
  color: active ? '#6366f1' : '#374151',
  fontSize: 13, textAlign: 'left', fontFamily: T.font,
})

export default function Sidebar({ view, filters, projects, tasks, user, onView, onFilter, onNew }) {
  const myProjects = projects.filter(p =>
    p.assigned_to === user?.id || p.created_by === user?.id
  )
  const myTasks = tasks.filter(t => t.assigned_to === user?.id)
  const hasDept = !!user?.department
  const admin = isAdmin(user)

  const statusGroups = ['todo', 'in_progress', 'review', 'done']

  const deptProjects = hasDept
    ? projects.filter(p => p.department_name === user.department)
    : []

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    ...PRIORITIES.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) })),
  ]

  return (
    <div style={{
      width: T.sidebar, minWidth: T.sidebar, background: T.card,
      borderRight: `1px solid ${T.border}`, height: '100%',
      overflowY: 'auto', display: 'flex', flexDirection: 'column',
    }}>
      {/* New Project */}
      <div style={{ padding: '14px 12px 10px' }}>
        <button onClick={onNew} style={{
          width: '100%', padding: '8px 0', borderRadius: 8,
          background: '#6366f1', color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.font,
        }}>
          + New Project
        </button>
      </div>

      {/* MY WORK */}
      <div style={sectionLabel}>My Work</div>
      <button style={navBtn(view === 'my_projects')} onClick={() => onView('my_projects')}>
        <span>📋</span>
        <span style={{ flex: 1 }}>My Projects</span>
        {myProjects.length > 0 && (
          <span style={{ fontSize: 10, background: '#f1f5f9', borderRadius: 8, padding: '1px 6px', color: T.muted }}>
            {myProjects.length}
          </span>
        )}
      </button>
      <button style={navBtn(view === 'my_tasks')} onClick={() => onView('my_tasks')}>
        <span>✓</span>
        <span style={{ flex: 1 }}>My Tasks</span>
        {myTasks.length > 0 && (
          <span style={{ fontSize: 10, background: '#f1f5f9', borderRadius: 8, padding: '1px 6px', color: T.muted }}>
            {myTasks.length}
          </span>
        )}
      </button>

      {/* DEPARTMENT */}
      {(hasDept || admin) && (
        <>
          <div style={sectionLabel}>Department</div>
          <button style={navBtn(view === 'dept_all')} onClick={() => onView('dept_all')}>
            <span>🏢</span>
            <span style={{ flex: 1 }}>All Projects</span>
            {deptProjects.length > 0 && (
              <span style={{ fontSize: 10, background: '#f1f5f9', borderRadius: 8, padding: '1px 6px', color: T.muted }}>
                {deptProjects.length}
              </span>
            )}
          </button>
          {statusGroups.map(s => (
            <button
              key={s}
              style={{
                ...navBtn(view === `dept_${s}`),
                paddingLeft: 32,
              }}
              onClick={() => onView(`dept_${s}`)}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: STATUS_COLORS[s]?.color || '#888',
              }} />
              <span>{STATUS_COLORS[s]?.label || s}</span>
            </button>
          ))}
        </>
      )}

      {/* VIEWS */}
      <div style={sectionLabel}>Views</div>
      {[
        { key: 'board',    icon: '⊞', label: 'Board' },
        { key: 'list',     icon: '≡', label: 'List' },
        { key: 'calendar', icon: '📅', label: 'Calendar' },
      ].map(({ key, icon, label }) => (
        <button key={key} style={navBtn(view === key)} onClick={() => onView(key)}>
          <span>{icon}</span>
          <span>{label}</span>
        </button>
      ))}

      {/* FILTERS */}
      <div style={sectionLabel}>Filters</div>
      <div style={{ padding: '4px 12px 8px' }}>
        <select
          value={filters.priority || ''}
          onChange={e => onFilter({ ...filters, priority: e.target.value })}
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 6,
            border: `1px solid ${T.border}`, fontSize: 12, color: T.navy,
            background: '#fafafa', fontFamily: T.font, marginBottom: 6,
          }}
        >
          {priorityOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {(hasDept || admin) && (
          <select
            value={filters.assigned_to || ''}
            onChange={e => onFilter({ ...filters, assigned_to: e.target.value })}
            style={{
              width: '100%', padding: '6px 10px', borderRadius: 6,
              border: `1px solid ${T.border}`, fontSize: 12, color: T.navy,
              background: '#fafafa', fontFamily: T.font, marginBottom: 6,
            }}
          >
            <option value=''>All Assignees</option>
            {[...new Map(
              projects
                .filter(p => p.assigned_to && p.assigned_to_name)
                .map(p => [p.assigned_to, p.assigned_to_name])
            ).entries()].map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}

        {filters.priority || filters.assigned_to ? (
          <button
            onClick={() => onFilter({})}
            style={{
              fontSize: 11, color: '#6366f1', background: 'none', border: 'none',
              cursor: 'pointer', padding: '2px 0', fontFamily: T.font,
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  )
}
