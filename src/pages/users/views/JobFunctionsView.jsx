import { useState, useEffect, useCallback } from 'react'
import { hrApi } from '../../hr/shared'
import { T, btn } from '../shared'

const inputSt = { width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: T.font, boxSizing: 'border-box' }
const lbl = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }
const EMPTY = { name: '', description: '', rate_type: 'hourly', rate_amount: '', currency: 'SRD', overtime_rate: '' }

function Modal({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: 480, maxWidth: '92vw', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
      </div>
    </div>
  )
}

export default function JobFunctionsView({ showToast }) {
  const [jfs, setJfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    hrApi.getJobFunctions()
      .then(d => setJfs(Array.isArray(d) ? d : []))
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setForm(EMPTY); setModal('add') }
  const openEdit = (jf) => {
    setForm({ name: jf.name || '', description: jf.description || '', rate_type: jf.rate_type || 'hourly', rate_amount: jf.rate_amount ?? '', currency: jf.currency || 'SRD', overtime_rate: jf.overtime_rate ?? '' })
    setModal(jf)
  }

  const save = async () => {
    if (!form.name.trim()) { showToast('Name is required', 'error'); return }
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), description: form.description || null, rate_type: form.rate_type, rate_amount: parseFloat(form.rate_amount) || 0, currency: form.currency || 'SRD', overtime_rate: parseFloat(form.overtime_rate) || 0 }
      if (modal === 'add') await hrApi.createJobFunction(payload)
      else await hrApi.updateJobFunction(modal.id, payload)
      setModal(null)
      load()
      showToast(modal === 'add' ? 'Job function added' : 'Job function updated')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const del = async (jf) => {
    if (!window.confirm(`Delete job function "${jf.name}"?`)) return
    setDeleting(jf.id)
    try { await hrApi.deleteJobFunction(jf.id); load(); showToast('Job function deleted') }
    catch (e) { showToast(e.message, 'error') }
    finally { setDeleting(null) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: T.navy }}>Job Functions</h2>
        <button onClick={openAdd} style={{ ...btn('primary'), padding: '8px 16px' }}>+ Add Job Function</button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f4f5f7', borderBottom: `1px solid ${T.border}` }}>
                {['Name', 'Rate Type', 'Rate', 'Currency', 'Employees', ''].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jfs.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: T.muted }}>No job functions yet.</td></tr>
              )}
              {jfs.map(jf => (
                <tr key={jf.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ fontWeight: 500, color: T.navy }}>{jf.name}</div>
                    {jf.description && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{jf.description}</div>}
                  </td>
                  <td style={{ padding: '11px 16px', color: T.muted, textTransform: 'capitalize' }}>{jf.rate_type}</td>
                  <td style={{ padding: '11px 16px', color: T.navy }}>
                    {jf.rate_amount != null ? parseFloat(jf.rate_amount).toFixed(2) : '—'}
                  </td>
                  <td style={{ padding: '11px 16px', color: T.muted }}>{jf.currency || 'SRD'}</td>
                  <td style={{ padding: '11px 16px', color: T.muted }}>{jf.employee_count ?? 0}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEdit(jf)} style={{ ...btn('ghost'), fontSize: 11, marginRight: 4 }}>Edit</button>
                    <button onClick={() => del(jf)} disabled={deleting === jf.id} style={{ ...btn('ghost'), fontSize: 11, color: '#A32D2D', borderColor: 'rgba(163,45,45,0.3)', opacity: deleting === jf.id ? 0.6 : 1 }}>
                      {deleting === jf.id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Job Function' : 'Edit Job Function'} onClose={() => setModal(null)}>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Name *</label>
            <input style={inputSt} value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Description</label>
            <input style={inputSt} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Rate Type</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.rate_type} onChange={e => set('rate_type', e.target.value)}>
                <option value="hourly">Hourly</option>
                <option value="salary">Salary (yearly)</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Rate Amount</label>
              <input style={inputSt} type="number" min="0" step="0.01" value={form.rate_amount} onChange={e => set('rate_amount', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Currency</label>
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.currency} onChange={e => set('currency', e.target.value)}>
                <option value="SRD">SRD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Overtime Rate</label>
              <input style={inputSt} type="number" min="0" step="0.01" value={form.overtime_rate} onChange={e => set('overtime_rate', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setModal(null)} style={btn('ghost')}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ ...btn('primary'), opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
