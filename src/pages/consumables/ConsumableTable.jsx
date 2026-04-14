import { useState } from 'react'
import { T, CON_STATUS_COLORS, isLowStock, isOutOfStock, fmtDate } from './shared'

const COLS = [
  { key: 'name',              label: 'Name',         sortable: true },
  { key: 'category_name',     label: 'Category',     sortable: true },
  { key: 'manufacturer_name', label: 'Manufacturer', sortable: true },
  { key: 'quantity',          label: 'Qty',          sortable: true },
  { key: 'location_name',     label: 'Location',     sortable: true },
  { key: 'status',            label: 'Status',       sortable: true },
]

const StatusBadge = ({ con }) => {
  if (isOutOfStock(con)) {
    return (
      <span style={{
        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
        background: T.red + '18', color: T.red, border: `1px solid ${T.red}30`, whiteSpace: 'nowrap',
      }}>Out of Stock</span>
    )
  }
  const status = con.status || 'Available'
  const color = CON_STATUS_COLORS[status] || T.muted
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
      background: color + '18', color, border: `1px solid ${color}30`, whiteSpace: 'nowrap',
    }}>{status}</span>
  )
}

const QtyCell = ({ con }) => {
  const low = isLowStock(con)
  const out = isOutOfStock(con)
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontWeight: 600, color: out ? T.red : low ? T.yellow : T.text, fontSize: 13 }}>
        {con.quantity || 0}
      </span>
      {out && (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: T.red + '22', color: T.red, border: `1px solid ${T.red}44` }}>
          Out
        </span>
      )}
      {!out && low && (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: T.yellow + '22', color: T.yellow, border: `1px solid ${T.yellow}44` }}>
          Low
        </span>
      )}
    </span>
  )
}

export default function ConsumableTable({ consumables, selected, onSelect, onSelectAll, onOpen, showRestore, onRestore }) {
  const [sort, setSort] = useState({ key: 'name', dir: 1 })

  const sorted = [...consumables].sort((a, b) => {
    const va = a[sort.key] ?? ''
    const vb = b[sort.key] ?? ''
    return sort.dir * (va < vb ? -1 : va > vb ? 1 : 0)
  })

  const toggleSort = (key) => setSort(s => s.key === key ? { key, dir: s.dir * -1 } : { key, dir: 1 })
  const allChecked = consumables.length > 0 && consumables.every(c => selected.has(c.id))

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
              <input type="checkbox" checked={allChecked} onChange={e => onSelectAll(e.target.checked)} style={{ cursor: 'pointer' }} />
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
                No consumables found
              </td>
            </tr>
          )}
          {sorted.map(con => (
            <tr
              key={con.id}
              onClick={() => onOpen(con)}
              style={{
                cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
                background: selected.has(con.id) ? '#f0f4ff' : '#fff',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!selected.has(con.id)) e.currentTarget.style.background = '#fafbfc' }}
              onMouseLeave={e => { if (!selected.has(con.id)) e.currentTarget.style.background = '#fff' }}
            >
              <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={selected.has(con.id)}
                  onChange={e => onSelect(con.id, e.target.checked)} style={{ cursor: 'pointer' }} />
              </td>
              <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: T.text }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📦</span>
                  <span>{con.name}</span>
                  {con.requestable && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, background: '#e8f4fd', color: T.blue, fontWeight: 700 }}>REQ</span>
                  )}
                </div>
              </td>
              <td style={{ padding: '10px 14px', fontSize: 13, color: T.muted }}>{con.category_name || '—'}</td>
              <td style={{ padding: '10px 14px', fontSize: 13, color: T.muted }}>{con.manufacturer_name || '—'}</td>
              <td style={{ padding: '10px 14px' }}><QtyCell con={con} /></td>
              <td style={{ padding: '10px 14px', fontSize: 13, color: T.muted }}>{con.location_name || '—'}</td>
              <td style={{ padding: '10px 14px' }}><StatusBadge con={con} /></td>
              <td style={{ padding: '10px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                {showRestore && (
                  <button onClick={() => onRestore(con.id)} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`,
                    background: T.card, cursor: 'pointer', color: T.navy, fontWeight: 600,
                  }}>Restore</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
