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

export const ITEM_TYPE_ICONS = {
  asset:      '💻',
  accessory:  '🔌',
  consumable: '📦',
}

export const ITEM_TYPE_LABELS = {
  asset:      'Asset',
  accessory:  'Accessory',
  consumable: 'Consumable',
}

export const fmtDate = (d) => {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const isCheckedOut = (kit) => parseInt(kit.active_checkouts) > 0
