import { useState, useEffect, useCallback } from 'react'
import { T, hrApi, Spinner, EmptyState, Btn, Modal, Field, Input, ErrMsg } from './shared'

const EMPTY = { name: '', days_per_year: '', paid: true, requires_approval: true, carry_over: false, max_carry_over: '' }

export default function LeaveTypes() {
  const [types, setTypes]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    hrApi.getLeaveTypes()
      .then(d => setTypes(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setForm(EMPTY); setErr(null); setModal('add') }
  const openEdit = (t) => {
    setForm({
      name: t.name, days_per_year: t.days_per_year,
      paid: t.paid, requires_approval: t.requires_approval, carry_over: t.carry_over || false,
      max_carry_over: t.max_carry_over || '',
    })
    setErr(null); setModal(t)
  }

  const save = async () => {
    if (!form.name || !form.days_per_year) { setErr('Name and days required'); return }
    setSaving(true); setErr(null)
    try {
      const body = { ...form, days_per_year: parseInt(form.days_per_year), max_carry_over: form.max_carry_over ? parseInt(form.max_carry_over) : null }
      if (modal === 'add') await hrApi.createLeaveType(body)
      else await hrApi.updateLeaveType(modal.id, body)
      setModal(null); load()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    setDeleting(id)
    try { await hrApi.deleteLeaveType(id); load() }
    catch (e) { setErr(e.message) }
    finally { setDeleting(null) }
  }

  const Toggle = ({ field, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 13, color: T.navy }}>{label}</span>
      <div
        onClick={() => setForm(f => ({ ...f, [field]: !f[field] }))}
        style={{
          width: 36, height: 20, borderRadius: 10, background: form[field] ? T.orange : '#d1d5db',
          cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: form[field] ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
    </div>
  )

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>Leave Types</div>
        <Btn variant="primary" onClick={openAdd}>+ Add Leave Type</Btn>
      </div>
      <ErrMsg msg={err} />

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={24} /></div>
        : types.length === 0
          ? <EmptyState icon="🗂" title="No leave types" sub="Create leave types for your organization." />
          : (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafbfc', borderBottom: `1px solid ${T.border}` }}>
                    {['Name', 'Days / Year', 'Paid', 'Requires Approval', 'Carry Over', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {types.map((t, i) => (
                    <tr key={t.id} style={{ borderBottom: i < types.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                      <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500, color: T.navy }}>{t.name}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: T.muted }}>{t.days_per_year} days</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontSize: 12, color: t.paid ? T.green : T.muted }}>{t.paid ? '✓ Paid' : 'Unpaid'}</span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontSize: 12, color: t.requires_approval ? T.blue : T.muted }}>{t.requires_approval ? '✓ Yes' : 'Auto'}</span>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: T.muted }}>
                        {t.carry_over ? `${t.max_carry_over ?? '∞'} days` : '—'}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Btn variant="ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => openEdit(t)}>Edit</Btn>
                          <Btn variant="danger" style={{ fontSize: 11, padding: '3px 8px' }} loading={deleting === t.id} onClick={() => del(t.id)}>Delete</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }

      {modal && (
        <Modal title={modal === 'add' ? 'Add Leave Type' : 'Edit Leave Type'} onClose={() => setModal(null)}>
          <ErrMsg msg={err} />
          <Field label="Name" required>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Annual Leave" />
          </Field>
          <Field label="Days per Year" required>
            <Input type="number" min="0" value={form.days_per_year} onChange={e => setForm(f => ({ ...f, days_per_year: e.target.value }))} />
          </Field>
          <Toggle field="paid" label="Paid leave" />
          <Toggle field="requires_approval" label="Requires manager approval" />
          <Toggle field="carry_over" label="Allow carry over to next year" />
          {form.carry_over && (
            <Field label="Max carry over days (blank = unlimited)">
              <Input type="number" min="0" value={form.max_carry_over} onChange={e => setForm(f => ({ ...f, max_carry_over: e.target.value }))} />
            </Field>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" loading={saving} onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
