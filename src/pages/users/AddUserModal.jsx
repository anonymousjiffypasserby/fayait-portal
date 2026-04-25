import { useState, useEffect } from 'react'
import api, { rolesApi } from '../../services/api'
import { T, SERVICE_LABELS, SERVICE_ACCESS_LEVELS, btn } from './shared'

const field = { marginBottom: 14 }
const label = { fontSize: 12, color: T.muted, display: 'block', marginBottom: 5, fontWeight: 500 }
const input = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #e5e7eb', fontSize: 13, fontFamily: T.font,
  boxSizing: 'border-box',
}

export default function AddUserModal({ activeServices, onClose, onCreated }) {
  const [departments, setDepartments] = useState([])
  const [customRoles, setCustomRoles] = useState([])
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', roleSelectVal: 'staff',
    role: 'staff', role_id: null, department: '', welcomeEmail: false,
    access: Object.fromEntries(
      [...activeServices].map(s => [s, SERVICE_ACCESS_LEVELS[s]?.[1] || 'view'])
    ),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.getDepartments(), rolesApi.getRoles()])
      .then(([d, r]) => { setDepartments(d); setCustomRoles(Array.isArray(r) ? r : []) })
      .catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setAccess = (svc, level) => setForm(f => ({ ...f, access: { ...f.access, [svc]: level } }))

  const handleRoleChange = (val) => {
    if (val.startsWith('custom:')) {
      set('roleSelectVal', val)
      set('role', 'staff')
      set('role_id', val.slice(7))
    } else {
      set('roleSelectVal', val)
      set('role', val)
      set('role_id', null)
    }
  }

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.email.trim()) {
      setError('First name and email are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const access = Object.entries(form.access).map(([service, level]) => ({ service, level }))
      const result = await api.createUser({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        email: form.email.trim(),
        role: form.role,
        department: form.department || undefined,
        access,
      })
      if (form.role_id) {
        const newUserId = result.user?.id || result.id
        if (newUserId) {
          await rolesApi.assignRole(form.role_id, newUserId).catch(() => {})
        }
      }
      onCreated(result)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 12, width: 520, maxWidth: '95vw',
        maxHeight: '92vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>Add User</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={label}>First Name *</label>
              <input style={input} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Jane" />
            </div>
            <div>
              <label style={label}>Last Name</label>
              <input style={input} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Smith" />
            </div>
          </div>

          <div style={field}>
            <label style={label}>Email *</label>
            <input style={input} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@company.com" />
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

          {activeServices.size > 0 && (
            <div style={{ marginBottom: 14 }}>
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

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 20, color: T.muted }}>
            <input type="checkbox" checked={form.welcomeEmail} onChange={e => set('welcomeEmail', e.target.checked)} />
            Send welcome email (coming soon)
          </label>

          {error && (
            <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={btn('ghost')}>Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{ ...btn('primary'), padding: '7px 20px', fontSize: 13, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
