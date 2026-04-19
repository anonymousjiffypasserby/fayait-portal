const BASE = import.meta.env.VITE_API_URL || 'https://api.fayait.com'
const tok = () => localStorage.getItem('faya_token')
const hdrs = (json = true) => ({
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  ...(tok() ? { Authorization: `Bearer ${tok()}` } : {}),
})

const hr = async (method, path, body) => {
  const isForm = body instanceof FormData
  const res = await fetch(`${BASE}/api/hr${path}`, {
    method,
    headers: hdrs(!isForm),
    body: isForm ? body : body != null ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const hrApi = {
  // Employees
  getMe:           ()        => hr('GET',    '/employees/me'),
  getEmployees:    (q = '')  => hr('GET',    `/employees${q}`),
  getEmployee:     (id)      => hr('GET',    `/employees/${id}`),
  updateEmployee:  (id, b)   => hr('PUT',    `/employees/${id}`, b),
  getDocs:         (id)      => hr('GET',    `/employees/${id}/documents`),
  uploadDoc:       (id, fd)  => hr('POST',   `/employees/${id}/documents`, fd),
  deleteDoc:       (id, did) => hr('DELETE', `/employees/${id}/documents/${did}`),

  // Job functions
  getJobFunctions:    ()       => hr('GET',    '/job-functions'),
  createJobFunction:  (b)      => hr('POST',   '/job-functions', b),
  updateJobFunction:  (id, b)  => hr('PUT',    `/job-functions/${id}`, b),
  deleteJobFunction:  (id)     => hr('DELETE', `/job-functions/${id}`),

  // Settings
  getSettings:       ()       => hr('GET',    '/settings'),
  createDeduction:   (b)      => hr('POST',   '/deductions', b),
  updateDeduction:   (id, b)  => hr('PUT',    `/deductions/${id}`, b),
  deleteDeduction:   (id)     => hr('DELETE', `/deductions/${id}`),
  createLeaveType:   (b)      => hr('POST',   '/leave/types', b),
  updateLeaveType:   (id, b)  => hr('PUT',    `/leave/types/${id}`, b),
  deleteLeaveType:   (id)     => hr('DELETE', `/leave/types/${id}`),
  createShiftTpl:    (b)      => hr('POST',   '/shift-templates', b),
  updateShiftTpl:    (id, b)  => hr('PUT',    `/shift-templates/${id}`, b),
  deleteShiftTpl:    (id)     => hr('DELETE', `/shift-templates/${id}`),

  // Scheduling
  getSchedule:     (q)      => hr('GET',  `/schedules${q}`),
  createSchedule:  (b)      => hr('POST', '/schedules', b),
  publishSchedule: (id)     => hr('PUT',  `/schedules/${id}/publish`, {}),
  copySchedule:    (id)     => hr('POST', `/schedules/${id}/copy`, {}),
  getMySchedule:   (q = '') => hr('GET',  `/my-schedule${q}`),
  createShift:     (b)      => hr('POST', '/shifts', b),
  updateShift:     (id, b)  => hr('PUT',  `/shifts/${id}`, b),
  deleteShift:     (id)     => hr('DELETE', `/shifts/${id}`),
  getMySwaps:      ()       => hr('GET',  '/shift-swaps?mine=true'),
  requestSwap:     (b)      => hr('POST', '/shift-swaps', b),
  respondSwap:     (id, b)  => hr('PUT',  `/shift-swaps/${id}`, b),

  // Leave
  getLeaveTypes:      ()        => hr('GET',  '/leave/types'),
  getLeaveBalances:   (q = '')  => hr('GET',  `/leave/balances${q}`),
  getLeaveRequests:   (q = '')  => hr('GET',  `/leave/requests${q}`),
  createLeaveRequest: (b)       => hr('POST', '/leave/requests', b),
  updateLeaveRequest: (id, b)   => hr('PUT',  `/leave/requests/${id}`, b),
  getLeaveCalendar:   (q)       => hr('GET',  `/leave/calendar${q}`),

  // Timesheets
  getTimesheets:       (q = '') => hr('GET',  `/timesheets${q}`),
  getCurrentTimesheet: ()       => hr('GET',  '/timesheets/current'),
  clockIn:             ()       => hr('POST', '/timesheets/clock-in', {}),
  clockOut:            (b)      => hr('POST', '/timesheets/clock-out', b),
  submitTimesheet:     (id)     => hr('PUT',  `/timesheets/${id}/submit`, {}),
  updateTimesheet:     (id, b)  => hr('PUT',  `/timesheets/${id}`, b),

  // Goals
  getGoals:    (q = '') => hr('GET',    `/goals${q}`),
  createGoal:  (b)      => hr('POST',   '/goals', b),
  updateGoal:  (id, b)  => hr('PUT',    `/goals/${id}`, b),
  deleteGoal:  (id)     => hr('DELETE', `/goals/${id}`),

  // Reviews
  getReviews:   (q = '') => hr('GET',  `/reviews${q}`),
  getReview:    (id)     => hr('GET',  `/reviews/${id}`),
  createReview: (b)      => hr('POST', '/reviews', b),
  updateReview: (id, b)  => hr('PUT',  `/reviews/${id}`, b),

  // Payroll
  getPayPeriods:      ()       => hr('GET',  '/pay-periods'),
  createPayPeriod:    (b)      => hr('POST', '/pay-periods', b),
  closePayPeriod:     (id)     => hr('PUT',  `/pay-periods/${id}/close`, {}),
  getPayrollRuns:     ()       => hr('GET',  '/payroll/runs'),
  getPayrollRun:      (id)     => hr('GET',  `/payroll/runs/${id}`),
  createPayrollRun:   (b)      => hr('POST', '/payroll/runs', b),
  finalizePayrollRun: (id)     => hr('POST', `/payroll/runs/${id}/finalize`, {}),
  getPayslips:        (q = '') => hr('GET',  `/payslips${q}`),
  getPayslip:         (id)     => hr('GET',  `/payslips/${id}`),
  payslipPdfUrl:      (id)     => `${BASE}/api/hr/payslips/${id}/pdf?token=${encodeURIComponent(tok() || '')}`,
  docDownloadUrl:     (empId, docId) => `${BASE}/api/hr/employees/${empId}/documents/${docId}/download?token=${encodeURIComponent(tok() || '')}`,
}

// ── Theme ─────────────────────────────────────────────────────────────────────
export const T = {
  bg: '#f0f2f5', card: '#fff', navy: '#1a1f2e',
  orange: '#ff6b35', green: '#1D9E75', red: '#e74c3c',
  yellow: '#f59e0b', blue: '#3b82f6', purple: '#8b5cf6',
  border: 'rgba(0,0,0,0.07)', muted: '#888',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

export const ADMIN_ROLES = ['superadmin', 'admin']
export const isAdmin = (u) => ADMIN_ROLES.includes(u?.role)

// ── Date/time helpers ─────────────────────────────────────────────────────────
export const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
export const fmtDateShort = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
export const fmtTime = (t) => {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}
export const fmtHours = (h) => (h == null ? '—' : `${parseFloat(h).toFixed(1)}h`)
export const fmtMoney = (n) => (n == null ? '—' : `$${parseFloat(n).toFixed(2)}`)

export const isoMonday = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

export const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const weekDays = (monday) =>
  Array.from({ length: 7 }, (_, i) => addDays(monday, i))

// ── Shared components ─────────────────────────────────────────────────────────
export const initials = (name) => {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
export const Avatar = ({ name, url, size = 32 }) => {
  const bg = AVATAR_COLORS[(name || '').charCodeAt(0) % AVATAR_COLORS.length]
  if (url) return (
    <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  )
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  )
}

export const Spinner = ({ size = 18 }) => (
  <div style={{
    width: size, height: size, border: `2px solid rgba(0,0,0,0.1)`,
    borderTopColor: T.orange, borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  }} />
)

export const EmptyState = ({ icon = '📭', title, sub }) => (
  <div style={{ padding: '48px 24px', textAlign: 'center', color: T.muted }}>
    <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 14, fontWeight: 600, color: '#444', marginBottom: 6 }}>{title}</div>
    {sub && <div style={{ fontSize: 12 }}>{sub}</div>}
  </div>
)

export const ErrMsg = ({ msg }) => msg ? (
  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: T.red, fontSize: 13, marginBottom: 12 }}>
    {msg}
  </div>
) : null

export const Badge = ({ label, color, bg }) => (
  <span style={{
    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
    background: bg || '#f1f5f9', color: color || T.muted,
    textTransform: 'capitalize', whiteSpace: 'nowrap',
  }}>
    {label}
  </span>
)

const CONTRACT_COLORS = {
  full_time:  { bg: '#eff6ff', color: '#2563eb' },
  part_time:  { bg: '#f0fdf4', color: '#16a34a' },
  contractor: { bg: '#fff7ed', color: '#ea580c' },
  intern:     { bg: '#faf5ff', color: '#7c3aed' },
}
const EMP_STATUS_COLORS = {
  active:     { bg: '#f0fdf4', color: '#16a34a' },
  inactive:   { bg: '#fef2f2', color: '#dc2626' },
  on_leave:   { bg: '#fefce8', color: '#ca8a04' },
  terminated: { bg: '#f1f5f9', color: '#64748b' },
}
const LEAVE_STATUS_COLORS = {
  pending:  { bg: '#fefce8', color: '#ca8a04' },
  approved: { bg: '#f0fdf4', color: '#16a34a' },
  denied:   { bg: '#fef2f2', color: '#dc2626' },
  cancelled:{ bg: '#f1f5f9', color: '#64748b' },
}
const RUN_STATUS_COLORS = {
  draft:     { bg: '#f1f5f9', color: '#64748b' },
  finalized: { bg: '#f0fdf4', color: '#16a34a' },
}
const TS_STATUS_COLORS = {
  draft:    { bg: '#f1f5f9', color: '#64748b' },
  submitted:{ bg: '#eff6ff', color: '#2563eb' },
  approved: { bg: '#f0fdf4', color: '#16a34a' },
  rejected: { bg: '#fef2f2', color: '#dc2626' },
}

export const ContractBadge = ({ type }) => {
  const c = CONTRACT_COLORS[type] || { bg: '#f1f5f9', color: '#888' }
  return <Badge label={(type || '').replace('_', ' ')} bg={c.bg} color={c.color} />
}
export const EmpStatusBadge = ({ status }) => {
  const c = EMP_STATUS_COLORS[status] || { bg: '#f1f5f9', color: '#888' }
  return <Badge label={(status || '').replace('_', ' ')} bg={c.bg} color={c.color} />
}
export const LeaveStatusBadge = ({ status }) => {
  const c = LEAVE_STATUS_COLORS[status] || { bg: '#f1f5f9', color: '#888' }
  return <Badge label={status} bg={c.bg} color={c.color} />
}
export const RunStatusBadge = ({ status }) => {
  const c = RUN_STATUS_COLORS[status] || { bg: '#f1f5f9', color: '#888' }
  return <Badge label={status} bg={c.bg} color={c.color} />
}
export const TsBadge = ({ status }) => {
  const c = TS_STATUS_COLORS[status] || { bg: '#f1f5f9', color: '#888' }
  return <Badge label={status} bg={c.bg} color={c.color} />
}

const GOAL_STATUS_COLORS = {
  active:    { bg: '#eff6ff', color: '#2563eb' },
  completed: { bg: '#f0fdf4', color: '#16a34a' },
  cancelled: { bg: '#f1f5f9', color: '#64748b' },
}
export const GoalStatusBadge = ({ status }) => {
  const c = GOAL_STATUS_COLORS[status] || { bg: '#f1f5f9', color: '#888' }
  return <Badge label={status} bg={c.bg} color={c.color} />
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
export const Modal = ({ title, onClose, children, width = 480 }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1200, padding: 20,
  }} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{
      background: '#fff', borderRadius: 12, width: '100%', maxWidth: width,
      boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.navy }}>{title}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: T.muted, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>{children}</div>
    </div>
  </div>
)

// ── Form field helpers ────────────────────────────────────────────────────────
export const Field = ({ label, required, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
      {label}{required && <span style={{ color: T.red }}> *</span>}
    </label>
    {children}
  </div>
)

export const Input = (props) => (
  <input {...props} style={{
    width: '100%', padding: '8px 10px', borderRadius: 7,
    border: '1px solid rgba(0,0,0,0.15)', fontSize: 13,
    outline: 'none', fontFamily: T.font, boxSizing: 'border-box',
    ...props.style,
  }} />
)

export const Select = ({ children, ...props }) => (
  <select {...props} style={{
    width: '100%', padding: '8px 10px', borderRadius: 7,
    border: '1px solid rgba(0,0,0,0.15)', fontSize: 13,
    outline: 'none', fontFamily: T.font, background: '#fff', boxSizing: 'border-box',
    ...props.style,
  }}>
    {children}
  </select>
)

export const Textarea = (props) => (
  <textarea {...props} style={{
    width: '100%', padding: '8px 10px', borderRadius: 7,
    border: '1px solid rgba(0,0,0,0.15)', fontSize: 13, resize: 'vertical',
    outline: 'none', fontFamily: T.font, minHeight: 72, boxSizing: 'border-box',
    ...props.style,
  }} />
)

export const Btn = ({ variant = 'ghost', loading, children, ...props }) => {
  const styles = {
    primary: { background: T.orange, color: '#fff', border: 'none' },
    danger:  { background: '#fef2f2', color: T.red, border: `1px solid #fecaca` },
    ghost:   { background: '#f8f9fa', color: '#374151', border: '1px solid rgba(0,0,0,0.12)' },
    outline: { background: 'transparent', color: T.navy, border: `1px solid ${T.navy}` },
  }
  return (
    <button {...props} disabled={loading || props.disabled} style={{
      ...styles[variant], borderRadius: 7, padding: '8px 16px',
      fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex',
      alignItems: 'center', gap: 6, fontFamily: T.font, transition: 'opacity 0.15s',
      opacity: (loading || props.disabled) ? 0.6 : 1,
      ...props.style,
    }}>
      {loading ? <Spinner size={13} /> : null}
      {children}
    </button>
  )
}

export const globalStyle = `
  @keyframes spin { to { transform: rotate(360deg) } }
  .hr-sidebar::-webkit-scrollbar { display: none }
  .hr-content::-webkit-scrollbar { width: 6px }
  .hr-content::-webkit-scrollbar-track { background: transparent }
  .hr-content::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px }
`
