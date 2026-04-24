import { useState, useEffect } from 'react'
import api from '../../../services/api'
import { T, ADMIN_ROLES, btn } from '../shared'

const inputSt = { width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: T.font, boxSizing: 'border-box' }
const lbl = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }

function Modal({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: 440, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
      </div>
    </div>
  )
}

export default function DepartmentsView({ showToast }) {
  const [depts, setDepts] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', head_id: '' })
  const [saving, setSaving] = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [delErr, setDelErr] = useState('')

  useEffect(() => {
    Promise.all([api.getDepartments(), api.getUsers()])
      .then(([d, u]) => { setDepts(d); setUsers(u) })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  const eligibleHeads = users.filter(u => ADMIN_ROLES.includes(u.role) || u.role === 'dept_head')

  const openAdd = () => { setForm({ name: '', head_id: '' }); setModal('add') }
  const openEdit = (d) => { setForm({ name: d.name, head_id: d.head_id || '' }); setModal(d) }
  const close = () => { setModal(null); setSaving(false) }

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Name is required', 'error'); return }
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), head_id: form.head_id || null }
      if (modal === 'add') {
        const created = await api.createDepartment(payload)
        setDepts(d => [...d, created].sort((a, b) => a.name.localeCompare(b.name)))
        showToast('Department added')
      } else {
        const updated = await api.updateDepartment(modal.id, payload)
        setDepts(d => d.map(x => x.id === modal.id ? { ...x, ...updated, head_name: eligibleHeads.find(u => u.id === (form.head_id || null))?.name || null } : x))
        showToast('Department updated')
      }
      close()
    } catch (e) {
      showToast(e.message, 'error')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true); setDelErr('')
    try {
      await api.deleteDepartment(delTarget.id)
      setDepts(d => d.filter(x => x.id !== delTarget.id))
      showToast('Department deleted')
      setDelTarget(null)
    } catch (e) {
      setDelErr(e.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: T.navy }}>Departments</h2>
        <button onClick={openAdd} style={{ ...btn('primary'), padding: '8px 16px' }}>+ Add Department</button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f4f5f7', borderBottom: `1px solid ${T.border}` }}>
                {['Name', 'Department Head', 'Members', ''].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depts.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: T.muted }}>No departments yet.</td></tr>
              )}
              {depts.map(d => (
                <tr key={d.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: '11px 16px', fontWeight: 500, color: T.navy }}>{d.name}</td>
                  <td style={{ padding: '11px 16px', color: T.muted }}>{d.head_name || '—'}</td>
                  <td style={{ padding: '11px 16px', color: T.muted }}>{d.user_count ?? 0}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEdit(d)} style={{ ...btn('ghost'), fontSize: 11, marginRight: 4 }}>Edit</button>
                    <button onClick={() => { setDelTarget(d); setDelErr('') }} style={{ ...btn('ghost'), fontSize: 11, color: '#A32D2D', borderColor: 'rgba(163,45,45,0.3)' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Department' : 'Edit Department'} onClose={close}>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Name *</label>
            <input style={inputSt} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Department Head</label>
            <select style={{ ...inputSt, cursor: 'pointer' }} value={form.head_id} onChange={e => setForm(f => ({ ...f, head_id: e.target.value }))}>
              <option value="">— None —</option>
              {eligibleHeads.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={close} style={btn('ghost')}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ ...btn('primary'), opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : modal === 'add' ? 'Add Department' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {delTarget && (
        <Modal title="Delete Department" onClose={() => setDelTarget(null)}>
          <p style={{ fontSize: 13, color: '#374151', margin: '0 0 12px' }}>Delete department <strong>{delTarget.name}</strong>? This cannot be undone.</p>
          {delErr && <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{delErr}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setDelTarget(null)} style={btn('ghost')}>Cancel</button>
            <button onClick={handleDelete} disabled={deleting} style={{ ...btn('primary'), background: '#ef4444', opacity: deleting ? 0.7 : 1 }}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
