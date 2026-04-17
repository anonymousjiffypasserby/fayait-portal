import { T, PRIORITY_COLORS, STATUS_COLORS, ProgressBar, Avatar, fmtDateShort, isOverdue, initials } from './shared'

export default function ProjectCard({ project, onClick, onStatusChange, draggable, onDragStart }) {
  const overdue = isOverdue(project.due_date, project.status)
  const pc = PRIORITY_COLORS[project.priority] || PRIORITY_COLORS.medium

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      style={{
        background: T.card, borderRadius: 10, overflow: 'hidden',
        border: `1px solid ${T.border}`, cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.15s, transform 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = '' }}
    >
      {/* Cover bar */}
      <div style={{ height: 4, background: project.cover_color || '#6366f1' }} />

      <div style={{ padding: '12px 14px' }}>
        {/* Title */}
        <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 8, lineHeight: 1.35 }}>
          {project.title}
        </div>

        {/* Priority + Due */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
            background: pc.bg, color: pc.color, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            {project.priority}
          </span>
          {project.due_date && (
            <span style={{ fontSize: 11, color: overdue ? T.red : T.muted, fontWeight: overdue ? 600 : 400 }}>
              {overdue ? '⚠ ' : ''}{fmtDateShort(project.due_date)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: T.muted }}>Progress</span>
            <span style={{ fontSize: 10, color: T.muted, fontWeight: 500 }}>{project.progress || 0}%</span>
          </div>
          <ProgressBar value={project.progress || 0} height={5} />
        </div>

        {/* Footer: assignee + counts */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {project.assigned_to_name
            ? <Avatar name={project.assigned_to_name} size={22} />
            : <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.06)' }} />
          }
          <div style={{ display: 'flex', gap: 8 }}>
            {project.task_count > 0 && (
              <span style={{ fontSize: 10, color: T.muted }}>
                ✓ {project.completed_task_count}/{project.task_count}
              </span>
            )}
            {project.follower_count > 0 && (
              <span style={{ fontSize: 10, color: T.muted }}>
                👁 {project.follower_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
