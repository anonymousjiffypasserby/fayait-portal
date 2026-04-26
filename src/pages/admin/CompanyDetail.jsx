import { useState } from 'react'
import api from '../../services/api'

const T = {
  blue: '#2563eb', red: '#ef4444', text: '#1a2332', muted: '#6b7280',
  border: '#e5e7eb', font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const ALL_SERVICES = [
  { key: 'tickets',  label: 'Tickets',   desc: 'Helpdesk & support ticketing',  icon: '🎫' },
  { key: 'assets',   label: 'Assets',    desc: 'Hardware & software inventory', icon: '💻' },
  { key: 'projects', label: 'Projects',  desc: 'Project & task management',     icon: '📋' },
  { key: 'chat',     label: 'Chat',      desc: 'Team messaging via Matrix',     icon: '💬' },
  { key: 'grafana',  label: 'Analytics', desc: 'Monitoring dashboards',         icon: '📊' },
  { key: 'files',    label: 'Files',     desc: 'Cloud file storage',            icon: '📁' },
  { key: 'status',   label: 'Status',    desc: 'Public status page',            icon: '🟢' },
]

const ZAMMAD_ADMIN = import.meta.env.VITE_ZAMMAD_URL || 'https://zammad.fayait.com'

function TicketsTab({ company, services, onToggle, toggling }) {
  const isActive  = services.tickets === 'active'
  const isToggling = toggling === 'tickets'

  const rows = [
    ['Service Status', isActive ? 'Active' : 'Inactive'],
    ['Zammad URL',     ZAMMAD_ADMIN],
    ['Provisioned',    company.zammad_org_id ? `Org #${company.zammad_org_id}` : 'Not linked'],
    ['Users with SSO', company.zammad_user_count != null ? company.zammad_user_count : '—'],
  ]

  return (
    <div style={{ maxWidth: 520 }}>
      {/* Status card */}
      <div style={{
        background: isActive ? '#f0fdf4' : '#f9fafb',
        border: `1px solid ${isActive ? '#86efac' : T.border}`,
        borderRadius: 10, padding: 18, marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 3 }}>
            🎫 Tickets (Zammad)
          </div>
          <div style={{ fontSize: 12, color: T.muted }}>
            {isActive ? 'Service is active. Users can log in and create tickets.' : 'Service is inactive. Users cannot access ticketing.'}
          </div>
        </div>
        <button
          onClick={() => onToggle('tickets')}
          disabled={!!isToggling}
          style={{
            padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
            fontFamily: T.font, cursor: isToggling ? 'wait' : 'pointer', flexShrink: 0,
            border: isActive ? '1px solid #fca5a5' : `1px solid ${T.blue}`,
            background: isActive ? '#fff' : T.blue,
            color: isActive ? T.red : '#fff',
          }}
        >
          {isToggling ? '…' : isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>

      {/* Config rows */}
      <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${T.border}`, fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Integration Config
        </div>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 12, color: T.muted }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Zammad admin link */}
      <a
        href={`${ZAMMAD_ADMIN}/#admin`}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: '#eff6ff', color: T.blue, textDecoration: 'none',
          border: `1px solid #bfdbfe`,
        }}
      >
        Open Zammad Admin ↗
      </a>

      <p style={{ fontSize: 11, color: T.muted, marginTop: 16, fontFamily: T.font }}>
        Ticket content is client data — visible only to the company's users in their portal. Superadmin access to individual tickets is not available here.
      </p>
    </div>
  )
}

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function CompanyDetail({ company, onClose, onServiceChange }) {
  const [tab, setTab]         = useState('services')
  const [toggling, setToggling] = useState(null)
  const [error, setError]     = useState(null)

  const services   = company.services || {}
  const activeCount = ALL_SERVICES.filter(s => services[s.key] === 'active').length

  const handleToggle = async (serviceKey) => {
    const current   = services[serviceKey]
    const newStatus = current === 'active' ? 'inactive' : 'active'
    setToggling(serviceKey)
    setError(null)
    onServiceChange(company.id, serviceKey, newStatus)
    try {
      await api.setCompanyService(company.id, serviceKey, newStatus)
    } catch (e) {
      onServiceChange(company.id, serviceKey, current)
      setError(e.message)
    } finally {
      setToggling(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: T.font }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0', background: '#fff', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {company.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{company.name}</div>
              <div style={{ fontSize: 12, color: T.muted }}>{company.subdomain}.fayait.com</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: `1px solid ${T.border}`, borderRadius: 6,
            padding: '4px 10px', fontSize: 12, color: T.muted, cursor: 'pointer', fontFamily: T.font,
          }}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: 20, paddingBottom: 10, fontSize: 12, color: T.muted }}>
          <span><strong style={{ color: T.text }}>{company.user_count ?? 0}</strong> users</span>
          <span><strong style={{ color: T.text }}>{activeCount}</strong> active services</span>
          {company.created_at && <span>Since <strong style={{ color: T.text }}>{fmtDate(company.created_at)}</strong></span>}
        </div>

        <div style={{ display: 'flex' }}>
          {['services', 'tickets', 'overview'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 16px', border: 'none',
              borderBottom: tab === t ? `2px solid ${T.blue}` : '2px solid transparent',
              background: 'transparent', color: tab === t ? T.blue : T.muted,
              fontSize: 13, fontWeight: tab === t ? 600 : 400, cursor: 'pointer',
              fontFamily: T.font, textTransform: 'capitalize',
            }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {error && (
          <div style={{
            padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, color: T.red, fontSize: 13, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {tab === 'services' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
            {ALL_SERVICES.map(svc => {
              const isActive    = services[svc.key] === 'active'
              const isToggling  = toggling === svc.key
              return (
                <div key={svc.key} style={{
                  background: '#fff', borderRadius: 10, padding: 16,
                  border: `1px solid ${isActive ? T.blue + '50' : T.border}`,
                  boxShadow: isActive ? `0 0 0 1px ${T.blue}18` : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ fontSize: 22 }}>{svc.icon}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                      background: isActive ? '#dcfce7' : '#f1f5f9',
                      color: isActive ? '#16a34a' : '#94a3b8',
                    }}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 3 }}>{svc.label}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>{svc.desc}</div>
                  <button
                    onClick={() => handleToggle(svc.key)}
                    disabled={!!isToggling}
                    style={{
                      width: '100%', padding: '6px 0', borderRadius: 6,
                      fontSize: 12, fontWeight: 500, cursor: isToggling ? 'wait' : 'pointer',
                      fontFamily: T.font,
                      border: isActive ? '1px solid #fca5a5' : `1px solid ${T.blue}`,
                      background: isActive ? '#fff' : T.blue,
                      color: isActive ? T.red : '#fff',
                    }}
                  >
                    {isToggling ? '…' : isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'tickets' && (
          <TicketsTab company={company} services={services} onToggle={handleToggle} toggling={toggling} />
        )}

        {tab === 'overview' && (
          <div style={{ maxWidth: 460 }}>
            <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Company Info
              </div>
              {[
                ['Name',      company.name],
                ['Subdomain', `${company.subdomain}.fayait.com`],
                ['Users',     company.user_count ?? 0],
                ['Plan',      company.plan || 'Standard'],
                ['Created',   fmtDate(company.created_at)],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 16px', borderBottom: `1px solid ${T.border}`,
                }}>
                  <span style={{ fontSize: 12, color: T.muted }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
