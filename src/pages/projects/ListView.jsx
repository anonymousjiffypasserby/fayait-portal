import { useState } from 'react'
import { T, STATUS_COLORS, PRIORITY_COLORS, ProgressBar, fmtDateShort, isOverdue } from './shared'

const th = {
  padding: '10px 14px', textAlign: 'left', fontSize: 11,
  fontWeight: 600, color: T.muted, textTransform: 'uppercase',
  letterSpacing: 0.5, borderBottom: `1px solid ${T.border}`,
  background: '#fafbfc', cursor: 'pointer', whiteSpace: 'nowrap',
  userSelect: 'none',
}
const td = { padding: '11px 14px', fontSize: 13, color: T.navy, borderBottom: `1px solid ${T.border}` }

export default function ListView({ projects, onRowClick }) {
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [expanded, setExpanded] = useState(null)

  const sort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const arrow = (key) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const sorted = [...projects].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey]
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  return (
    <div style={{ padding: '16px 20px', height: '100%', overflowY: 'auto' }}>
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[
                { key: 'title',            label: 'Title' },
                { key: 'department_name',  label: 'Department' },
                { key: 'assigned_to_name', label: 'Assignee' },
                { key: 'priority',         label: 'Priority' },
                { key: 'status',           label: 'Status' },
                { key: 'progress',         label: 'Progress' },
                { key: 'due_date',         label: 'Due' },
                { key: 'task_count',       label: 'Tasks' },
              ].map(col => (
                <th key={col.key} style={th} onClick={() => sort(col.key)}>
                  {col.label}{arrow(col.key)}
                </th>
              ))}
              <th style={{ ...th, cursor: 'default' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(p => {
              const overdue = isOverdue(p.due_date, p.status)
              const sc = STATUS_COLORS[p.status] || STATUS_COLORS.todo
              const pc = PRIORITY_COLORS[p.priority] || PRIORITY_COLORS.medium
              const isExp = expanded === p.id
              return (
                <>
                  <tr
                    key={p.id}
                    style={{ background: isExp ? '#f8faff' : undefined }}
                  >
                    <td style={{ ...td, fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 4, height: 18, borderRadius: 2, background: p.cover_color || '#6366f1', flexShrink: 0 }} />
                        <span
                          style={{ cursor: 'pointer', color: '#4f46e5' }}
                          onClick={() => onRowClick(p.id)}
                        >
                          {p.title}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...td, color: T.muted }}>{p.department_name || '—'}</td>
                    <td style={td}>{p.assigned_to_name || '—'}</td>
                    <td style={td}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                        background: pc.bg, color: pc.color, textTransform: 'uppercase',
                      }}>
                        {p.priority}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{
                        fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 10,
                        background: sc.bg, color: sc.color,
                      }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ ...td, minWidth: 100 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ProgressBar value={p.progress || 0} height={5} />
                        <span style={{ fontSize: 11, color: T.muted, whiteSpace: 'nowrap' }}>{p.progress || 0}%</span>
                      </div>
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap', color: overdue ? T.red : T.navy, fontWeight: overdue ? 600 : 400 }}>
                      {p.due_date ? fmtDateShort(p.due_date) : '—'}
                      {overdue && ' ⚠'}
                    </td>
                    <td style={{ ...td, color: T.muted, textAlign: 'center' }}>
                      {p.completed_task_count}/{p.task_count}
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => onRowClick(p.id)}
                          style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 5, padding: '3px 9px', fontSize: 11, cursor: 'pointer', color: T.navy }}
                        >
                          Open
                        </button>
                        <button
                          onClick={() => setExpanded(isExp ? null : p.id)}
                          style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 5, padding: '3px 9px', fontSize: 11, cursor: 'pointer', color: T.muted }}
                        >
                          {isExp ? '▲' : '▼'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded tasks inline */}
                  {isExp && (
                    <tr key={`${p.id}-exp`}>
                      <td colSpan={9} style={{ padding: '0 0 0 28px', background: '#f8faff', borderBottom: `1px solid ${T.border}` }}>
                        <ExpandedTasks projectId={p.id} />
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...td, textAlign: 'center', color: T.muted, padding: '36px 0' }}>
                  No projects
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ExpandedTasks({ projectId }) {
  const [tasks, setTasks] = useState(null)
  const [loading, setLoading] = useState(true)

  // Lazy fetch on first render
  useState(() => {
    import('../../services/api').then(({ default: api }) => {
      api.getProjectTasks(projectId)
        .then(data => setTasks(data))
        .catch(() => setTasks([]))
        .finally(() => setLoading(false))
    })
  })

  if (loading) return <div style={{ padding: '12px 0', fontSize: 12, color: T.muted }}>Loading tasks…</div>
  if (!tasks?.length) return <div style={{ padding: '12px 0', fontSize: 12, color: T.muted }}>No tasks</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {tasks.map(t => {
        const sc = STATUS_COLORS[t.status] || STATUS_COLORS.todo
        const pc = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.medium
        const overdue = isOverdue(t.due_date, t.status)
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '8px 14px 8px 0', borderBottom: `1px solid rgba(0,0,0,0.04)`,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, flex: 1, color: T.navy }}>{t.title}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: pc.bg, color: pc.color, textTransform: 'uppercase' }}>
              {t.priority}
            </span>
            {t.due_date && (
              <span style={{ fontSize: 11, color: overdue ? T.red : T.muted, whiteSpace: 'nowrap' }}>
                {fmtDateShort(t.due_date)}
              </span>
            )}
            <span style={{ fontSize: 11, color: T.muted }}>{t.assigned_to_name || '—'}</span>
          </div>
        )
      })}
    </div>
  )
}
