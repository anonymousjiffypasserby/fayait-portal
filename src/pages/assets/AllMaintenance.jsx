import { useState, useEffect } from 'react'
import { T, fmtDate } from './shared'
import api from '../../services/api'

export default function AllMaintenance() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.getAllMaintenance()
      .then(d => setRecords(Array.isArray(d) ? d : (d.rows || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = records.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.title?.toLowerCase().includes(q) ||
      r.asset_hostname?.toLowerCase().includes(q) ||
      r.supplier?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q)
    )
  })

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.navy }}>Maintenances</h1>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{filtered.length} records</div>
      </div>

      <input
        placeholder="Search title, asset, supplier..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', maxWidth: 400, padding: '8px 12px', borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
      />

      {error && <div style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>Failed to load: {error}</div>}

      {loading ? (
        <div style={{ color: T.muted, fontSize: 13 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: T.muted, fontSize: 13, padding: 40, textAlign: 'center' }}>No maintenance records found.</div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${T.border}`, background: T.card }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.font }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Asset', 'Title', 'Supplier', 'Cost', 'Start Date', 'End Date', 'Status'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: T.muted, textAlign: 'left', borderBottom: `2px solid ${T.border}`, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id || i} style={{ background: i % 2 === 0 ? T.card : '#fafbfc' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: T.text }}>{r.asset_hostname || r.asset_tag || '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{r.title}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: T.muted }}>{r.supplier || '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>{r.cost ? `$${r.cost}` : '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: T.muted, whiteSpace: 'nowrap' }}>{fmtDate(r.start_date) || fmtDate(r.scheduled_date) || '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: T.muted, whiteSpace: 'nowrap' }}>{fmtDate(r.end_date) || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {r.completed ? (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#e8f5e9', color: T.green, fontWeight: 600 }}>Completed</span>
                    ) : (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#fff3e0', color: T.orange, fontWeight: 600 }}>Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
