export { T, fmtDate } from '../assets/shared'

export const ACC_STATUSES = ['Available', 'Checked Out', 'Retired']

export const ACC_STATUS_COLORS = {
  'Available':   '#1D9E75',
  'Checked Out': '#378ADD',
  'Retired':     '#888',
}

export const isLowStock = (a) =>
  !a.retired && a.min_quantity > 0 && (a.quantity - (a.qty_checked_out || 0)) <= a.min_quantity

export const availableQty = (a) => Math.max(0, (a.quantity || 0) - (a.qty_checked_out || 0))
