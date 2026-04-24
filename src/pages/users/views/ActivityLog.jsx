import { useState, useEffect, useCallback } from 'react'
import api from '../../../services/api'
import { T, ADMIN_ROLES, btn } from '../shared'

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const ACTION_COLORS = {
  created:          { bg: '#EAF3DE', color: '#3B6D11' },
  deleted:          { bg: '#FCEBEB', color: '#A32D2D' },
  checked_out:      { bg: '#EEF2FF', color: '#4338CA' },
  checked_in:       { bg: '#F0FDF4', color: '#166534' },
  audited:          { bg: '#FEF3C7', color: '#92400E' },
  user_created:     { bg: '#EAF3DE', color: '#3B6D11' },
  request_approved: { bg: '#EAF3DE', color: '#3B6D11' },
  request_denied:   { bg: '#FCEBEB', color: '#A32D2D' },
}

function ActionBadge({ action }) {
  const c = ACTION_COLORS[action] || { bg: '#f3f4f6', color: '#374151' }
  const label = action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

export default function ActivityLog({ me }) {
  const [rows, setRows] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterUser, setFilterUser] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const isAdmin = ADMIN_ROLES.includes(me?.role)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [logData, usersData] = await Promise.all([
        api.getAuditLog(50),
        isAdmin ? api.getUsers() : Promise.resolve([]),
      ])
      setRows(logData.rows || [])
      setUsers(usersData)
    } catch {}
    finally { setLoading(false) }
  }, [isAdmin])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter(r => {
    if (filterUser && r.performed_by !== filterUser) return false
    if (dateFrom && new Date(r.created_at) < new Date(dateFrom)) return false
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59)
      if (new Date(r.created_at) > to) return false
    }
    return true
  })

  const inputSt = { padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: T.font }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: T.navy }}>Activity Log</h2>
        <button onClick={load} style={btn('ghost')}>Refresh</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {isAdmin && users.length > 0 && (
          <select
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            style={{ ...inputSt, cursor: 'pointer', minWidth: 180 }}
          >
            <option value="">All Users</option>
            {[...new Set(rows.map(r => r.performed_by).filter(Boolean))].sort().map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputSt} title="From date" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputSt} title="To date" />
        {(filterUser || dateFrom || dateTo) && (
          <button onClick={() => { setFilterUser(''); setDateFrom(''); setDateTo('') }} style={{ ...btn('ghost'), fontSize: 12 }}>
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f4f5f7', borderBottom: `1px solid ${T.border}` }}>
                {['Action', 'Performed By', 'Asset', 'Details', 'Timestamp'].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: T.muted }}>No activity found.</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: '10px 16px' }}><ActionBadge action={r.action} /></td>
                  <td style={{ padding: '10px 16px', color: T.navy, fontWeight: 500 }}>{r.performed_by || '—'}</td>
                  <td style={{ padding: '10px 16px', color: T.muted }}>
                    {r.hostname ? (
                      <span>{r.hostname}{r.asset_tag ? ` · ${r.asset_tag}` : ''}</span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', color: T.muted, maxWidth: 220 }}>
                    {r.details ? (
                      <span style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                        {typeof r.details === 'string' ? r.details : JSON.stringify(r.details)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', color: T.muted, whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 0 && (
            <div style={{ padding: '8px 16px', fontSize: 11, color: T.muted, borderTop: `1px solid ${T.border}` }}>
              Showing {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
