import { useState, useEffect } from 'react'
import { T, hrApi, fmtDate, Avatar, Spinner, EmptyState, EmpStatusBadge, ContractBadge, Btn } from './shared'

const TABS = ['Profile', 'Documents', 'Goals', 'Reviews']

export default function MyProfile({ user }) {
  const [profile, setProfile] = useState(null)
  const [docs, setDocs]       = useState([])
  const [tab, setTab]         = useState('Profile')
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState(null)

  useEffect(() => {
    hrApi.getMe()
      .then(setProfile)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab !== 'Documents' || !profile) return
    hrApi.getDocs(profile.id).then(setDocs).catch(() => {})
  }, [tab, profile])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
      <Spinner size={28} />
    </div>
  )
  if (err || !profile) return (
    <EmptyState icon="⚠️" title="Profile not found"
      sub={err || 'Your HR profile has not been set up yet.'} />
  )

  const tabStyle = (t) => ({
    padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 400,
    color: tab === t ? T.navy : T.muted, borderBottom: tab === t ? `2px solid ${T.orange}` : '2px solid transparent',
    background: 'none', border: 'none', fontFamily: T.font, transition: 'color 0.1s',
  })

  return (
    <div style={{ padding: 24 }}>
      {/* Header card */}
      <div style={{
        background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`,
        overflow: 'hidden', marginBottom: 20,
      }}>
        <div style={{ height: 72, background: `linear-gradient(135deg, ${T.navy}, #2d3748)` }} />
        <div style={{ padding: '0 24px 20px', marginTop: -36 }}>
          <Avatar name={profile.name} url={profile.avatar_url} size={72} />
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>{profile.name}</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
              {profile.job_title || profile.job_function_name || 'No title set'}
              {profile.department_name && ` · ${profile.department_name}`}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <EmpStatusBadge status={profile.employment_status || 'active'} />
              <ContractBadge type={profile.contract_type} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderTop: `1px solid ${T.border}`, display: 'flex', paddingLeft: 8 }}>
          {TABS.map(t => (
            <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'Profile' && (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Phone" value={profile.phone} />
            <InfoRow label="Employee Number" value={profile.employee_number} />
            <InfoRow label="Job Function" value={profile.job_function_name} />
            <InfoRow label="Department" value={profile.department_name || profile.department} />
            <InfoRow label="Manager" value={profile.manager_name} />
            <InfoRow label="Start Date" value={fmtDate(profile.start_date)} />
            <InfoRow label="Contract Type" value={(profile.contract_type || '').replace('_', ' ')} />
            {profile.rate_type && (
              <InfoRow label="Rate" value={
                profile.rate_type === 'salary'
                  ? `$${parseFloat(profile.rate_amount || 0).toFixed(2)} / year`
                  : `$${parseFloat(profile.rate_amount || 0).toFixed(2)} / hour`
              } />
            )}
          </div>
        </div>
      )}

      {tab === 'Documents' && (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, padding: 24 }}>
          {docs.length === 0
            ? <EmptyState icon="📄" title="No documents" sub="No documents have been attached to your profile." />
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {['File Name', 'Type', 'Uploaded', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map(doc => (
                    <tr key={doc.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: '10px 12px', fontSize: 13 }}>📄 {doc.file_name}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: T.muted }}>{doc.document_type}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: T.muted }}>{fmtDate(doc.created_at)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <a href={hrApi.docDownloadUrl(profile.id, doc.id)} target="_blank" rel="noreferrer">
                          <Btn variant="ghost" style={{ fontSize: 11, padding: '4px 10px' }}>Download</Btn>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}

      {tab === 'Goals' && (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, padding: 24 }}>
          <EmptyState icon="🎯" title="Goals" sub="Goals management coming soon." />
        </div>
      )}

      {tab === 'Reviews' && (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, padding: 24 }}>
          <EmptyState icon="⭐" title="Reviews" sub="Performance reviews coming soon." />
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? T.navy : T.muted, fontWeight: value ? 500 : 400 }}>{value || '—'}</div>
    </div>
  )
}
