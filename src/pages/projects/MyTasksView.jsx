import { useState } from 'react'
import { T, STATUS_COLORS, PRIORITY_COLORS, STATUSES, fmtDateShort, isOverdue } from './shared'
import api from '../../services/api'

const td = { padding: '10px 14px', fontSize: 13, borderBottom: `1px solid ${T.border}` }

export default function MyTasksView({ tasks, projects, onTaskUpdated }) {
  const [groupBy, setGroupBy] = useState('project') // 'project' | 'status'
  const [updating, setUpdating] = useState(null)

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))

  const handleStatusChange = async (task, newStatus) => {
    setUpdating(task.id)
    try {
      await api.updateTask(task.project_id, task.id, { status: newStatus })
      onTaskUpdated()
    } catch {}
    setUpdating(null)
  }

  // Group
  let groups = []
  if (groupBy === 'project') {
    const byProject = {}
    tasks.forEach(t => {
      const pid = t.project_id
      if (!byProject[pid]) byProject[pid] = []
      byProject[pid].push(t)
    })
    groups = Object.entries(byProject).map(([pid, ts]) => ({
      key: pid,
      label: projectMap[pid]?.title || 'Unknown Project',
      color: projectMap[pid]?.cover_color || '#6366f1',
      tasks: ts,
    }))
  } else {
    groups = STATUSES.map(s => ({
      key: s,
      label: STATUS_COLORS[s]?.label || s,
      color: STATUS_COLORS[s]?.color || '#888',
      tasks: tasks.filter(t => t.status === s),
    })).filter(g => g.tasks.length > 0)
  }

  return (
    <div style={{ padding: '16px 20px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.navy }}>My Tasks</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: T.muted }}>{tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
          {[['project', 'By Project'], ['status', 'By Status']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setGroupBy(key)}
              style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 12,
                cursor: 'pointer', fontFamily: T.font, fontWeight: 500,
                background: groupBy === key ? '#fff' : 'transparent',
                color: groupBy === key ? T.navy : T.muted,
                boxShadow: groupBy === key ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tasks.length === 0 && (
        <div style={{
          background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
          padding: '48px 20px', textAlign: 'center', color: T.muted,
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>No tasks assigned to you</div>
        </div>
      )}

      {groups.map(group => (
        <div key={group.key} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: group.color }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{group.label}</span>
            <span style={{ fontSize: 11, color: T.muted, background: '#f1f5f9', borderRadius: 8, padding: '1px 6px' }}>
              {group.tasks.length}
            </span>
          </div>

          <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafbfc' }}>
                  {['Task', 'Project', 'Status', 'Priority', 'Due'].map(h => (
                    <th key={h} style={{
                      padding: '8px 14px', textAlign: 'left', fontSize: 11,
                      fontWeight: 600, color: T.muted, textTransform: 'uppercase',
                      letterSpacing: 0.5, borderBottom: `1px solid ${T.border}`,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.tasks.map(t => {
                  const sc = STATUS_COLORS[t.status] || STATUS_COLORS.todo
                  const pc = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.medium
                  const overdue = isOverdue(t.due_date, t.status)
                  const proj = projectMap[t.project_id]
                  return (
                    <tr key={t.id} style={{ opacity: updating === t.id ? 0.5 : 1 }}>
                      <td style={{ ...td, fontWeight: 500, color: T.navy }}>{t.title}</td>
                      <td style={{ ...td, color: T.muted }}>
                        {proj ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: proj.cover_color || '#6366f1' }} />
                            {proj.title}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={td}>
                        <select
                          value={t.status}
                          onChange={e => handleStatusChange(t, e.target.value)}
                          disabled={updating === t.id}
                          style={{
                            fontSize: 11, fontWeight: 500, padding: '2px 6px', borderRadius: 8,
                            background: sc.bg, color: sc.color, border: 'none',
                            cursor: 'pointer', fontFamily: T.font,
                          }}
                        >
                          {STATUSES.map(s => (
                            <option key={s} value={s}>{STATUS_COLORS[s]?.label || s}</option>
                          ))}
                        </select>
                      </td>
                      <td style={td}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                          background: pc.bg, color: pc.color, textTransform: 'uppercase',
                        }}>
                          {t.priority}
                        </span>
                      </td>
                      <td style={{ ...td, color: overdue ? T.red : T.muted, fontWeight: overdue ? 600 : 400 }}>
                        {t.due_date ? fmtDateShort(t.due_date) : '—'}
                        {overdue && ' ⚠'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
