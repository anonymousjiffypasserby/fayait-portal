import { PROVISION_LABELS } from './shared'

const ICONS = { provisioned: '✅', failed: '❌', pending: '⏳' }
const COLORS = {
  provisioned: { bg: '#EAF3DE', color: '#3B6D11' },
  failed:      { bg: '#FCEBEB', color: '#A32D2D' },
  pending:     { bg: '#FEF3C7', color: '#92400E' },
}

export default function ProvisioningBadge({ service, status = 'pending', small = false }) {
  const label = PROVISION_LABELS[service] || service
  const c = COLORS[status] || COLORS.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: small ? 10 : 11, padding: small ? '1px 5px' : '2px 7px',
      borderRadius: 4, fontWeight: 500,
      background: c.bg, color: c.color,
    }}>
      {ICONS[status]} {label}
    </span>
  )
}

export function ProvisioningRow({ provisioningStatus = {} }) {
  if (!Object.keys(provisioningStatus).length) return null
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
      {Object.entries(provisioningStatus).map(([svc, st]) => (
        <ProvisioningBadge key={svc} service={svc} status={st} small />
      ))}
    </div>
  )
}
