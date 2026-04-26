import zammadApi from '../../services/zammadApi'

export { zammadApi }

export const T = {
  bg: '#f0f2f5', card: '#fff', navy: '#1a1f2e',
  orange: '#ff6b35', green: '#1D9E75', red: '#e74c3c',
  yellow: '#f59e0b', blue: '#3b82f6', purple: '#8b5cf6',
  border: 'rgba(0,0,0,0.07)', muted: '#888',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
  sidebar: 220,
}

export const ADMIN_ROLES = ['superadmin', 'admin']
export const isAdmin = (u) => ADMIN_ROLES.includes(u?.role)

// Zammad priority IDs: 1=low, 2=normal, 3=high, 4=emergency (varies by instance)
export const PRIORITY_COLORS = {
  1: { color: '#888',    bg: '#f1f5f9', label: 'Low'       },
  2: { color: '#3b82f6', bg: '#eff6ff', label: 'Normal'    },
  3: { color: '#f59e0b', bg: '#fffbeb', label: 'High'      },
  4: { color: '#e74c3c', bg: '#fef2f2', label: 'Emergency' },
}

export const STATE_COLORS = {
  new:              { color: '#1D9E75', bg: '#f0fdf4', label: 'New'              },
  open:             { color: '#3b82f6', bg: '#eff6ff', label: 'Open'             },
  'pending reminder':{ color: '#f59e0b', bg: '#fffbeb', label: 'Pending'         },
  'pending close':  { color: '#f59e0b', bg: '#fffbeb', label: 'Pending Close'    },
  closed:           { color: '#888',    bg: '#f1f5f9', label: 'Closed'           },
}

export const stateColor = (stateName) =>
  STATE_COLORS[stateName?.toLowerCase()] || { color: '#888', bg: '#f1f5f9', label: stateName || '—' }

export const priorityColor = (priorityId) =>
  PRIORITY_COLORS[priorityId] || { color: '#888', bg: '#f1f5f9', label: `P${priorityId}` }

export const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const fmtDateTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}
