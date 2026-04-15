export { T, fmtDate } from '../assets/shared'

export const COMP_STATUSES = ['Available', 'Installed', 'Retired']

export const COMP_STATUS_COLORS = {
  'Available': '#1D9E75',
  'Installed':  '#378ADD',
  'Retired':    '#888',
}

export const availableQty = (c) =>
  Math.max(0, (c.quantity || 0) - parseInt(c.qty_installed || 0))

export const isLowStock = (c) =>
  !c.retired && c.min_quantity > 0 && availableQty(c) <= c.min_quantity
