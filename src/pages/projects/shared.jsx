export const T = {
  bg: '#f0f2f5', card: '#fff', navy: '#1a1f2e',
  orange: '#ff6b35', green: '#1D9E75', red: '#e74c3c',
  yellow: '#f59e0b', blue: '#3b82f6', purple: '#8b5cf6',
  border: 'rgba(0,0,0,0.07)', muted: '#888', mutedLight: '#aaa',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
  sidebar: 220,
}

export const PRIORITY_COLORS = {
  low:    { bg: '#f0fdf4', color: '#16a34a', dot: '#16a34a' },
  medium: { bg: '#fefce8', color: '#ca8a04', dot: '#ca8a04' },
  high:   { bg: '#fff7ed', color: '#ea580c', dot: '#ea580c' },
  urgent: { bg: '#fef2f2', color: '#dc2626', dot: '#dc2626' },
}

export const STATUS_COLORS = {
  todo:        { bg: '#f1f5f9', color: '#475569', label: 'Todo' },
  in_progress: { bg: '#eff6ff', color: '#2563eb', label: 'In Progress' },
  review:      { bg: '#faf5ff', color: '#7c3aed', label: 'Review' },
  done:        { bg: '#f0fdf4', color: '#16a34a', label: 'Done' },
}

export const COVER_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
]

export const STATUSES = ['todo', 'in_progress', 'review', 'done']
export const PRIORITIES = ['low', 'medium', 'high', 'urgent']

export const ADMIN_ROLES = ['superadmin', 'admin']
export const isAdmin = (u) => ADMIN_ROLES.includes(u?.role)

export const fmtDate = (d) => {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const fmtDateShort = (d) => {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const isOverdue = (d, status) =>
  d && status !== 'done' && new Date(d) < new Date()

export const daysUntil = (d) => {
  if (!d) return null
  return Math.ceil((new Date(d) - new Date()) / 86400000)
}

export const initials = (name) => {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
}

export const Avatar = ({ name, size = 26, color }) => {
  const colors = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']
  const bg = color || colors[(name || '').charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  )
}

export const PriorityBadge = ({ priority }) => {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      background: c.bg, color: c.color, textTransform: 'uppercase', letterSpacing: 0.5,
    }}>
      {priority}
    </span>
  )
}

export const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.todo
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 10,
      background: c.bg, color: c.color,
    }}>
      {c.label}
    </span>
  )
}

export const ProgressBar = ({ value = 0, height = 4, color }) => (
  <div style={{ background: 'rgba(0,0,0,0.08)', borderRadius: height, height, overflow: 'hidden' }}>
    <div style={{
      height: '100%', borderRadius: height,
      width: `${Math.min(100, Math.max(0, value))}%`,
      background: color || (value === 100 ? '#16a34a' : '#3b82f6'),
      transition: 'width 0.3s',
    }} />
  </div>
)
