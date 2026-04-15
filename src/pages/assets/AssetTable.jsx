import { useState } from 'react'
import { T, fmtAgo, healthScore, isOnline, STATUS_COLORS } from './shared'

const COLS = [
  { key: 'hostname', label: 'Device', sortable: true },
  { key: 'asset_tag', label: 'Tag', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'assigned_user', label: 'Assigned To', sortable: true },
  { key: 'location', label: 'Location', sortable: true },
  { key: '_ram', label: 'RAM', sortable: false },
  { key: '_health', label: 'Health', sortable: false },
  { key: 'last_seen', label: 'Last Seen', sortable: true },
]

const OnlineDot = ({ asset }) => {
  const on = isOnline(asset)
  const color = on ? T.green : '#ccc'
  return (
    <div
      style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: on ? `0 0 5px ${color}` : 'none', flexShrink: 0 }}
      title={on ? 'Online' : `Offline${asset.last_seen ? ` — last seen ${fmtAgo(Date.now() - new Date(asset.last_seen).getTime())}` : ''}`}
    />
  )
}

const StatusBadge = ({ status }) => {
  if (!status) return <span style={{ color: T.muted, fontSize: 11 }}>—</span>
  const color = STATUS_COLORS[status] || T.muted
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
      background: color + '18',
      color,
      whiteSpace: 'nowrap',
      border: `1px solid ${color}30`,
    }}>
      {status}
    </span>
  )
}

const RamBar = ({ value }) => {
  if (value === null || value === undefined) return <span style={{ color: T.muted, fontSize: 11 }}>—</span>
  const pct = parseFloat(value)
  if (isNaN(pct)) return <span style={{ color: T.muted, fontSize: 11 }}>—</span>
  const c = pct > 90 ? T.red : pct > 75 ? T.yellow : T.green
  return (
    <div style={{ width: 72 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: c, fontWeight: 600 }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ height: 4, background: '#f0f2f5', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: c, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

const HealthBadge = ({ asset }) => {
  const { score } = healthScore(asset)
  const color = score >= 80 ? T.green : score >= 60 ? T.yellow : T.red
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color }}>
      {score}
    </div>
  )
}

const DeviceIcon = ({ type }) => {
  const icons = { Laptop: '💻', Desktop: '🖥️', Server: '🖧' }
  return <span style={{ fontSize: 15, marginRight: 7 }}>{icons[type] || '💻'}</span>
}

export default function AssetTable({ assets, selected, onSelect, onSelectAll, onOpen, showRestore, onRestore, onRequest }) {
  const [sort, setSort] = useState({ key: 'hostname', dir: 1 })

  const sorted = [...assets].sort((a, b) => {
    const va = a[sort.key] ?? ''
    const vb = b[sort.key] ?? ''
    return sort.dir * (va < vb ? -1 : va > vb ? 1 : 0)
  })

  const toggleSort = (key) => {
    setSort(s => ({ key, dir: s.key === key ? -s.dir : 1 }))
  }

  const allSelected = assets.length > 0 && assets.every(a => selected.has(a.id))

  const thStyle = {
    padding: '8px 10px',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: T.muted,
    userSelect: 'none',
    whiteSpace: 'nowrap',
    borderBottom: `2px solid ${T.border}`,
    background: '#f8f9fa',
    textAlign: 'left',
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${T.border}`, background: T.card }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.font }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 36, paddingLeft: 14 }}>
              <input type="checkbox" checked={allSelected} onChange={e => onSelectAll(e.target.checked)} />
            </th>
            <th style={{ ...thStyle, width: 16, paddingLeft: 10 }} title="Online/Offline" />
            {COLS.map(c => (
              <th
                key={c.key}
                style={{ ...thStyle, cursor: c.sortable ? 'pointer' : 'default' }}
                onClick={() => c.sortable && toggleSort(c.key)}
              >
                {c.label} {c.sortable && sort.key === c.key ? (sort.dir === 1 ? '↑' : '↓') : ''}
              </th>
            ))}
            <th style={thStyle}>{showRestore ? 'Actions' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((asset, i) => (
            <tr
              key={asset.id}
              onClick={() => onOpen(asset)}
              style={{
                cursor: 'pointer',
                background: selected.has(asset.id) ? '#f0f7ff' : i % 2 === 0 ? T.card : '#fafbfc',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!selected.has(asset.id)) e.currentTarget.style.background = '#f5f6f8' }}
              onMouseLeave={e => { e.currentTarget.style.background = selected.has(asset.id) ? '#f0f7ff' : i % 2 === 0 ? T.card : '#fafbfc' }}
            >
              <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={selected.has(asset.id)} onChange={e => onSelect(asset.id, e.target.checked)} />
              </td>
              <td style={{ padding: '10px 10px' }}>
                <OnlineDot asset={asset} />
              </td>
              <td style={{ padding: '10px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <DeviceIcon type={asset.asset_type} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{asset.hostname}</div>
                    {asset.model && <div style={{ fontSize: 10, color: T.muted }}>{asset.model}</div>}
                  </div>
                </div>
              </td>
              <td style={{ padding: '10px 10px', fontSize: 11, fontFamily: 'monospace', color: T.muted }}>{asset.asset_tag || '—'}</td>
              <td style={{ padding: '10px 10px' }}><StatusBadge status={asset.status} /></td>
              <td style={{ padding: '10px 10px', fontSize: 12 }}>{asset.assigned_user || <span style={{ color: T.muted }}>Unassigned</span>}</td>
              <td style={{ padding: '10px 10px', fontSize: 12, color: T.muted }}>{asset.location || '—'}</td>
              <td style={{ padding: '10px 10px' }}><RamBar value={asset.ram_percent} /></td>
              <td style={{ padding: '10px 10px' }}><HealthBadge asset={asset} /></td>
              <td style={{ padding: '10px 10px', fontSize: 11, color: T.muted, whiteSpace: 'nowrap' }}>
                {asset.last_seen ? fmtAgo(Date.now() - new Date(asset.last_seen).getTime()) : 'never'}
              </td>
              <td style={{ padding: '10px 10px' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    onClick={() => onOpen(asset)}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.blue, fontWeight: 600 }}
                  >
                    Details
                  </button>
                  {showRestore && (
                    <button
                      onClick={() => onRestore(asset.id)}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', background: T.green, cursor: 'pointer', color: '#fff', fontWeight: 600 }}
                    >
                      Restore
                    </button>
                  )}
                  {onRequest && asset.requestable && (
                    <button
                      onClick={() => onRequest(asset)}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#378ADD', cursor: 'pointer', color: '#fff', fontWeight: 600 }}
                    >
                      Request
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {assets.length === 0 && (
            <tr>
              <td colSpan={12} style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>No assets found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
