import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import CompanyDetail from './CompanyDetail'

const T = {
  blue: '#2563eb', text: '#1a2332', muted: '#6b7280',
  border: '#e5e7eb', bg: '#f0f2f5', font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const SVC_KEYS = ['tickets','assets','projects','chat','grafana','files','status']
const SVC_COLOR = {
  tickets: '#2563eb', assets: '#7c3aed', projects: '#059669',
  chat: '#ea580c', grafana: '#0891b2', files: '#ca8a04', status: '#16a34a',
}

function ServicePip({ svcKey, active }) {
  const color = SVC_COLOR[svcKey] || '#888'
  return (
    <span title={svcKey} style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: active ? color : '#e2e8f0',
      flexShrink: 0,
    }} />
  )
}

export default function Admin() {
  const { user } = useAuth()
  const [companies, setCompanies]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState(null)

  useEffect(() => {
    api.getAdminCompanies()
      .then(data => setCompanies(Array.isArray(data) ? data : (data.companies || [])))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleServiceChange = useCallback((companyId, service, status) => {
    setCompanies(prev => prev.map(c =>
      c.id === companyId ? { ...c, services: { ...c.services, [service]: status } } : c
    ))
    setSelected(prev => prev?.id === companyId
      ? { ...prev, services: { ...prev.services, [service]: status } }
      : prev
    )
  }, [])

  if (user?.role !== 'superadmin') return <Navigate to="/" />

  const filtered = companies.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.subdomain?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: T.font }}>
      {/* Left: company list */}
      <div style={{
        width: selected ? 340 : '100%', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderRight: selected ? `1px solid ${T.border}` : 'none',
        background: '#fff', overflow: 'hidden',
        transition: 'width 0.15s ease',
      }}>
        <div style={{ padding: '20px 20px 14px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>Companies</h1>
            <span style={{ fontSize: 11, color: T.muted, background: '#f1f5f9', padding: '2px 8px', borderRadius: 20 }}>
              {companies.length}
            </span>
          </div>
          <input
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '7px 11px', borderRadius: 7,
              border: `1px solid ${T.border}`, fontSize: 13,
              fontFamily: T.font, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>No companies found.</div>
          )}
          {filtered.map(company => {
            const isSel     = selected?.id === company.id
            const services  = company.services || {}
            return (
              <button
                key={company.id}
                onClick={() => setSelected(isSel ? null : company)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '13px 20px', border: 'none',
                  borderBottom: `1px solid ${T.border}`,
                  borderLeft: isSel ? `3px solid ${T.blue}` : '3px solid transparent',
                  background: isSel ? '#eff6ff' : 'transparent',
                  cursor: 'pointer', fontFamily: T.font,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isSel ? T.blue : T.text }}>{company.name}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{company.subdomain}</div>
                  </div>
                  <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>{company.user_count ?? 0}u</span>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {SVC_KEYS.map(k => (
                    <ServicePip key={k} svcKey={k} active={services[k] === 'active'} />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: detail */}
      {selected && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: T.bg }}>
          <CompanyDetail
            company={selected}
            onClose={() => setSelected(null)}
            onServiceChange={handleServiceChange}
          />
        </div>
      )}

      {!selected && !loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13 }}>
          Select a company to manage services
        </div>
      )}
    </div>
  )
}
