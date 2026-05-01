import { useState, useEffect } from 'react'
import api from '../../services/api'

const FILES_URL = import.meta.env.VITE_FILES_URL || 'https://files.fayait.com'

const SERVICE_META = {
  tickets:  { label: 'Tickets',   icon: '🎫', desc: 'Helpdesk & support ticketing' },
  assets:   { label: 'Assets',    icon: '💻', desc: 'Hardware & software inventory' },
  projects: { label: 'Projects',  icon: '📋', desc: 'Project & task management' },
  chat:     { label: 'Chat',      icon: '💬', desc: 'Team messaging via Matrix' },
  grafana:  { label: 'Analytics', icon: '📊', desc: 'Monitoring dashboards' },
  files:    { label: 'Files',     icon: '📁', desc: 'Cloud file storage (Nextcloud)' },
  status:   { label: 'Status',    icon: '🟢', desc: 'Public status page' },
  hr:       { label: 'HR',        icon: '👥', desc: 'Employee management & payroll' },
}

export default function ServicesTab() {
  const [config, setConfig] = useState(null)
  const [error, setError]   = useState(null)

  useEffect(() => {
    api.getCompanyConfig()
      .then(setConfig)
      .catch(err => setError(err.message))
  }, [])

  if (error) return (
    <div style={{ padding: 32, color: '#ef4444', fontSize: 13 }}>{error}</div>
  )
  if (!config) return (
    <div style={{ padding: 32, color: '#6b7280', fontSize: 13 }}>Loading…</div>
  )

  const { services, company } = config

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2332', marginBottom: 4 }}>
          Services
        </div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          Services are managed by Faya IT. Contact support to enable or change your subscription.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {Object.entries(SERVICE_META).map(([key, meta]) => {
          const svc      = services[key]
          const isActive = svc?.status === 'active'

          return (
            <div key={key} style={{
              background: '#fff', borderRadius: 10, padding: 16,
              border: `1px solid ${isActive ? '#2563eb30' : '#e5e7eb'}`,
              boxShadow: isActive ? '0 0 0 1px #2563eb18' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{meta.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                  background: isActive ? '#dcfce7' : '#f1f5f9',
                  color: isActive ? '#16a34a' : '#94a3b8',
                }}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2332', marginBottom: 3 }}>{meta.label}</div>
              <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{meta.desc}</div>

              {key === 'files' && isActive && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                  {svc.provisioned_users != null && (
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                      {svc.provisioned_users} user{svc.provisioned_users !== 1 ? 's' : ''} provisioned
                    </div>
                  )}
                  <a
                    href={company.nextcloud_url || FILES_URL}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 11, color: '#2563eb', textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    Open Files ↗
                  </a>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
