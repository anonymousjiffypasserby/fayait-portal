export { T, fmtDate } from '../assets/shared'

export const CON_STATUSES = ['Available', 'Out of Stock', 'Retired']

export const CON_STATUS_COLORS = {
  'Available':    '#1D9E75',
  'Out of Stock': '#e85d5d',
  'Retired':      '#888',
}

export const isLowStock = (c) =>
  !c.retired && c.min_quantity > 0 && c.quantity <= c.min_quantity && c.quantity > 0

export const isOutOfStock = (c) => (c.quantity || 0) === 0 && !c.retired
