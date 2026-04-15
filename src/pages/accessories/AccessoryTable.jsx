import { useState } from 'react'
import { T, ACC_STATUS_COLORS, isLowStock, availableQty, fmtDate } from './shared'

const COLS = [
  { key: 'name',              label: 'Name',         sortable: true },
  { key: 'category_name',     label: 'Category',     sortable: true },
  { key: 'manufacturer_name', label: 'Manufacturer', sortable: true },
  { key: '_qty',              label: 'Qty Available',sortable: false },
  { key: 'qty_checked_out',   label: 'Qty Out',      sortable: true },
  { key: 'location_name',     label: 'Location',     sortable: true },
  { key: 'status',            label: 'Status',       sortable: true },
]

const StatusBadge = ({ status }) => {
  if (!status) return <span style={{ color: T.muted, fontSize: 11 }}>—</span>
  const color = ACC_STATUS_COLORS[status] || T.muted
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
      background: color + '18', color, border: `1px solid ${color}30`, whiteSpace: 'nowrap',
    }}>{status}</span>
  )
}

const QtyCell = ({ acc }) => {
  const avail = availableQty(acc)
  const low = isLowStock(acc)
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontWeight: 600, color: low ? T.yellow : T.text, fontSize: 13 }}>{avail}</span>
      {low && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
          background: T.yellow + '22', color: T.yellow, border: `1px solid ${T.yellow}44`,
        }}>Low</span>
      )}
    </span>
  )
}

export default function AccessoryTable({ accessories, selected, onSelect, onSelectAll, onOpen, showRestore, onRestore, onRequest }) {
  const [sort, setSort] = useState({ key: 'name', dir: 1 })

  const sorted = [...accessories].sort((a, b) => {
    const va = a[sort.key] ?? ''
    const vb = b[sort.key] ?? ''
    return sort.dir * (va < vb ? -1 : va > vb ? 1 : 0)
  })

  const toggleSort = (key) => {
    setSort(s => s.key === key ? { key, dir: s.dir * -1 } : { key, dir: 1 })
  }

  const allChecked = accessories.length > 0 && accessories.every(a => selected.has(a.id))

  const thStyle = (col) => ({
    padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6,
    cursor: col.sortable ? 'pointer' : 'default',
    background: '#fafbfc', userSelect: 'none', whiteSpace: 'nowrap',
    borderBottom: `1px solid ${T.border}`,
  })

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.font }}>
        <thead>
          <tr>
            <th style={{ ...thStyle({ sortable: false }), width: 40 }}>
              <input type="checkbox" checked={allChecked} onChange={e => onSelectAll(e.target.checked)}
                style={{ cursor: 'pointer' }} />
            </th>
            {COLS.map(col => (
              <th key={col.key} style={thStyle(col)} onClick={() => col.sortable && toggleSort(col.key)}>
                {col.label}
                {col.sortable && sort.key === col.key && (
                  <span style={{ marginLeft: 4, opacity: 0.5 }}>{sort.dir === 1 ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
            <th style={thStyle({ sortable: false })} />
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLS.length + 2} style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>
                No accessories found
              </td>
            </tr>
          )}
          {sorted.map(acc => (
            <tr
              key={acc.id}
              onClick={() => onOpen(acc)}
              style={{
                cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
                background: selected.has(acc.id) ? '#f0f4ff' : '#fff',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!selected.has(acc.id)) e.currentTarget.style.background = '#fafbfc' }}
              onMouseLeave={e => { if (!selected.has(acc.id)) e.currentTarget.style.background = '#fff' }}
            >
              <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={selected.has(acc.id)}
                  onChange={e => onSelect(acc.id, e.target.checked)} style={{ cursor: 'pointer' }} />
              </td>
              <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: T.text }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🔌</span>
                  <span>{acc.name}</span>
                  {acc.requestable && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, background: '#e8f4fd', color: T.blue, fontWeight: 700 }}>
                      REQ
                    </span>
                  )}
                </div>
              </td>
              <td style={{ padding: '10px 14px', fontSize: 13, color: T.muted }}>{acc.category_name || '—'}</td>
              <td style={{ padding: '10px 14px', fontSize: 13, color: T.muted }}>{acc.manufacturer_name || '—'}</td>
              <td style={{ padding: '10px 14px' }}><QtyCell acc={acc} /></td>
              <td style={{ padding: '10px 14px', fontSize: 13, color: T.text }}>{acc.qty_checked_out || 0}</td>
              <td style={{ padding: '10px 14px', fontSize: 13, color: T.muted }}>{acc.location_name || '—'}</td>
              <td style={{ padding: '10px 14px' }}><StatusBadge status={acc.status} /></td>
              <td style={{ padding: '10px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  {showRestore && (
                    <button onClick={() => onRestore(acc.id)} style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`,
                      background: T.card, cursor: 'pointer', color: T.navy, fontWeight: 600,
                    }}>Restore</button>
                  )}
                  {onRequest && acc.requestable && (
                    <button onClick={() => onRequest(acc)} style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none',
                      background: '#378ADD', cursor: 'pointer', color: '#fff', fontWeight: 600,
                    }}>Request</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
