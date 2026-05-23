export const T = {
  bg:         '#f0f2f5',
  card:       '#ffffff',
  border:     'rgba(0,0,0,0.07)',
  navy:       '#1B2A4A',
  navyLight:  '#243656',
  orange:     '#E85D24',
  orangeLight:'#FDF0EA',
  muted:      '#64748b',
  mutedLight: '#94a3b8',
  green:      '#16a34a',
  red:        '#dc2626',
  yellow:     '#d97706',
  blue:       '#2563eb',
  font:       "'DM Sans', 'Helvetica Neue', sans-serif",
  sidebar:    '#fafbfc',
}

export const ADMIN_ROLES = ['superadmin', 'admin']
export const isAdmin = (u) => ADMIN_ROLES.includes(u?.role)

// ── formatters ────────────────────────────────────────────────────────────────

export function fmtCurrency(v, currency = '') {
  if (v == null || v === '') return '—'
  const n = parseFloat(v)
  if (isNaN(n)) return '—'
  return (currency ? currency + ' ' : '') + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtDate(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateShort(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function monthStart() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export function yearStart() {
  return `${new Date().getFullYear()}-01-01`
}

// ── Status badge maps ─────────────────────────────────────────────────────────

const DOC_STATUS = {
  0: { label: 'Draft',     bg: '#f1f5f9', color: '#475569' },
  1: { label: 'Submitted', bg: '#dbeafe', color: '#1d4ed8' },
  2: { label: 'Cancelled', bg: '#fee2e2', color: '#b91c1c' },
}

const INV_STATUS = {
  'Draft':               { bg: '#f1f5f9', color: '#475569' },
  'Submitted':           { bg: '#dbeafe', color: '#1d4ed8' },
  'Unpaid':              { bg: '#fef3c7', color: '#92400e' },
  'Partly Paid':         { bg: '#ede9fe', color: '#5b21b6' },
  'Paid':                { bg: '#dcfce7', color: '#15803d' },
  'Overdue':             { bg: '#fee2e2', color: '#b91c1c' },
  'Return':              { bg: '#f5f3ff', color: '#4c1d95' },
  'Credit Note Issued':  { bg: '#fce7f3', color: '#9d174d' },
  'Cancelled':           { bg: '#fee2e2', color: '#b91c1c' },
}

const ORDER_STATUS = {
  'Draft':               { bg: '#f1f5f9', color: '#475569' },
  'To Deliver and Bill': { bg: '#fef3c7', color: '#92400e' },
  'To Bill':             { bg: '#ede9fe', color: '#5b21b6' },
  'To Deliver':          { bg: '#dbeafe', color: '#1d4ed8' },
  'Completed':           { bg: '#dcfce7', color: '#15803d' },
  'Cancelled':           { bg: '#fee2e2', color: '#b91c1c' },
  'Closed':              { bg: '#e2e8f0', color: '#475569' },
  'On Hold':             { bg: '#fde8d8', color: '#9a3412' },
}

function badge(label, bg, color) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 5,
      fontSize: 11, fontWeight: 600, background: bg, color,
    }}>{label}</span>
  )
}

export function DocStatusBadge({ status }) {
  const s = DOC_STATUS[status] || { label: String(status), bg: '#f1f5f9', color: '#475569' }
  return badge(s.label, s.bg, s.color)
}

export function InvStatusBadge({ status }) {
  const s = INV_STATUS[status] || { bg: '#f1f5f9', color: '#475569' }
  return badge(status || '—', s.bg, s.color)
}

export function OrderStatusBadge({ status }) {
  const s = ORDER_STATUS[status] || { bg: '#f1f5f9', color: '#475569' }
  return badge(status || '—', s.bg, s.color)
}

// ── Primitive components ──────────────────────────────────────────────────────

export function Spinner({ size = 20 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: size, height: size,
        border: `2px solid ${T.border}`,
        borderTopColor: T.orange,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) }}`}</style>
    </div>
  )
}

export function EmptyState({ icon = '📭', message = 'No data found', sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: T.muted }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: T.navy }}>{message}</div>
      {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

export function ErrMsg({ error }) {
  if (!error) return null
  return (
    <div style={{
      margin: '12px 0', padding: '10px 14px', borderRadius: 8,
      background: '#fee2e2', color: T.red, fontSize: 13,
    }}>{String(error)}</div>
  )
}

export function Btn({ onClick, children, disabled, variant = 'primary', small }) {
  const styles = {
    primary:  { background: T.navy,   color: '#fff', border: 'none' },
    orange:   { background: T.orange, color: '#fff', border: 'none' },
    outline:  { background: '#fff',   color: T.navy, border: `1px solid ${T.border}` },
    danger:   { background: '#fff',   color: T.red,  border: `1px solid #fca5a5` },
    ghost:    { background: 'transparent', color: T.muted, border: 'none' },
  }
  const s = styles[variant] || styles.primary
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s, borderRadius: 7, cursor: disabled ? 'not-allowed' : 'pointer',
        padding: small ? '5px 12px' : '7px 16px',
        fontSize: small ? 12 : 13, fontWeight: 600,
        opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
    >{children}</button>
  )
}

export function StatCard({ label, value, sub, icon, accent, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, minWidth: 150, background: T.card, borderRadius: 12,
        border: `1px solid ${T.border}`, padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: hov && onClick ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.15s, transform 0.1s',
        transform: hov && onClick ? 'translateY(-1px)' : 'none',
        borderTop: accent ? `3px solid ${accent}` : `1px solid ${T.border}`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {icon && <div style={{ fontSize: 22, marginBottom: 8, opacity: 0.7 }}>{icon}</div>}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: T.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: T.navy, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

export function SectionCard({ title, action, children, style }) {
  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden', ...style }}>
      {(title || action) && (
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{title}</div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

export function PageHeader({ title, sub, actions }) {
  return (
    <div style={{
      padding: '20px 24px 16px',
      borderBottom: `1px solid ${T.border}`,
      background: T.card,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.navy }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder = 'Search…' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        border: `1px solid ${T.border}`, borderRadius: 8,
        padding: '7px 12px', fontSize: 13, color: T.navy,
        background: '#fff', outline: 'none', minWidth: 220,
      }}
    />
  )
}

export function FilterSelect({ value, onChange, options, placeholder = 'All' }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        border: `1px solid ${T.border}`, borderRadius: 8,
        padding: '7px 12px', fontSize: 13, color: T.navy,
        background: '#fff', outline: 'none', cursor: 'pointer',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  )
}

// Simple table: cols = [{ key, label, render?, width? }]
export function DataTable({ cols, rows, onRowClick, loading, emptyIcon, emptyMsg }) {
  if (loading) return <Spinner />
  if (!rows || rows.length === 0) return <EmptyState icon={emptyIcon} message={emptyMsg || 'No records found'} />
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${T.border}` }}>
            {cols.map(c => (
              <th key={c.key} style={{
                padding: '10px 16px', textAlign: 'left',
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: 0.6, color: T.muted,
                width: c.width,
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.name || i}
              onClick={() => onRowClick?.(row)}
              style={{
                borderBottom: `1px solid ${T.border}`,
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = '#f8fafc' }}
              onMouseLeave={e => { e.currentTarget.style.background = '' }}
            >
              {cols.map(c => (
                <td key={c.key} style={{ padding: '10px 16px', color: T.navy, verticalAlign: 'middle' }}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SetupNotice({ erpUrl }) {
  return (
    <div style={{
      margin: '24px', padding: '20px 24px', borderRadius: 12,
      background: T.orangeLight, border: `1px solid #f9c3ab`,
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ fontSize: 28 }}>⚙️</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>ERPNext Setup Required</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>
          No company has been configured yet. Complete the ERPNext setup wizard to unlock Finance, Inventory and Commerce features.
        </div>
      </div>
      <a
        href={erpUrl || 'https://erp.fayait.com'}
        target="_blank"
        rel="noreferrer"
        style={{
          padding: '8px 16px', borderRadius: 8, background: T.orange, color: '#fff',
          fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
        }}
      >Open ERPNext →</a>
    </div>
  )
}

export const globalStyle = `
  .erp-content::-webkit-scrollbar { width: 5px }
  .erp-content::-webkit-scrollbar-track { background: transparent }
  .erp-content::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px }
  .erp-sidebar::-webkit-scrollbar { display: none }
`

// re-export useState so shared consumers don't need their own import
export { useState } from 'react'
