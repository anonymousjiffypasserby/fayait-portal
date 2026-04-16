export const T = {
  navy:   '#1e3a5f',
  blue:   '#2563eb',
  red:    '#ef4444',
  green:  '#22c55e',
  orange: '#f97316',
  text:   '#1a2332',
  muted:  '#6b7280',
  border: '#e5e7eb',
  bg:     '#f0f2f5',
  card:   '#ffffff',
  font:   "'DM Sans', 'Helvetica Neue', sans-serif",
}

export const BASE = import.meta.env.VITE_API_URL || 'https://api.fayait.com'

export function authHeaders() {
  const token = localStorage.getItem('faya_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function buildUrl(path, params = {}) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return `${BASE}/api/reports${path}${q ? '?' + q : ''}`
}

export async function fetchReport(path, params = {}) {
  const url = buildUrl(path, params)
  const res = await fetch(url, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch report')
  return data
}

export async function exportReport(path, params, filename) {
  const url = buildUrl(path, params)
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Export failed') }
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function formatDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d) ? v : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatCurrency(v) {
  if (v === null || v === undefined || v === '') return '—'
  return `$${parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Shared styles
export const inputStyle = {
  padding: '7px 10px', borderRadius: 7, border: `1px solid ${T.border}`,
  fontSize: 13, fontFamily: T.font, background: '#fff', outline: 'none',
}
export const selectStyle = { ...inputStyle, cursor: 'pointer' }
export const btnStyle = (color = T.blue) => ({
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: color, color: '#fff', fontWeight: 600, fontSize: 13,
  cursor: 'pointer', fontFamily: T.font,
})
export const outlineBtnStyle = {
  padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`,
  background: '#fff', color: T.text, fontWeight: 500, fontSize: 13,
  cursor: 'pointer', fontFamily: T.font,
}
