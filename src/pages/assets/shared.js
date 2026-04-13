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

export const STATUS_OPTIONS = ['Ready to Deploy', 'Deployed', 'Pending', 'Maintenance', 'Archived', 'Un-deployable', 'Lost/Stolen', 'Retired']

export const STATUS_COLORS = {
  'Ready to Deploy': '#1D9E75',
  'Deployed': '#378ADD',
  'Pending': '#f39c12',
  'Maintenance': '#f39c12',
  'Archived': '#888',
  'Un-deployable': '#888',
  'Retired': '#888',
  'Lost/Stolen': '#e74c3c',
}

export const fmtAgo = (ms) => {
  if (!ms && ms !== 0) return 'never'
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export const fmtDate = (d) => {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const healthScore = (asset) => {
  let score = 100; const issues = []
  if (asset.pending_updates && parseInt(asset.pending_updates) > 10) { score -= 20; issues.push(`${asset.pending_updates} pending updates`) }
  if (asset.antivirus?.includes('Disabled')) { score -= 30; issues.push('Antivirus disabled') }
  if (asset.antivirus?.includes('Outdated')) { score -= 20; issues.push('Antivirus outdated') }
  if (parseFloat(asset.ram_percent) > 90) { score -= 15; issues.push('High RAM') }
  if (asset.disk_health === 'Critical') { score -= 40; issues.push('Disk critical') }
  return { score: Math.max(0, score), issues }
}

export const isOnline = (asset) => {
  if (!asset.last_seen) return false
  const ms = Date.now() - new Date(asset.last_seen).getTime()
  return asset.online && ms < 2 * 60 * 60 * 1000
}
