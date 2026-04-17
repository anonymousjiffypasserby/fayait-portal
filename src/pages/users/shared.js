export const T = {
  font: "'Inter', system-ui, sans-serif",
  navy: 'var(--faya-navy)',
  orange: 'var(--faya-orange)',
  border: 'rgba(0,0,0,0.08)',
  muted: '#888780',
  text: '#374151',
  bg: '#f0f2f5',
}

export const ADMIN_ROLES = ['admin', 'superadmin']

// Map service key → display label
export const SERVICE_LABELS = {
  chat: 'Matrix',
  assets: 'Assets',
  tickets: 'Tickets',
  analytics: 'Analytics',
  storage: 'Storage',
  passwords: 'Passwords',
  billing: 'Billing',
  projects: 'Projects',
}

// Access level options per service
export const SERVICE_ACCESS_LEVELS = {
  chat:      ['none', 'member', 'admin'],
  assets:    ['none', 'view', 'admin'],
  tickets:   ['none', 'customer', 'agent', 'admin'],
  analytics: ['none', 'view'],
  storage:   ['none', 'view', 'admin'],
  passwords: ['none', 'view', 'admin'],
  billing:   ['none', 'view', 'admin'],
  projects:  ['none', 'view', 'admin'],
}

export const PROVISION_SERVICE_MAP = {
  chat:    'matrix',
  assets:  'snipe',
  tickets: 'zammad',
}

export const PROVISION_LABELS = {
  matrix: 'Matrix',
  snipe:  'Snipe-IT',
  zammad: 'Zammad',
}

export const STATUS_COLORS = {
  active:   { bg: '#EAF3DE', color: '#3B6D11' },
  inactive: { bg: '#FCEBEB', color: '#A32D2D' },
  invited:  { bg: '#FEF3C7', color: '#92400E' },
}

export function getStatus(u) {
  if (u.invited && !u.last_login) return 'invited'
  if (u.active === false) return 'inactive'
  return 'active'
}

export function initials(name = '') {
  return name.split(' ').filter(Boolean).map(p => p[0].toUpperCase()).slice(0, 2).join('')
}

export function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const btn = (variant = 'ghost') => ({
  border: variant === 'primary' ? 'none' : '0.5px solid rgba(0,0,0,0.15)',
  background: variant === 'primary' ? 'var(--faya-orange)' : variant === 'danger' ? 'none' : 'none',
  color: variant === 'primary' ? '#fff' : variant === 'danger' ? '#A32D2D' : '#5F5E5A',
  borderColor: variant === 'danger' ? 'rgba(163,45,45,0.4)' : undefined,
  borderRadius: 6,
  padding: '5px 11px',
  fontSize: 11,
  fontWeight: variant === 'primary' ? 500 : 400,
  cursor: 'pointer',
  fontFamily: T.font,
})
