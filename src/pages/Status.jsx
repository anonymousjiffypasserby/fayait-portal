import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'https://api.fayait.com'

const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.06)', muted: '#888',
  orange: '#f97316', green: '#1D9E75', red: '#e74c3c',
  yellow: '#d97706', font: "'DM Sans','Helvetica Neue',sans-serif",
}

function statusColor(s) {
  if (s === 1) return T.green
  if (s === 0) return T.red
  return T.muted
}
function statusLabel(s) {
  if (s === 1) return 'Up'
  if (s === 0) return 'Down'
  return 'Unknown'
}
function statusBg(s) {
  if (s === 1) return '#EAF5F0'
  if (s === 0) return '#FDECEC'
  return '#F4F4F4'
}

function uptimePct(v) {
  if (v == null) return '—'
  return (v * 100).toFixed(1) + '%'
}

export default function Status() {
  const [monitors, setMonitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch(`${API}/api/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setMonitors(d.monitors || [])
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const active = monitors.filter(m => m.active)
  const allUp = active.length > 0 && active.every(m => m.status === 1)
  const downCount = active.filter(m => m.status === 0).length

  return (
    <div style={{ fontFamily: T.font, padding: '0 0 32px' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: T.navy, margin: 0 }}>Service Status</h1>
          <p style={{ color: T.muted, fontSize: 13, margin: '4px 0 0' }}>Real-time health of your infrastructure</p>
        </div>
        {active.length > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: allUp ? '#EAF5F0' : downCount ? '#FDECEC' : '#FFF8EC',
            color: allUp ? '#1D7A58' : downCount ? '#A32D2D' : '#92610A',
            padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: allUp ? T.green : downCount ? T.red : T.yellow }} />
            {allUp ? 'All systems operational' : downCount ? `${downCount} service${downCount > 1 ? 's' : ''} degraded` : 'Checking...'}
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>Loading monitors…</div>
      )}

      {!loading && error && (
        <div style={{ background: '#FDECEC', border: '1px solid #f5c6cb', borderRadius: 8, padding: '12px 16px', color: T.red, fontSize: 13 }}>
          Could not reach Uptime Kuma: {error}
        </div>
      )}

      {!loading && monitors.length === 0 && !error && (
        <div style={{ background: T.card, border: `0.5px solid rgba(0,0,0,0.08)`, borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
          <div style={{ fontWeight: 600, color: T.navy, fontSize: 15, marginBottom: 6 }}>No monitors configured</div>
          <div style={{ color: T.muted, fontSize: 13 }}>
            Add monitors in Uptime Kuma to see status here.
          </div>
        </div>
      )}

      {!loading && monitors.length > 0 && (
        <div style={{ background: T.card, border: `0.5px solid rgba(0,0,0,0.08)`, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: `1px solid rgba(0,0,0,0.06)` }}>
                {['Monitor', 'Status', 'Ping', 'Uptime 24h', 'Uptime 7d'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: T.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monitors.map((m, i) => (
                <tr key={m.id}
                  style={{ borderBottom: i < monitors.length - 1 ? `1px solid rgba(0,0,0,0.04)` : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, color: T.navy }}>{m.name}</div>
                    {m.url && <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>{m.url}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: statusBg(m.status), color: statusColor(m.status),
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(m.status) }} />
                      {statusLabel(m.status)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: m.ping ? T.navy : T.muted }}>{m.ping ? `${m.ping}ms` : '—'}</td>
                  <td style={{ padding: '12px 16px', color: T.navy }}>{uptimePct(m.uptime24h)}</td>
                  <td style={{ padding: '12px 16px', color: T.navy }}>{uptimePct(m.uptime7d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
