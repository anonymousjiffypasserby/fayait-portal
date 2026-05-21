import { useState, useEffect } from 'react'
import { T, hrApi, fmtDate, fmtMoney, Avatar, Spinner, EmptyState, EmpStatusBadge, ContractBadge, GoalStatusBadge, Btn } from './shared'

const TABS = ['Profile', 'Documents', 'Goals', 'Reviews']

const ProgressBar = ({ value }) => (
  <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
    <div style={{
      height: '100%', borderRadius: 3,
      width: `${value || 0}%`,
      background: value >= 100 ? T.green : T.orange,
      transition: 'width 0.3s',
    }} />
  </div>
)

const Stars = ({ rating }) => (
  <span style={{ color: T.yellow, fontSize: 14, letterSpacing: 1 }}>
    {Array.from({ length: 5 }, (_, i) => i < rating ? '★' : '☆').join('')}
  </span>
)

export default function MyProfile({ user }) {
  const [profile, setProfile] = useState(null)
  const [docs, setDocs]       = useState([])
  const [goals, setGoals]     = useState([])
  const [reviews, setReviews] = useState([])
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
    if (!profile) return
    if (tab === 'Documents') hrApi.getDocs(profile.id).then(setDocs).catch(() => {})
    if (tab === 'Goals')     hrApi.getGoals(`?employee_id=${profile.id}`).then(d => setGoals(Array.isArray(d) ? d : (d?.rows || []))).catch(() => {})
    if (tab === 'Reviews')   hrApi.getReviews(`?employee_id=${profile.id}`).then(d => setReviews(Array.isArray(d) ? d : (d?.rows || []))).catch(() => {})
  }, [tab, profile])

  const handleDocDownload = async (doc) => {
    try {
      const blob = await hrApi.downloadDoc(profile.id, doc.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = doc.name || doc.file_name || 'document'
      document.body.appendChild(a); a.click()
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 100)
    } catch {}
  }

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

  const today = new Date().toISOString().slice(0, 10)

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
                `${fmtMoney(profile.rate_amount)} / ${profile.rate_type === 'salary' ? 'year' : 'hour'}`
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
                      <td style={{ padding: '10px 12px', fontSize: 13 }}>📄 {doc.name || doc.file_name}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: T.muted }}>{doc.document_type || doc.type}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: T.muted }}>{fmtDate(doc.created_at)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <Btn variant="ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleDocDownload(doc)}>
                          Download
                        </Btn>
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
          {goals.length === 0
            ? <EmptyState icon="🎯" title="No goals" sub="No goals have been set yet." />
            : goals.map(g => {
              const overdue = g.due_date && g.due_date.slice(0, 10) < today && g.status === 'active'
              return (
                <div key={g.id} style={{ padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.navy, flex: 1 }}>{g.title}</div>
                    <GoalStatusBadge status={g.status} />
                  </div>
                  <ProgressBar value={g.progress} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: T.muted }}>{g.progress ?? 0}% complete</span>
                    {g.due_date && (
                      <span style={{ fontSize: 11, color: overdue ? T.red : T.muted, fontWeight: overdue ? 600 : 400 }}>
                        {overdue ? 'Overdue · ' : 'Due '}{fmtDate(g.due_date)}
                      </span>
                    )}
                  </div>
                  {g.description && (
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{g.description}</div>
                  )}
                </div>
              )
            })
          }
        </div>
      )}

      {tab === 'Reviews' && (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, padding: 24 }}>
          {reviews.length === 0
            ? <EmptyState icon="📋" title="No reviews" sub="No performance reviews yet." />
            : reviews.map(r => (
              <div key={r.id} style={{ padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>{r.period}</div>
                  <Stars rating={r.rating} />
                </div>
                {r.strengths && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.green, marginBottom: 2 }}>Strengths</div>
                    <div style={{ fontSize: 12, color: '#374151' }}>{r.strengths}</div>
                  </div>
                )}
                {r.improvements && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.orange, marginBottom: 2 }}>Areas for Improvement</div>
                    <div style={{ fontSize: 12, color: '#374151' }}>{r.improvements}</div>
                  </div>
                )}
                {r.notes && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 2 }}>Notes</div>
                    <div style={{ fontSize: 12, color: '#374151' }}>{r.notes}</div>
                  </div>
                )}
                <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
                  {fmtDate(r.created_at)}{r.reviewer_name ? ` · by ${r.reviewer_name}` : ''}
                </div>
              </div>
            ))
          }
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
