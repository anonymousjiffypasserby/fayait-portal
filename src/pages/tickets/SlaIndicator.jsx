import { slaStatus, SLA_COLORS } from './shared'

export default function SlaIndicator({ ticket, compact = false }) {
  const sla = slaStatus(ticket)
  if (!sla) return null

  const c = SLA_COLORS[sla.level]

  if (compact) {
    return (
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: c.color, flexShrink: 0,
        title: sla.label,
      }} title={sla.label} />
    )
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 8, fontSize: 11, fontWeight: 600,
      color: c.color, background: c.bg, whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 7 }}>●</span>
      {sla.label}
    </span>
  )
}
