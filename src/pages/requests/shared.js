export const T = {
  bg: '#f0f2f5',
  card: '#fff',
  navy: '#1a1f2e',
  orange: '#ff6b35',
  green: '#1D9E75',
  red: '#e74c3c',
  yellow: '#f39c12',
  blue: '#378ADD',
  border: 'rgba(0,0,0,0.06)',
  text: '#1a1f2e',
  muted: '#888',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

export const STATUS_COLORS = {
  Pending:   '#f39c12',
  Approved:  '#1D9E75',
  Denied:    '#e74c3c',
  Cancelled: '#888',
}

export const ITEM_TYPE_ICONS = {
  asset:      '💻',
  accessory:  '🔌',
  consumable: '📦',
}

export const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const fmtDateTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
