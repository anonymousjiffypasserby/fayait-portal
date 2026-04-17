import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../services/api'

const SERVICES = ['tickets', 'assets', 'status', 'passwords', 'chat', 'storage']
const ACCESS_LEVELS = ['none', 'view', 'agent', 'admin']

export default function Users() {
  const { user } = useAuth()
  const { t } = useLang()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    name: '', email: '', role: 'staff',
    access: SERVICES.map(s => ({ service: s, level: 'none' }))
  })

  const isAdmin = ['admin', 'superadmin'].includes(user?.role)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditUser(null)
    setForm({
      name: '', email: '', role: 'staff',
      access: SERVICES.map(s => ({ service: s, level: 'none' }))
    })
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditUser(u)
    setForm({
      name: u.name,
      email: u.email,
      role: u.role,
      access: SERVICES.map(s => ({
        service: s,
        level: u.access?.find(a => a.service === s)?.level || 'none'
      }))
    })
    setShowModal(true)
  }

  const handleAccessChange = (service, level) => {
    setForm(f => ({
      ...f,
      access: f.access.map(a => a.service === service ? { ...a, level } : a)
    }))
  }

  const handleSubmit = async () => {
    setError('')
    try {
      if (editUser) {
        await api.updateUser(editUser.id, { name: form.name, role: form.role, access: form.access })
        setSuccess('User updated')
      } else {
        const result = await api.createUser({ name: form.name, email: form.email, role: form.role, access: form.access })
        setSuccess(`User created. Temp password: ${result.tempPassword}`)
      }
      setShowModal(false)
      fetchUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div style={{ color: '#888780', fontSize: 13 }}>{t('loading')}</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--faya-navy)' }}>{t('users')}</h1>
        {isAdmin && (
          <button onClick={openAdd} style={{
            background: 'var(--faya-orange)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer'
          }}>
            {t('addUser')}
          </button>
        )}
      </div>

      {success && (
        <div style={{ background: '#EAF3DE', color: '#3B6D11', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {success}
        </div>
      )}

      {error && (
        <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f4f5f7', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              {[t('name'), t('email'), t('role'), t('access'), t('invoiceStatus'), ''].map((h, i) => (
                <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#5F5E5A', fontSize: 12 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)', opacity: u.active === false ? 0.5 : 1 }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--faya-orange)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 500, flexShrink: 0
                    }}>
                      {u.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span style={{ fontWeight: 500, color: 'var(--faya-navy)' }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: '#5F5E5A' }}>{u.email}</td>
                <td style={{ padding: '12px 16px', color: '#5F5E5A' }}>{u.role}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {u.access?.filter(a => a.level !== 'none').map(a => (
                      <span key={a.service} style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 4,
                        background: '#F1EFE8', color: '#5F5E5A', fontWeight: 500
                      }}>
                        {a.service}:{a.level}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
                    background: u.active ? '#EAF3DE' : '#FAEEDA',
                    color: u.active ? '#3B6D11' : '#633806'
                  }}>
                    {u.invited ? t('invited') : u.active ? t('active') : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(u)} style={{
                        background: 'none', border: '0.5px solid rgba(0,0,0,0.15)',
                        borderRadius: 6, padding: '4px 10px', fontSize: 11,
                        cursor: 'pointer', color: '#5F5E5A'
                      }}>
                        {t('edit')}
                      </button>
                      {u.active !== false ? (
                        <button onClick={async () => {
                          try {
                            await api.deactivateUser(u.id)
                            fetchUsers()
                          } catch (err) { setError(err.message) }
                        }} style={{
                          background: 'none', border: '0.5px solid rgba(163,45,45,0.4)',
                          borderRadius: 6, padding: '4px 10px', fontSize: 11,
                          cursor: 'pointer', color: '#A32D2D'
                        }}>
                          Deactivate
                        </button>
                      ) : (
                        <button onClick={async () => {
                          try {
                            await api.activateUser(u.id)
                            fetchUsers()
                          } catch (err) { setError(err.message) }
                        }} style={{
                          background: 'none', border: '0.5px solid rgba(59,109,17,0.4)',
                          borderRadius: 6, padding: '4px 10px', fontSize: 11,
                          cursor: 'pointer', color: '#3B6D11'
                        }}>
                          Activate
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24, width: 480,
            border: '0.5px solid rgba(0,0,0,0.08)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--faya-navy)', marginBottom: 20 }}>
              {editUser ? t('edit') : t('addUser')}
            </h2>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>{t('fullName')}</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 13 }} />
            </div>

            {!editUser && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>{t('email')}</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 13 }} />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>{t('role')}</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 13 }}>
                <option value="staff">{t('staff')}</option>
                <option value="admin">{t('itAdmin')}</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 10 }}>{t('access')}</label>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px 0', color: '#888780', fontWeight: 500 }}>Service</th>
                    {ACCESS_LEVELS.map(l => (
                      <th key={l} style={{ textAlign: 'center', padding: '4px 8px', color: '#888780', fontWeight: 500 }}>
                        {t(l === 'none' ? 'noAccess' : l === 'view' ? 'viewOnly' : l === 'agent' ? 'agent' : 'adminAccess')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SERVICES.map(service => (
                    <tr key={service} style={{ borderTop: '0.5px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '8px 0', color: 'var(--faya-navy)', fontWeight: 500 }}>
                        {t(service)}
                      </td>
                      {ACCESS_LEVELS.map(level => (
                        <td key={level} style={{ textAlign: 'center', padding: '8px' }}>
                          <input
                            type="radio"
                            name={`access-${service}`}
                            checked={form.access.find(a => a.service === service)?.level === level}
                            onChange={() => handleAccessChange(service, level)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && (
              <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowModal(false)} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)',
                background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#5F5E5A'
              }}>{t('cancel')}</button>
              <button onClick={handleSubmit} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                background: 'var(--faya-orange)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer'
              }}>
                {editUser ? t('saveChanges') : t('sendInvite')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
