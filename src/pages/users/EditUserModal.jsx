import { useState, useEffect } from 'react'
import api, { rolesApi } from '../../services/api'
import { hrApi } from '../hr/shared'
import ProvisioningBadge from './ProvisioningBadge'
import { T, SERVICE_LABELS, SERVICE_ACCESS_LEVELS, PROVISION_SERVICE_MAP, CONTRACT_TYPES, btn } from './shared'

const label = { fontSize: 12, color: T.muted, display: 'block', marginBottom: 5, fontWeight: 500 }
const input = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #e5e7eb', fontSize: 13, fontFamily: T.font,
  boxSizing: 'border-box',
}

export default function EditUserModal({ user, activeServices, onClose, onSaved }) {
  const [departments, setDepartments] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [jobFunctions, setJobFunctions] = useState([])
  const [customRoles, setCustomRoles] = useState([])

  const initRoleSelectVal = user.role_id ? `custom:${user.role_id}` : (user.role || 'staff')

  const [form, setForm] = useState({
    name:            user.name || '',
    role:            user.role || 'staff',
    role_id:         user.role_id || null,
    roleSelectVal:   initRoleSelectVal,
    department:      user.department || '',
    job_title:       user.job_title || '',
    manager_id:      user.manager_id || '',
    employee_number: user.employee_number || '',
    phone:           user.phone || '',
    contract_type:   user.contract_type || '',
    start_date:      user.start_date ? user.start_date.slice(0, 10) : '',
    end_date:        user.end_date ? user.end_date.slice(0, 10) : '',
    job_function_id: user.job_function_id || '',
    access: Object.fromEntries(
      [...activeServices].map(s => [
        s,
        user.access?.find(a => a.service === s)?.level || (SERVICE_ACCESS_LEVELS[s]?.[0] || 'none')
      ])
    ),
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [retrying, setRetrying] = useState({})
  const [provStatus, setProvStatus] = useState(user.provisioning_status || {})
  const [retryPw, setRetryPw] = useState('')
  const [showRetryPw, setShowRetryPw] = useState(false)

  useEffect(() => {
    Promise.all([
      api.getDepartments(),
      api.getUsers(),
      hrApi.getJobFunctions(),
      rolesApi.getRoles(),
    ]).then(([d, u, jf, r]) => {
      setDepartments(d)
      setAllUsers(u.filter(u => u.id !== user.id))
      setJobFunctions(Array.isArray(jf) ? jf : [])
      setCustomRoles(Array.isArray(r) ? r : [])
    }).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setAccess = (svc, level) => setForm(f => ({ ...f, access: { ...f.access, [svc]: level } }))

  const handleRoleChange = (val) => {
    if (val.startsWith('custom:')) {
      setForm(f => ({ ...f, roleSelectVal: val, role: 'staff', role_id: val.slice(7) }))
    } else {
      setForm(f => ({ ...f, roleSelectVal: val, role: val, role_id: null }))
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    try {
      const access = Object.entries(form.access).map(([service, level]) => ({ service, level }))
      await api.updateUser(user.id, {
        name:            form.name,
        role:            form.role,
        department:      form.department || null,
        job_title:       form.job_title || null,
        manager_id:      form.manager_id || null,
        employee_number: form.employee_number || null,
        phone:           form.phone || null,
        contract_type:   form.contract_type || null,
        start_date:      form.start_date || null,
        end_date:        form.end_date || null,
        job_function_id: form.job_function_id || null,
        access,
      })

      const originalRoleId = user.role_id || null
      const newRoleId = form.role_id || null
      const roleIdChanged = originalRoleId !== newRoleId

      if (roleIdChanged) {
        if (newRoleId) {
          await rolesApi.assignRole(newRoleId, user.id)
        } else if (originalRoleId) {
          await rolesApi.unassignRole(originalRoleId, user.id)
        }
      }

      onSaved(roleIdChanged)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const handleRetry = async (svcKey) => {
    if (!retryPw) { setShowRetryPw(true); return }
    setRetrying(r => ({ ...r, [svcKey]: true }))
    setError('')
    try {
      const result = await api.retryProvisioning(user.id, retryPw)
      setProvStatus(result.provisioningStatus || provStatus)
    } catch (err) {
      setError(err.message)
    } finally {
      setRetrying(r => ({ ...r, [svcKey]: false }))
    }
  }

  const hasFailed = Object.values(provStatus).some(v => v === 'failed')

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 12, width: 580, maxWidth: '95vw',
        maxHeight: '92vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #e5e7eb',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>Edit {user.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>

          {/* Basic */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Full Name</label>
            <input style={input} value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={label}>Role</label>
              <select style={{ ...input }} value={form.roleSelectVal} onChange={e => handleRoleChange(e.target.value)}>
                <option value="staff">Staff</option>
                <option value="dept_head">Dept Head</option>
                <option value="admin">Admin</option>
                {customRoles.length > 0 && (
                  <>
                    <option disabled>──────────</option>
                    {customRoles.map(r => (
                      <option key={r.id} value={`custom:${r.id}`}>{r.name}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div>
              <label style={label}>Department</label>
              <select style={{ ...input }} value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">— None —</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          </div>

          {/* HR fields */}
          <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase' }}>Employment</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={label}>Job Title</label>
              <input style={input} value={form.job_title} onChange={e => set('job_title', e.target.value)} placeholder="e.g. Software Engineer" />
            </div>
            <div>
              <label style={label}>Manager</label>
              <select style={{ ...input }} value={form.manager_id} onChange={e => set('manager_id', e.target.value)}>
                <option value="">— None —</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={label}>Employee Number</label>
              <input style={input} value={form.employee_number} onChange={e => set('employee_number', e.target.value)} placeholder="EMP-001" />
            </div>
            <div>
              <label style={label}>Phone</label>
              <input style={input} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+597 000 0000" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={label}>Contract Type</label>
              <select style={{ ...input }} value={form.contract_type} onChange={e => set('contract_type', e.target.value)}>
                <option value="">— None —</option>
                {CONTRACT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Job Function</label>
              <select style={{ ...input }} value={form.job_function_id} onChange={e => set('job_function_id', e.target.value)}>
                <option value="">— None —</option>
                {jobFunctions.map(jf => <option key={jf.id} value={jf.id}>{jf.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={label}>Start Date</label>
              <input style={input} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label style={label}>End Date (optional)</label>
              <input style={input} type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>

          {/* Service access */}
          {activeServices.size > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...label, marginBottom: 8 }}>Service Access</div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {[...activeServices].map((svc, i) => {
                  const levels = SERVICE_ACCESS_LEVELS[svc] || ['none', 'view']
                  return (
                    <div key={svc} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 14px',
                      borderTop: i > 0 ? '1px solid #f3f4f6' : 'none',
                      background: i % 2 === 0 ? '#fafafa' : '#fff',
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                        {SERVICE_LABELS[svc] || svc}
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {levels.map(level => (
                          <button
                            key={level}
                            onClick={() => setAccess(svc, level)}
                            style={{
                              padding: '3px 9px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
                              border: form.access[svc] === level ? 'none' : '1px solid #e5e7eb',
                              background: form.access[svc] === level ? T.orange : '#fff',
                              color: form.access[svc] === level ? '#fff' : '#374151',
                              fontWeight: form.access[svc] === level ? 600 : 400,
                            }}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Provisioning */}
          {Object.keys(provStatus).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...label, marginBottom: 8 }}>Provisioning Status</div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {Object.entries(provStatus).map(([svc, status], i) => (
                  <div key={svc} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 14px',
                    borderTop: i > 0 ? '1px solid #f3f4f6' : 'none',
                    background: i % 2 === 0 ? '#fafafa' : '#fff',
                  }}>
                    <ProvisioningBadge service={svc} status={status} />
                    {status === 'failed' && (
                      <button onClick={() => handleRetry(svc)} disabled={retrying[svc]} style={{ ...btn('ghost'), fontSize: 11 }}>
                        {retrying[svc] ? 'Retrying…' : 'Retry'}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {hasFailed && showRetryPw && (
                <div style={{ marginTop: 10 }}>
                  <input
                    type="password"
                    placeholder="User's current password (for provisioning)"
                    value={retryPw}
                    onChange={e => setRetryPw(e.target.value)}
                    style={{ ...input, marginBottom: 0 }}
                  />
                </div>
              )}
              {hasFailed && !showRetryPw && (
                <button onClick={() => setShowRetryPw(true)} style={{ ...btn('ghost'), fontSize: 11, marginTop: 6 }}>
                  Retry all failed — enter password first
                </button>
              )}
            </div>
          )}

          {error && (
            <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={btn('ghost')}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ ...btn('primary'), padding: '7px 20px', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
