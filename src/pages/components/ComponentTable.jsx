import { useState } from 'react'
import { T, COMP_STATUS_COLORS, availableQty, isLowStock } from './shared'

const COLS = [
  { key: 'name',              label: 'Name',         sortable: true },
  { key: 'category_name',     label: 'Category',     sortable: true },
  { key: 'manufacturer_name', label: 'Manufacturer', sortable: true },
  { key: 'serial',            label: 'Serial',       sortable: true },
  { key: '_avail',            label: 'Available',    sortable: false },
  { key: 'qty_installed',     label: 'Installed',    sortable: true },
  { key: 'location_name',     label: 'Location',     sortable: true },
]

const QtyCell = ({ comp }) => {
  const avail = availableQty(comp)
  const low = isLowStock(comp)
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontWeight: 600, color: low ? T.yellow : T.text, fontSize: 13 }}>{avail}</span>
      {low && (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: T.yellow + '22', color: T.yellow, border: `1px solid ${T.yellow}44` }}>
          Low
        </span>
      )}
    </span>
  )
}

export default function ComponentTable({ components, selected, onSelect, onSelectAll, onOpen, showRestore, onRestore }) {
  const [sort, setSort] = useState({ key: 'name', dir: 1 })

  const sorted = [...components].sort((a, b) => {
    const va = a[sort.key] ?? ''
    const vb = b[sort.key] ?? ''
    return sort.dir * (va < vb ? -1 : va > vb ? 1 : 0)
  })

  const toggleSort = (key) => setSort(s => s.key === key ? { key, dir: s.dir * -1 } : { key, dir: 1 })
  const allChecked = components.length > 0 && components.every(c => selected.has(c.id))

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
                No components found
              </td>
            </tr>
          )}
          {sorted.map(comp => (
            <tr
              key={comp.id}
              onClick={() => onOpen(comp)}
              style={{
                cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
                background: selected.has(comp.id) ? '#f0f4ff' : '#fff',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!selected.has(comp.id)) e.currentTarget.style.background = '#fafbfc' }}
              onMouseLeave={e => { if (!selected.has(comp.id)) e.currentTarget.style.background = '#fff' }}
            >
              <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={selected.has(comp.id)}
                  onChange={e => onSelect(comp.id, e.target.checked)} style={{ cursor: 'pointer' }} />
              </td>
              <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: T.text }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🔩</span>
                  <span>{comp.name}</span>
                </div>
              </td>
              <td style={{ padding: '10px 14px', fontSize: 13, color: T.muted }}>{comp.category_name || '—'}</td>
              <td style={{ padding: '10px 14px', fontSize: 13, color: T.muted }}>{comp.manufacturer_name || '—'}</td>
              <td style={{ padding: '10px 14px', fontSize: 12, color: T.muted, fontFamily: 'monospace' }}>{comp.serial || '—'}</td>
              <td style={{ padding: '10px 14px' }}><QtyCell comp={comp} /></td>
              <td style={{ padding: '10px 14px', fontSize: 13, color: T.text }}>{parseInt(comp.qty_installed || 0)}</td>
              <td style={{ padding: '10px 14px', fontSize: 13, color: T.muted }}>{comp.location_name || '—'}</td>
              <td style={{ padding: '10px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                {showRestore && (
                  <button onClick={() => onRestore(comp.id)} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`,
                    background: '#fff', cursor: 'pointer', color: T.navy, fontWeight: 600,
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
