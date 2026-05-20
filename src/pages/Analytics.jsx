import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'https://api.fayait.com'

const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.06)', muted: '#888',
  orange: '#f97316', font: "'DM Sans','Helvetica Neue',sans-serif",
}

export default function Analytics() {
  const [dashboards, setDashboards] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const token = localStorage.getItem('token')

  useEffect(() => {
    fetch(`${API}/api/analytics/dashboards`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(dashes => {
        const list = Array.isArray(dashes) ? dashes : []
        setDashboards(list)
        if (list.length > 0) setSelected(list[0])
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  function buildIframeUrl(dash) {
    if (!dash) return null
    // Anonymous viewer access enabled — URL works directly
    return dash.url
  }

  const groups = dashboards.reduce((acc, d) => {
    const g = d.folderTitle || 'General'
    if (!acc[g]) acc[g] = []
    acc[g].push(d)
    return acc
  }, {})

  return (
    <div style={{ fontFamily: T.font, height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: T.navy, margin: 0 }}>Analytics</h1>
        <p style={{ color: T.muted, fontSize: 13, margin: '4px 0 0' }}>Infrastructure dashboards powered by Grafana</p>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>Loading dashboards…</div>}
      {!loading && error && <div style={{ color: '#e74c3c', fontSize: 13 }}>Failed to load: {error}</div>}

      {!loading && !error && dashboards.length === 0 && (
        <div style={{ background: T.card, border: `0.5px solid rgba(0,0,0,0.08)`, borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 600, color: T.navy, fontSize: 15, marginBottom: 6 }}>No dashboards yet</div>
          <div style={{ color: T.muted, fontSize: 13 }}>Create dashboards in Grafana and they will appear here.</div>
        </div>
      )}

      {!loading && dashboards.length > 0 && (
        <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
          <div style={{ width: 220, flexShrink: 0, background: T.card, border: `0.5px solid rgba(0,0,0,0.08)`, borderRadius: 10, overflow: 'auto', padding: '8px 0' }}>
            {Object.entries(groups).map(([folder, items]) => (
              <div key={folder}>
                <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{folder}</div>
                {items.map(d => (
                  <button key={d.uid}
                    onClick={() => setSelected(d)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px',
                      background: selected?.uid === d.uid ? '#FFF4EC' : 'transparent',
                      color: selected?.uid === d.uid ? T.orange : T.navy,
                      border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: selected?.uid === d.uid ? 500 : 400,
                      borderLeft: selected?.uid === d.uid ? `3px solid ${T.orange}` : '3px solid transparent',
                    }}>
                    {d.title}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Dashboard frame */}
          <div style={{ flex: 1, background: T.card, border: `0.5px solid rgba(0,0,0,0.08)`, borderRadius: 10, overflow: 'hidden' }}>
            {selected ? (
              <iframe
                key={selected.uid}
                src={buildIframeUrl(selected)}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title={selected.title}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.muted, fontSize: 13 }}>
                Select a dashboard
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
