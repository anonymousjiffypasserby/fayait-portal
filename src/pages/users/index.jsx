import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import UsersTable from './UsersTable'
import AddUserModal from './AddUserModal'
import EditUserModal from './EditUserModal'
import ResultModal from './ResultModal'
import { T, ADMIN_ROLES, getStatus } from './shared'

const NAV = [
  { key: 'all',      label: 'All Users' },
  { key: 'active',   label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'invited',  label: 'Invited' },
  { key: 'admins',   label: 'Admins' },
]

function filterUsers(users, tab) {
  switch (tab) {
    case 'active':   return users.filter(u => getStatus(u) === 'active')
    case 'inactive': return users.filter(u => getStatus(u) === 'inactive')
    case 'invited':  return users.filter(u => getStatus(u) === 'invited')
    case 'admins':   return users.filter(u => ['admin', 'superadmin'].includes(u.role))
    default:         return users
  }
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`,
      padding: '14px 20px', minWidth: 100,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || T.navy }}>{value}</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function Users() {
  const { user: me } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all')
  const [selected, setSelected] = useState(new Set())
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)

  const [showAdd, setShowAdd] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [resultData, setResultData] = useState(null) // { userId, tempPassword, provisioningStatus }
  const [toast, setToast] = useState(null)

  const [activeServices, setActiveServices] = useState(new Set())

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    if (me?.services) {
      setActiveServices(new Set(
        Object.entries(me.services)
          .filter(([, v]) => v === 'active')
          .map(([k]) => k)
      ))
    }
  }, [me])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.getUsers()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  if (!ADMIN_ROLES.includes(me?.role)) return <Navigate to="/" replace />

  const filtered = filterUsers(users, tab)

  const handleSelect = (id, checked) => {
    setSelected(s => {
      const next = new Set(s)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  const handleSelectAll = (checked) => {
    setSelected(checked ? new Set(filtered.map(u => u.id)) : new Set())
  }

  const handleToggleActive = async (u) => {
    try {
      if (u.active !== false) {
        await api.deactivateUser(u.id)
      } else {
        await api.activateUser(u.id)
      }
      fetchUsers()
      showToast(`${u.name} ${u.active !== false ? 'deactivated' : 'activated'}`)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleResetPassword = async (u) => {
    if (!window.confirm(`Reset password for ${u.name}?`)) return
    try {
      const result = await api.resetPassword(u.id)
      setResultData({
        userId: u.id,
        tempPassword: result.tempPassword,
        provisioningStatus: u.provisioning_status || {},
        hideProvisioning: true,
      })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleBulkDeactivate = async () => {
    const targets = [...selected]
    for (const id of targets) {
      try { await api.deactivateUser(id) } catch {}
    }
    setSelected(new Set())
    fetchUsers()
    showToast(`${targets.length} users deactivated`)
  }

  const handleBulkActivate = async () => {
    const targets = [...selected]
    for (const id of targets) {
      try { await api.activateUser(id) } catch {}
    }
    setSelected(new Set())
    fetchUsers()
    showToast(`${targets.length} users activated`)
  }

  const handleBulkResetPassword = async () => {
    const targets = filtered.filter(u => selected.has(u.id))
    const rows = []
    for (const u of targets) {
      try {
        const r = await api.resetPassword(u.id)
        rows.push(`${u.name},${u.email},${r.tempPassword}`)
      } catch {}
    }
    const csv = ['Name,Email,TempPassword', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'reset_passwords.csv'
    a.click()
    URL.revokeObjectURL(url)
    setSelected(new Set())
    showToast(`Passwords reset for ${rows.length} users`)
  }

  const handleCreated = (result) => {
    setShowAdd(false)
    fetchUsers()
    setResultData({
      userId: result.user?.id || result.id,
      tempPassword: result.tempPassword,
      provisioningStatus: result.provisioningStatus || {},
    })
  }

  const stats = {
    total:    users.length,
    active:   users.filter(u => getStatus(u) === 'active').length,
    inactive: users.filter(u => getStatus(u) === 'inactive').length,
    invited:  users.filter(u => getStatus(u) === 'invited').length,
    admins:   users.filter(u => ['admin', 'superadmin'].includes(u.role)).length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', overflow: 'hidden', fontFamily: T.font }}>
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

      {/* Sub-nav */}
      {isMobile ? (
        <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <select
            value={tab}
            onChange={e => { setTab(e.target.value); setSelected(new Set()) }}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, background: '#fff', fontFamily: T.font }}
          >
            {NAV.map(n => <option key={n.key} value={n.key}>{n.label}</option>)}
          </select>
        </div>
      ) : (
        <aside style={{ width: 200, flexShrink: 0, background: '#fff', borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', paddingTop: 24 }}>
          <div style={{ padding: '0 20px 16px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase' }}>
            People
          </div>
          {NAV.map(n => (
            <button
              key={n.key}
              onClick={() => { setTab(n.key); setSelected(new Set()) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', textAlign: 'left',
                padding: '9px 20px', border: 'none',
                background: tab === n.key ? '#fff7f4' : 'transparent',
                borderLeft: tab === n.key ? `3px solid ${T.orange}` : '3px solid transparent',
                color: tab === n.key ? T.orange : '#374151',
                fontSize: 13, fontWeight: tab === n.key ? 600 : 400, cursor: 'pointer',
              }}
            >
              <span>{n.label}</span>
              <span style={{ fontSize: 11, color: tab === n.key ? T.orange : T.muted, background: tab === n.key ? '#ffe8dc' : '#f3f4f6', borderRadius: 10, padding: '1px 6px' }}>
                {filterUsers(users, n.key).length}
              </span>
            </button>
          ))}
        </aside>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', background: T.bg, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 0', flexWrap: 'wrap', gap: 12,
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: T.navy, margin: 0 }}>People</h1>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              background: T.orange, color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            + Add User
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, padding: '16px 24px', flexWrap: 'wrap' }}>
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Active" value={stats.active} accent="#3B6D11" />
          <StatCard label="Inactive" value={stats.inactive} accent="#A32D2D" />
          <StatCard label="Invited" value={stats.invited} accent="#92400E" />
          <StatCard label="Admins" value={stats.admins} accent="#4338CA" />
        </div>

        {/* Table card */}
        <div style={{ margin: '0 24px 24px', background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
          ) : error ? (
            <div style={{ padding: 24, color: '#A32D2D', fontSize: 13 }}>{error}</div>
          ) : (
            <UsersTable
              users={filtered}
              selected={selected}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onEdit={u => setEditUser(u)}
              onToggleActive={handleToggleActive}
              onResetPassword={handleResetPassword}
              onBulkDeactivate={handleBulkDeactivate}
              onBulkActivate={handleBulkActivate}
              onBulkResetPassword={handleBulkResetPassword}
            />
          )}
        </div>
      </div>

      {showAdd && (
        <AddUserModal
          activeServices={activeServices}
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          activeServices={activeServices}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); fetchUsers(); showToast('User updated') }}
        />
      )}

      {resultData && (
        <ResultModal
          userId={resultData.userId}
          tempPassword={resultData.tempPassword}
          initialProvisioningStatus={resultData.hideProvisioning ? {} : resultData.provisioningStatus}
          onClose={() => setResultData(null)}
        />
      )}
    </div>
  )
}
