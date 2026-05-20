import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'https://api.fayait.com'

const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.06)', muted: '#888',
  orange: '#f97316', font: "'DM Sans','Helvetica Neue',sans-serif",
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function BI() {
  const [dashboards, setDashboards] = useState([])
  const [selected, setSelected] = useState(null)
  const [embedUrl, setEmbedUrl] = useState(null)
  const [loadingEmbed, setLoadingEmbed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const token = localStorage.getItem('token')

  useEffect(() => {
    fetch(`${API}/api/bi/dashboards`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : []
        setDashboards(list)
        if (list.length > 0) loadEmbed(list[0])
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  function loadEmbed(dash) {
    setSelected(dash)
    setEmbedUrl(null)
    setLoadingEmbed(true)
    fetch(`${API}/api/bi/embed/${dash.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setEmbedUrl(d.url); setLoadingEmbed(false) })
      .catch(() => setLoadingEmbed(false))
  }

  return (
    <div style={{ fontFamily: T.font, height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: T.navy, margin: 0 }}>Business Intelligence</h1>
        <p style={{ color: T.muted, fontSize: 13, margin: '4px 0 0' }}>Data dashboards powered by Metabase</p>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>Loading dashboards…</div>}
      {!loading && error && <div style={{ color: '#e74c3c', fontSize: 13 }}>Failed to load: {error}</div>}

      {!loading && !error && dashboards.length === 0 && (
        <div style={{ background: T.card, border: `0.5px solid rgba(0,0,0,0.08)`, borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📈</div>
          <div style={{ fontWeight: 600, color: T.navy, fontSize: 15, marginBottom: 6 }}>No dashboards yet</div>
          <div style={{ color: T.muted, fontSize: 13 }}>Create dashboards in Metabase and they will appear here.</div>
        </div>
      )}

      {!loading && dashboards.length > 0 && (
        <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
          <div style={{ width: 220, flexShrink: 0, background: T.card, border: `0.5px solid rgba(0,0,0,0.08)`, borderRadius: 10, overflow: 'auto', padding: '8px 0' }}>
            <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dashboards</div>
            {dashboards.map(d => (
              <button key={d.id}
                onClick={() => loadEmbed(d)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px',
                  background: selected?.id === d.id ? '#FFF4EC' : 'transparent',
                  color: selected?.id === d.id ? T.orange : T.navy,
                  border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: selected?.id === d.id ? 500 : 400,
                  borderLeft: selected?.id === d.id ? `3px solid ${T.orange}` : '3px solid transparent',
                }}>
                <div>{d.name}</div>
                {d.updated_at && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{fmtDate(d.updated_at)}</div>}
              </button>
            ))}
          </div>

          {/* Dashboard frame */}
          <div style={{ flex: 1, background: T.card, border: `0.5px solid rgba(0,0,0,0.08)`, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
            {loadingEmbed && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.card, color: T.muted, fontSize: 13 }}>
                Loading dashboard…
              </div>
            )}
            {!loadingEmbed && embedUrl && (
              <iframe
                key={selected?.id}
                src={embedUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title={selected?.name}
                allowFullScreen
              />
            )}
            {!loadingEmbed && !embedUrl && (
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
