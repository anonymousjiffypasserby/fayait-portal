import { useState, useEffect } from 'react'
import api from '../../../services/api'
import { T, btn } from '../shared'

function initials(name = '') {
  return name.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

function Avatar({ name, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: T.orange, color: '#fff', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 700,
    }}>
      {initials(name)}
    </div>
  )
}

function NodeCard({ user, onClick, highlight }) {
  return (
    <div
      onClick={() => onClick(user)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: highlight ? '#fff7f4' : '#fff',
        border: `1px solid ${highlight ? T.orange : T.border}`,
        borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        minWidth: 160, maxWidth: 220,
      }}
    >
      <Avatar name={user.name} size={32} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
        {user.job_title && <div style={{ fontSize: 10, color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.job_title}</div>}
      </div>
    </div>
  )
}

function TreeChildren({ items, onClick, selectedId }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ marginLeft: 24, paddingLeft: 16, borderLeft: `2px solid #e5e7eb`, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map(child => (
        <div key={child.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
          <div style={{ width: 16, height: 20, borderBottom: '2px solid #e5e7eb', flexShrink: 0, marginTop: 0 }} />
          <NodeCard user={child} onClick={onClick} highlight={selectedId === child.id} />
        </div>
      ))}
    </div>
  )
}

function DetailPanel({ user, onClose }) {
  const roleColors = { admin: '#EEF2FF', superadmin: '#EEF2FF', dept_head: '#FEF3C7', staff: '#F0FDF4' }
  const roleTextColors = { admin: '#4338CA', superadmin: '#4338CA', dept_head: '#92400E', staff: '#3B6D11' }
  const roleLabels = { admin: 'Admin', superadmin: 'Super Admin', dept_head: 'Dept Head', staff: 'User' }

  return (
    <div style={{
      width: 280, flexShrink: 0,
      background: '#fff', borderLeft: `1px solid ${T.border}`,
      padding: 20, overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>Profile</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
        <Avatar name={user.name} size={52} />
        <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, marginTop: 8, textAlign: 'center' }}>{user.name}</div>
        {user.job_title && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{user.job_title}</div>}
        <span style={{ marginTop: 6, fontSize: 10, padding: '2px 8px', borderRadius: 4, background: roleColors[user.role] || '#f3f4f6', color: roleTextColors[user.role] || '#374151', fontWeight: 500 }}>
          {roleLabels[user.role] || user.role}
        </span>
      </div>
      {[
        ['Email', user.email],
        ['Department', user.department],
        ['Manager', user.manager_name],
        ['Contract', user.contract_type],
        ['Employee #', user.employee_number],
        ['Phone', user.phone],
      ].filter(([, v]) => v).map(([label, value]) => (
        <div key={label} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
          <div style={{ fontSize: 12, color: T.navy, marginTop: 2 }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

export default function OrgChart({ me, companyConfig, onConfigUpdate }) {
  const [users, setUsers] = useState([])
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [toggling, setToggling] = useState(false)

  const isAdmin = ['admin', 'superadmin'].includes(me?.role)
  const orgPublic = companyConfig?.company?.org_chart_public || false

  useEffect(() => {
    if (!isAdmin && !orgPublic) { setLoading(false); return }
    Promise.all([api.getUsers(), api.getDepartments()])
      .then(([u, d]) => { setUsers(u); setDepts(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isAdmin, orgPublic])

  const handleTogglePublic = async () => {
    setToggling(true)
    try {
      await api.updateCompanySettings({ org_chart_public: !orgPublic })
      onConfigUpdate()
    } catch {}
    finally { setToggling(false) }
  }

  if (!isAdmin && !orgPublic) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 14 }}>
        The org chart is not currently visible to employees.
      </div>
    )
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
  }

  const companyName = companyConfig?.company?.name || 'Company'

  const tree = depts.map(dept => {
    const members = users.filter(u => u.department === dept.name && u.active !== false)
    const head = dept.head_id ? users.find(u => u.id === dept.head_id) : null
    const nonHeadMembers = head ? members.filter(u => u.id !== head.id) : members
    return { dept, head, members: nonHeadMembers }
  })

  const unassigned = users.filter(u => !u.department && u.active !== false)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: T.navy }}>Org Chart</h2>
          {isAdmin && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: T.muted }}>
              <div
                onClick={!toggling ? handleTogglePublic : undefined}
                style={{
                  width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer',
                  background: orgPublic ? T.orange : '#d1d5db',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: orgPublic ? 18 : 2,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </div>
              Visible to all employees
            </label>
          )}
        </div>

        {/* Root */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: T.navy, color: '#fff',
              borderRadius: 8, padding: '8px 16px',
              fontSize: 14, fontWeight: 600,
            }}>
              🏢 {companyName}
            </div>
          </div>

          {/* Department branches */}
          <div style={{ marginLeft: 16, paddingLeft: 16, borderLeft: '2px solid #e5e7eb', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tree.map(({ dept, head, members }) => (
              <div key={dept.id}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                  <div style={{ width: 16, height: 20, borderBottom: '2px solid #e5e7eb', flexShrink: 0 }} />
                  <div>
                    {/* Dept label */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: '#f3f4f6', borderRadius: 6, padding: '5px 12px',
                      fontSize: 12, fontWeight: 600, color: '#374151',
                      border: `1px solid ${T.border}`,
                    }}>
                      📁 {dept.name}
                    </div>

                    {/* Head + members */}
                    <div style={{ marginLeft: 16, paddingLeft: 16, borderLeft: '2px solid #e5e7eb', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {head && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                            <div style={{ width: 16, height: 20, borderBottom: '2px solid #e5e7eb', flexShrink: 0 }} />
                            <NodeCard user={head} onClick={setSelected} highlight={selected?.id === head.id} />
                          </div>
                          <TreeChildren items={members} onClick={setSelected} selectedId={selected?.id} />
                        </div>
                      )}
                      {!head && <TreeChildren items={members} onClick={setSelected} selectedId={selected?.id} />}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {unassigned.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                  <div style={{ width: 16, height: 20, borderBottom: '2px solid #e5e7eb', flexShrink: 0 }} />
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f3f4f6', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#374151', border: `1px solid ${T.border}` }}>
                      📁 Unassigned
                    </div>
                    <TreeChildren items={unassigned} onClick={setSelected} selectedId={selected?.id} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <DetailPanel user={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
