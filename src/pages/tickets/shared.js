import zammadApi from '../../services/zammadApi'
import { getTicketSettings } from './ticketSettings'

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
export const isAgent = (u) => ['superadmin', 'admin', 'agent'].includes(u?.role)

export const PRIORITY_COLORS = {
  1: { color: '#888',    bg: '#f1f5f9', label: 'Low',       dot: '#94a3b8' },
  2: { color: '#3b82f6', bg: '#eff6ff', label: 'Normal',    dot: '#3b82f6' },
  3: { color: '#f59e0b', bg: '#fffbeb', label: 'High',      dot: '#f59e0b' },
  4: { color: '#e74c3c', bg: '#fef2f2', label: 'Emergency', dot: '#e74c3c' },
}

export const STATE_COLORS = {
  new:               { color: '#1D9E75', bg: '#f0fdf4', label: 'New'          },
  open:              { color: '#3b82f6', bg: '#eff6ff', label: 'Open'         },
  'pending reminder':{ color: '#f59e0b', bg: '#fffbeb', label: 'Pending'      },
  'pending close':   { color: '#f59e0b', bg: '#fffbeb', label: 'Pending Close'},
  closed:            { color: '#888',    bg: '#f1f5f9', label: 'Closed'       },
}

export const STATE_ORDER = ['new', 'open', 'pending reminder', 'closed']

export const stateColor = (stateName) =>
  STATE_COLORS[stateName?.toLowerCase()] || { color: '#888', bg: '#f1f5f9', label: stateName || '—' }

export const priorityColor = (priorityId) =>
  PRIORITY_COLORS[priorityId] || { color: '#888', bg: '#f1f5f9', label: `P${priorityId}`, dot: '#94a3b8' }

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

// ── SLA helpers ───────────────────────────────────────────────────────────────

export const fmtDuration = (ms) => {
  const abs = Math.abs(ms)
  const totalMin = Math.floor(abs / 60000)
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`
  const d = Math.floor(h / 24)
  const rh = h % 24
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`
}

export const fmtCountdown = (ms) => {
  if (ms < 0) return `Overdue by ${fmtDuration(ms)}`
  return `${fmtDuration(ms)} remaining`
}

// Returns SLA deadline as timestamp. Uses Zammad's escalation_at when present,
// otherwise computes from created_at + configured hours per priority.
const getSlaDeadline = (ticket) => {
  if (!ticket?.created_at) return null
  if (ticket.escalation_at) return new Date(ticket.escalation_at).getTime()
  const state = (ticket.state || '').toLowerCase()
  if (state === 'closed') return null
  const settings = getTicketSettings()
  const hours = settings.slaHours[ticket.priority_id] ?? 8
  return new Date(ticket.created_at).getTime() + hours * 3600000
}

export const slaStatus = (ticket) => {
  if (!ticket) return null
  const deadline = getSlaDeadline(ticket)
  if (!deadline) return null
  const created   = new Date(ticket.created_at).getTime()
  const now       = Date.now()
  const remaining = deadline - now
  const total     = deadline - created
  if (total <= 0) return null
  const pct = remaining / total

  if (remaining < 0) return { level: 'red',    pct: 0,  remaining, label: fmtCountdown(remaining) }
  if (pct < 0.10)    return { level: 'red',    pct,     remaining, label: fmtCountdown(remaining) }
  if (pct < 0.50)    return { level: 'yellow', pct,     remaining, label: fmtCountdown(remaining) }
  return               { level: 'green',  pct,     remaining, label: fmtCountdown(remaining) }
}

// Returns true when a ticket should display a "New" badge based on age threshold.
export const isNewTicket = (ticket) => {
  if (!ticket?.created_at) return false
  const settings = getTicketSettings()
  const ageMs = Date.now() - new Date(ticket.created_at).getTime()
  return ageMs < settings.newBadgeHours * 3600000
}

export const SLA_COLORS = {
  green:  { color: '#1D9E75', bg: '#f0fdf4' },
  yellow: { color: '#f59e0b', bg: '#fffbeb' },
  red:    { color: '#e74c3c', bg: '#fef2f2' },
}
