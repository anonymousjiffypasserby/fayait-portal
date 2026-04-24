import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import Sidebar from './Sidebar'
import UsersTable from './UsersTable'
import AddUserModal from './AddUserModal'
import EditUserModal from './EditUserModal'
import ResultModal from './ResultModal'
import MyProfile from './views/MyProfile'
import DepartmentsView from './views/DepartmentsView'
import OrgChart from './views/OrgChart'
import JobFunctionsView from './views/JobFunctionsView'
import RolesPermissions from './views/RolesPermissions'
import ImportUsers from './views/ImportUsers'
import ActivityLog from './views/ActivityLog'
import { T, ADMIN_ROLES, DEPT_HEAD_ROLES, getStatus } from './shared'

const PEOPLE_VIEWS = new Set(['all', 'active', 'inactive', 'invited', 'deptHeads', 'admins'])

const PEOPLE_TITLES = {
  all: 'All Users', active: 'Active', inactive: 'Inactive',
  invited: 'Invited', deptHeads: 'Dept Heads', admins: 'Admins',
}

function filterUsers(users, view) {
  switch (view) {
    case 'active':    return users.filter(u => getStatus(u) === 'active')
    case 'inactive':  return users.filter(u => getStatus(u) === 'inactive')
    case 'invited':   return users.filter(u => getStatus(u) === 'invited')
    case 'deptHeads': return users.filter(u => u.role === 'dept_head')
    case 'admins':    return users.filter(u => ADMIN_ROLES.includes(u.role))
    default:          return users
  }
}

export default function Users() {
  const { user: authMe } = useAuth()
  const isAdmin       = ADMIN_ROLES.includes(authMe?.role)
  const canManage     = DEPT_HEAD_ROLES.includes(authMe?.role)

  const [view, setView]                   = useState(canManage ? 'all' : 'myprofile')
  const [users, setUsers]                 = useState([])
  const [myProfile, setMyProfile]         = useState(null)
  const [companyConfig, setCompanyConfig] = useState(null)
  const [loading, setLoading]             = useState(true)
  const [selected, setSelected]           = useState(new Set())
  const [showAdd, setShowAdd]             = useState(false)
  const [editUser, setEditUser]           = useState(null)
  const [resultData, setResultData]       = useState(null)
  const [toast, setToast]                 = useState(null)
  const [activeServices, setActiveServices] = useState(new Set())

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers()
      setUsers(Array.isArray(data) ? data : [])
      const self = Array.isArray(data) ? data.find(u => u.id === authMe?.id) : null
      if (self) setMyProfile(self)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const fetchMyProfile = async () => {
    try {
      const data = await api.getUser(authMe?.id)
      setMyProfile(data)
    } catch {}
  }

  const fetchConfig = async () => {
    try {
      const data = await api.getCompanyConfig()
      setCompanyConfig(data)
      if (data?.services) {
        setActiveServices(new Set(
          Object.entries(data.services)
            .filter(([, s]) => s?.status === 'active')
            .map(([k]) => k)
        ))
      }
    } catch {}
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([
        canManage ? fetchUsers() : fetchMyProfile(),
        fetchConfig(),
      ])
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── User management handlers ─────────────────────────────────────────────────

  const handleViewChange = (v) => { setView(v); setSelected(new Set()) }

  const handleSelect    = (id, checked) => setSelected(s => { const n = new Set(s); checked ? n.add(id) : n.delete(id); return n })
  const handleSelectAll = (checked)     => setSelected(checked ? new Set(filterUsers(users, view).map(u => u.id)) : new Set())

  const handleToggleActive = async (u) => {
    try {
      u.active !== false ? await api.deactivateUser(u.id) : await api.activateUser(u.id)
      fetchUsers()
      showToast(`${u.name} ${u.active !== false ? 'deactivated' : 'activated'}`)
    } catch (err) { showToast(err.message, 'error') }
  }

  const handleResetPassword = async (u) => {
    if (!window.confirm(`Reset password for ${u.name}?`)) return
    try {
      const result = await api.resetPassword(u.id)
      setResultData({ userId: u.id, tempPassword: result.tempPassword, provisioningStatus: u.provisioning_status || {}, hideProvisioning: true })
    } catch (err) { showToast(err.message, 'error') }
  }

  const handleBulkDeactivate = async () => {
    const ids = [...selected]
    for (const id of ids) { try { await api.deactivateUser(id) } catch {} }
    setSelected(new Set()); fetchUsers(); showToast(`${ids.length} users deactivated`)
  }

  const handleBulkActivate = async () => {
    const ids = [...selected]
    for (const id of ids) { try { await api.activateUser(id) } catch {} }
    setSelected(new Set()); fetchUsers(); showToast(`${ids.length} users activated`)
  }

  const handleBulkResetPassword = async () => {
    const targets = filterUsers(users, view).filter(u => selected.has(u.id))
    const rows = []
    for (const u of targets) {
      try { const r = await api.resetPassword(u.id); rows.push(`${u.name},${u.email},${r.tempPassword}`) } catch {}
    }
    const blob = new Blob([['Name,Email,TempPassword', ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'reset_passwords.csv'; a.click()
    URL.revokeObjectURL(a.href)
    setSelected(new Set()); showToast(`Passwords reset for ${rows.length} users`)
  }

  const handleCreated = (result) => {
    setShowAdd(false); fetchUsers()
    setResultData({ userId: result.user?.id || result.id, tempPassword: result.tempPassword, provisioningStatus: result.provisioningStatus || {} })
  }

  // ── Counts for sidebar badges ─────────────────────────────────────────────────

  const counts = {
    all:       users.length,
    active:    users.filter(u => getStatus(u) === 'active').length,
    inactive:  users.filter(u => getStatus(u) === 'inactive').length,
    invited:   users.filter(u => getStatus(u) === 'invited').length,
    deptHeads: users.filter(u => u.role === 'dept_head').length,
    admins:    users.filter(u => ADMIN_ROLES.includes(u.role)).length,
  }

  // ── View renderer ────────────────────────────────────────────────────────────

  const renderContent = () => {
    if (view === 'myprofile') {
      if (loading && !myProfile) {
        return <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
      }
      return (
        <MyProfile
          me={myProfile || authMe}
          onUpdated={canManage ? fetchUsers : fetchMyProfile}
        />
      )
    }

    if (PEOPLE_VIEWS.has(view)) {
      const base = filterUsers(users, view)
      const filtered = authMe?.role === 'dept_head'
        ? base.filter(u => u.department === authMe.department)
        : base
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 12px', flexShrink: 0 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: T.navy, margin: 0 }}>
              {PEOPLE_TITLES[view]}
            </h1>
            {isAdmin && (
              <button
                onClick={() => setShowAdd(true)}
                style={{ background: T.orange, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: T.font }}
              >
                + Add User
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflow: 'auto', margin: '0 24px 24px', background: '#fff', borderRadius: 10, border: `1px solid ${T.border}` }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
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
      )
    }

    switch (view) {
      case 'departments':
        return <DepartmentsView showToast={showToast} />
      case 'orgchart':
        return <OrgChart me={authMe} companyConfig={companyConfig} onConfigUpdate={fetchConfig} />
      case 'jobfunctions':
        return <JobFunctionsView showToast={showToast} />
      case 'roles':
        return <RolesPermissions />
      case 'import':
        return <ImportUsers showToast={showToast} />
      case 'activitylog':
        return <ActivityLog me={authMe} />
      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: T.font }}>
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

      <Sidebar view={view} setView={handleViewChange} userRole={authMe?.role} counts={counts} />

      <div style={{ flex: 1, overflow: 'auto', background: T.bg }}>
        {renderContent()}
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
