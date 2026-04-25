import { useState, useEffect, useCallback, useRef } from 'react'
import { rolesApi } from '../../../services/api'
import api from '../../../services/api'
import { T, btn, initials } from '../shared'

// ── Module + permission definitions ───────────────────────────────────────

const MODULES = [
  { key: 'assets',        label: 'Assets',         actions: ['view', 'checkout', 'edit', 'delete', 'audit'] },
  { key: 'projects',      label: 'Projects',        actions: ['view', 'create', 'edit', 'delete', 'signoff'] },
  { key: 'hr_employees',  label: 'HR – Employees',  actions: ['view', 'edit'] },
  { key: 'hr_schedule',   label: 'HR – Schedule',   actions: ['view', 'create', 'edit', 'publish'] },
  { key: 'hr_timesheets', label: 'HR – Timesheets', actions: ['view', 'approve'] },
  { key: 'hr_leave',      label: 'HR – Leave',      actions: ['view', 'approve'] },
  { key: 'hr_payroll',    label: 'HR – Payroll',    actions: ['view', 'run', 'finalize'] },
  { key: 'tickets',       label: 'Tickets',         actions: ['view', 'create', 'reply', 'close'] },
  { key: 'reports',       label: 'Reports',         actions: ['view', 'export'] },
  { key: 'users',         label: 'Users',           actions: ['view', 'invite', 'edit', 'deactivate'] },
  { key: 'settings',      label: 'Settings',        actions: ['view', 'edit'] },
  { key: 'announcements', label: 'Announcements',   actions: ['view', 'create'] },
]

const EMPTY_PERMS = () =>
  Object.fromEntries(MODULES.map(m => [m.key, { level: 'none', department_scope: 'all', scoped_department_ids: [] }]))

function permsToMap(input) {
  const map = EMPTY_PERMS()
  const arr = Array.isArray(input)
    ? input
    : Object.entries(input).map(([service, p]) => ({ service, ...p }))
  for (const p of arr) {
    if (p.service in map) {
      map[p.service] = {
        level: p.level || 'none',
        department_scope: p.department_scope || 'all',
        scoped_department_ids: p.scoped_department_ids || [],
      }
    }
  }
  return map
}

function permsToArray(map) {
  return Object.entries(map).map(([service, p]) => ({
    service,
    level: p.level,
    department_scope: p.department_scope,
    scoped_department_ids: p.scoped_department_ids,
  }))
}

// System roles are hardcoded, read-only, cannot be deleted
const SYSTEM_ROLES = [
  {
    id: 'staff', name: 'Staff', description: 'Self-access only — own schedule, leave, tickets',
    perms: {
      assets:        { level: 'view',   department_scope: 'own', scoped_department_ids: [] },
      projects:      { level: 'view',   department_scope: 'own', scoped_department_ids: [] },
      hr_employees:  { level: 'none',   department_scope: 'all', scoped_department_ids: [] },
      hr_schedule:   { level: 'view',   department_scope: 'own', scoped_department_ids: [] },
      hr_timesheets: { level: 'view',   department_scope: 'own', scoped_department_ids: [] },
      hr_leave:      { level: 'view',   department_scope: 'own', scoped_department_ids: [] },
      hr_payroll:    { level: 'none',   department_scope: 'all', scoped_department_ids: [] },
      tickets:       { level: 'create', department_scope: 'own', scoped_department_ids: [] },
      reports:       { level: 'none',   department_scope: 'all', scoped_department_ids: [] },
      users:         { level: 'none',   department_scope: 'all', scoped_department_ids: [] },
      settings:      { level: 'none',   department_scope: 'all', scoped_department_ids: [] },
      announcements: { level: 'view',   department_scope: 'all', scoped_department_ids: [] },
    },
  },
  {
    id: 'dept_head', name: 'Dept Head', description: 'View and approve within own department',
    perms: {
      assets:        { level: 'view',    department_scope: 'own', scoped_department_ids: [] },
      projects:      { level: 'signoff', department_scope: 'all', scoped_department_ids: [] },
      hr_employees:  { level: 'view',    department_scope: 'own', scoped_department_ids: [] },
      hr_schedule:   { level: 'view',    department_scope: 'own', scoped_department_ids: [] },
      hr_timesheets: { level: 'approve', department_scope: 'own', scoped_department_ids: [] },
      hr_leave:      { level: 'approve', department_scope: 'own', scoped_department_ids: [] },
      hr_payroll:    { level: 'none',    department_scope: 'all', scoped_department_ids: [] },
      tickets:       { level: 'reply',   department_scope: 'all', scoped_department_ids: [] },
      reports:       { level: 'view',    department_scope: 'all', scoped_department_ids: [] },
      users:         { level: 'view',    department_scope: 'own', scoped_department_ids: [] },
      settings:      { level: 'none',    department_scope: 'all', scoped_department_ids: [] },
      announcements: { level: 'none',    department_scope: 'all', scoped_department_ids: [] },
    },
  },
  {
    id: 'admin', name: 'Admin', description: 'Full access to all modules',
    perms: Object.fromEntries(
      MODULES.map(m => [m.key, { level: m.actions[m.actions.length - 1], department_scope: 'all', scoped_department_ids: [] }])
    ),
  },
]

// ── Shared primitives ──────────────────────────────────────────────────────

function Avatar({ name, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--faya-orange)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontWeight: 700, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  )
}

const sectionLabel = {
  fontSize: 10, fontWeight: 700, color: T.muted,
  textTransform: 'uppercase', letterSpacing: 0.8,
  padding: '12px 16px 4px',
}

// ── ScopeSelect ────────────────────────────────────────────────────────────

function ScopeSelect({ value, deptIds, departments, onChange, readOnly }) {
  const scope = value || 'all'
  const ids = deptIds || []

  if (readOnly) {
    const label = scope === 'own' ? 'Own dept'
      : scope === 'specific' ? `${ids.length} dept(s)`
      : 'All depts'
    return <span style={{ fontSize: 11, color: T.muted }}>{label}</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
      <select
        value={scope}
        onChange={e => onChange('department_scope', e.target.value)}
        style={{
          fontSize: 11, padding: '3px 6px', borderRadius: 5,
          border: '1px solid #d1d5db', fontFamily: T.font, background: '#fff', cursor: 'pointer',
        }}
      >
        <option value="all">All departments</option>
        <option value="own">Own department</option>
        <option value="specific">Specific departments</option>
      </select>
      {scope === 'specific' && departments.length > 0 && (
        <select
          multiple
          size={Math.min(4, departments.length)}
          value={ids}
          onChange={e => {
            const selected = [...e.target.options].filter(o => o.selected).map(o => o.value)
            onChange('scoped_department_ids', selected)
          }}
          style={{ fontSize: 11, borderRadius: 5, border: '1px solid #d1d5db', fontFamily: T.font }}
        >
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}
    </div>
  )
}

// ── PermissionMatrix ───────────────────────────────────────────────────────

function PermissionMatrix({ perms, onChange, departments, readOnly }) {
  const pill = (active, danger) => ({
    padding: '3px 9px', borderRadius: 5, fontSize: 11,
    cursor: readOnly ? 'default' : 'pointer',
    border: active ? 'none' : `1px solid ${T.border}`,
    background: active ? (danger ? '#6b7280' : 'var(--faya-orange)') : 'transparent',
    color: active ? '#fff' : T.muted,
    fontWeight: active ? 600 : 400,
    fontFamily: T.font,
  })

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8f9fa' }}>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: `1px solid ${T.border}`, minWidth: 150 }}>Module</th>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: `1px solid ${T.border}` }}>Access Level</th>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: `1px solid ${T.border}`, minWidth: 150 }}>Dept Scope</th>
          </tr>
        </thead>
        <tbody>
          {MODULES.map((mod, i) => {
            const p = perms[mod.key] || { level: 'none', department_scope: 'all', scoped_department_ids: [] }
            const hasAccess = p.level !== 'none'
            return (
              <tr key={mod.key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: hasAccess ? T.text : T.muted }}>
                    {mod.label}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button
                      disabled={readOnly}
                      onClick={() => !readOnly && onChange(mod.key, 'level', 'none')}
                      style={pill(p.level === 'none', true)}
                    >
                      none
                    </button>
                    {mod.actions.map(action => (
                      <button
                        key={action}
                        disabled={readOnly}
                        onClick={() => !readOnly && onChange(mod.key, 'level', p.level === action ? 'none' : action)}
                        style={pill(p.level === action, false)}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}` }}>
                  <ScopeSelect
                    value={p.department_scope}
                    deptIds={p.scoped_department_ids}
                    departments={departments}
                    onChange={(field, val) => onChange(mod.key, field, val)}
                    readOnly={readOnly || !hasAccess}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── AssignedUsers ──────────────────────────────────────────────────────────

function AssignedUsers({ roleId, showToast }) {
  const [roleUsers, setRoleUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const dropRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ru, au] = await Promise.all([rolesApi.getRoleUsers(roleId), api.getUsers()])
      setRoleUsers(Array.isArray(ru) ? ru : [])
      setAllUsers(Array.isArray(au) ? au : [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [roleId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!searchOpen) return
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [searchOpen])

  const assignedIds = new Set(roleUsers.map(u => u.id))
  const candidates = allUsers.filter(u =>
    !assignedIds.has(u.id) &&
    u.role !== 'admin' &&
    u.role !== 'superadmin'
  )
  const filtered = searchQ
    ? candidates.filter(u =>
        u.name?.toLowerCase().includes(searchQ.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQ.toLowerCase())
      )
    : candidates

  const handleAssign = async (userId) => {
    setSearchOpen(false)
    setSearchQ('')
    setAssigning(true)
    try {
      await rolesApi.assignRole(roleId, userId)
      await load()
      showToast('Role assigned — user must re-login for changes to take effect.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setAssigning(false)
    }
  }

  const handleRemove = async (userId) => {
    setRemoving(userId)
    try {
      await rolesApi.unassignRole(roleId, userId)
      await load()
      showToast('Role removed — user must re-login for changes to take effect.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>
          Assigned Users ({roleUsers.length})
        </div>
        <div style={{ position: 'relative' }} ref={dropRef}>
          <button
            onClick={() => setSearchOpen(s => !s)}
            disabled={assigning}
            style={{ ...btn('primary'), fontSize: 12 }}
          >
            {assigning ? 'Assigning…' : '+ Assign User'}
          </button>
          {searchOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)', width: 270,
              background: '#fff', borderRadius: 8, border: `1px solid ${T.border}`,
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 100,
            }}>
              <div style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>
                <input
                  autoFocus
                  placeholder="Search users…"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  style={{
                    width: '100%', padding: '6px 8px', borderRadius: 6,
                    border: `1px solid ${T.border}`, fontSize: 12,
                    fontFamily: T.font, boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 12, color: T.muted }}>No users available</div>
                ) : filtered.slice(0, 30).map((u, i) => (
                  <div
                    key={u.id}
                    onClick={() => handleAssign(u.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', cursor: 'pointer',
                      borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f8f9fa' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '' }}
                  >
                    <Avatar name={u.name} size={24} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{u.department || u.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: T.muted, padding: '8px 0' }}>Loading…</div>
      ) : roleUsers.length === 0 ? (
        <div style={{ fontSize: 13, color: T.muted, padding: '8px 0' }}>No users assigned to this role.</div>
      ) : (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
          {roleUsers.map((u, i) => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
              background: i % 2 === 0 ? '#fff' : '#fafafa',
            }}>
              <Avatar name={u.name} size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{u.name}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{u.department_name || u.email || '—'}</div>
              </div>
              <button
                onClick={() => handleRemove(u.id)}
                disabled={removing === u.id}
                style={{ ...btn('danger'), fontSize: 11 }}
              >
                {removing === u.id ? 'Removing…' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── CreateRoleModal ────────────────────────────────────────────────────────

function CreateRoleModal({ departments, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' })
  const [perms, setPerms] = useState(EMPTY_PERMS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updatePerm = (module, field, value) =>
    setPerms(p => ({ ...p, [module]: { ...p[module], [field]: value } }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    try {
      const role = await rolesApi.createRole({
        name: form.name.trim(),
        description: form.description.trim(),
        permissions: permsToArray(perms),
      })
      onCreated(role)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const inputSt = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #e5e7eb', fontSize: 13, fontFamily: T.font, boxSizing: 'border-box',
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, width: 760, maxWidth: '96vw', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>Create Role</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, color: T.muted, display: 'block', marginBottom: 5, fontWeight: 500 }}>Role Name *</label>
              <input style={inputSt} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Department Manager" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: T.muted, display: 'block', marginBottom: 5, fontWeight: 500 }}>Description</label>
              <input style={inputSt} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
            </div>
          </div>

          <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase' }}>Permissions</div>
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
            <PermissionMatrix perms={perms} onChange={updatePerm} departments={departments} />
          </div>

          {error && (
            <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={btn('ghost')}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ ...btn('primary'), padding: '7px 20px', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Creating…' : 'Create Role'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── RoleCard ───────────────────────────────────────────────────────────────

function RoleCard({ role, selected, onSelect, locked }) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '10px 16px', cursor: 'pointer',
        borderLeft: selected ? '3px solid var(--faya-orange)' : '3px solid transparent',
        background: selected ? '#FFF8F3' : 'transparent',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f8f9fa' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {locked && <span style={{ fontSize: 12, opacity: 0.5 }}>🔒</span>}
        <span style={{ fontSize: 13, fontWeight: 500, color: T.navy, flex: 1 }}>{role.name}</span>
        {role.user_count !== undefined && (
          <span style={{
            fontSize: 10, background: selected ? 'rgba(232,94,28,0.12)' : '#e5e7eb',
            color: selected ? 'var(--faya-orange)' : '#6b7280',
            borderRadius: 10, padding: '1px 6px', fontWeight: 600,
          }}>
            {role.user_count}
          </span>
        )}
      </div>
      {role.description && (
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2, paddingLeft: locked ? 18 : 0, lineHeight: 1.3 }}>
          {role.description}
        </div>
      )}
    </div>
  )
}

// ── RoleDetail (right panel) ───────────────────────────────────────────────

function RoleDetail({ role, isSystem, departments, showToast, onSaved, onDeleted }) {
  const initPerms = () => {
    if (role.permissions) return permsToMap(role.permissions)
    if (role.perms) return permsToMap(role.perms)
    return EMPTY_PERMS()
  }

  const [form, setForm] = useState({ name: role.name, description: role.description || '' })
  const [perms, setPerms] = useState(initPerms)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm({ name: role.name, description: role.description || '' })
    setPerms(initPerms())
    setError('')
  }, [role.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const updatePerm = (module, field, value) =>
    setPerms(p => ({ ...p, [module]: { ...p[module], [field]: value } }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    try {
      await rolesApi.updateRole(role.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        permissions: permsToArray(perms),
      })
      showToast('Role saved')
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const count = parseInt(role.user_count) || 0
    if (count > 0) {
      setError(`Cannot delete — ${count} user(s) assigned. Remove them first.`)
      return
    }
    if (!window.confirm(`Delete role "${role.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await rolesApi.deleteRole(role.id)
      showToast('Role deleted')
      onDeleted()
    } catch (e) {
      setError(e.message)
      setDeleting(false)
    }
  }

  const inputSt = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #e5e7eb', fontSize: 13, fontFamily: T.font,
    boxSizing: 'border-box', background: isSystem ? '#f9fafb' : '#fff',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Role Name</label>
              <input style={inputSt} value={form.name} readOnly={isSystem} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</label>
              <input style={inputSt} value={form.description} readOnly={isSystem} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
            </div>
          </div>

          {!isSystem && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, paddingTop: 22 }}>
              <button onClick={handleDelete} disabled={deleting} style={{ ...btn('danger'), fontSize: 12 }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button onClick={handleSave} disabled={saving} style={{ ...btn('primary'), fontSize: 12, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {isSystem ? (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: '#f3f4f6', borderRadius: 6, fontSize: 12, color: T.muted }}>
            🔒 System role — read-only. Cannot be edited or deleted.
          </div>
        ) : (
          role.user_count !== undefined && (
            <div style={{ marginTop: 8, fontSize: 12, color: T.muted }}>
              <strong style={{ color: T.text }}>{role.user_count}</strong> user{role.user_count !== 1 ? 's' : ''} assigned
            </div>
          )
        )}
      </div>

      {error && (
        <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Permission matrix */}
      <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase' }}>Permissions</div>
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 28 }}>
        <PermissionMatrix perms={perms} onChange={updatePerm} departments={departments} readOnly={isSystem} />
      </div>

      {/* Assigned users — custom roles only */}
      {!isSystem && (
        <AssignedUsers roleId={role.id} showToast={showToast} />
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function RolesPermissions({ showToast: parentToast }) {
  const [roles, setRoles] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('staff')
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    if (parentToast) { parentToast(msg, type); return }
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    try {
      const [r, d] = await Promise.all([rolesApi.getRoles(), api.getDepartments()])
      setRoles(Array.isArray(r) ? r : [])
      setDepartments(Array.isArray(d) ? d : [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const systemRole = SYSTEM_ROLES.find(r => r.id === selectedId)
  const customRole = roles.find(r => r.id === selectedId)
  const selectedRole = systemRole || customRole

  const handleCreated = (role) => {
    setShowCreate(false)
    load().then(() => setSelectedId(role.id))
  }

  const handleDeleted = () => {
    setSelectedId('staff')
    load()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 13, color: T.muted }}>
        Loading roles…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: T.font }}>
      {/* Local toast (when no parent showToast) */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          background: toast.type === 'error' ? '#c0392b' : '#27ae60',
          color: '#fff', padding: '10px 18px', borderRadius: 8,
          fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Left panel */}
      <div style={{ width: 260, flexShrink: 0, borderRight: `1px solid ${T.border}`, background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '16px 16px 8px' }}>
          <button
            onClick={() => setShowCreate(true)}
            style={{ ...btn('primary'), width: '100%', textAlign: 'center', padding: '8px 0', fontSize: 13 }}
          >
            + Create Role
          </button>
        </div>

        <div style={sectionLabel}>System Roles</div>
        {SYSTEM_ROLES.map(role => (
          <RoleCard
            key={role.id}
            role={role}
            selected={selectedId === role.id}
            onSelect={() => setSelectedId(role.id)}
            locked
          />
        ))}

        <div style={sectionLabel}>Custom Roles</div>
        {roles.length === 0 ? (
          <div style={{ padding: '4px 16px 12px', fontSize: 12, color: T.muted }}>No custom roles yet.</div>
        ) : roles.map(role => (
          <RoleCard
            key={role.id}
            role={role}
            selected={selectedId === role.id}
            onSelect={() => setSelectedId(role.id)}
          />
        ))}
      </div>

      {/* Right panel */}
      {selectedRole ? (
        <RoleDetail
          key={selectedRole.id}
          role={selectedRole}
          isSystem={!!systemRole}
          departments={departments}
          showToast={showToast}
          onSaved={load}
          onDeleted={handleDeleted}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13 }}>
          Select a role to view or edit
        </div>
      )}

      {showCreate && (
        <CreateRoleModal
          departments={departments}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
