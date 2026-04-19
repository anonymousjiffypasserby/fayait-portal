import { useState, useEffect, useCallback } from 'react'
import { T, hrApi, Spinner, EmptyState, Btn, Modal, Field, Input, Select, ErrMsg } from './shared'

const EMPTY = { name: '', type: 'fixed', amount: '', applies_to: 'all' }

export default function Deductions() {
  const [deductions, setDeductions] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(null)
  const [form, setForm]             = useState(EMPTY)
  const [saving, setSaving]         = useState(false)
  const [err, setErr]               = useState(null)
  const [deleting, setDeleting]     = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    hrApi.getSettings()
      .then(s => setDeductions(s.deduction_types || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setForm(EMPTY); setErr(null); setModal('add') }
  const openEdit = (d) => {
    setForm({ name: d.name, type: d.type, amount: d.amount, applies_to: d.applies_to || 'all' })
    setErr(null); setModal(d)
  }

  const save = async () => {
    if (!form.name || !form.amount) { setErr('Name and amount required'); return }
    setSaving(true); setErr(null)
    try {
      const body = { ...form, amount: parseFloat(form.amount) }
      if (modal === 'add') await hrApi.createDeduction(body)
      else await hrApi.updateDeduction(modal.id, body)
      setModal(null); load()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    setDeleting(id)
    try { await hrApi.deleteDeduction(id); load() }
    catch (e) { setErr(e.message) }
    finally { setDeleting(null) }
  }

  const F = (field) => ({ value: form[field], onChange: e => setForm(f => ({ ...f, [field]: e.target.value })) })

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>Deductions</div>
        <Btn variant="primary" onClick={openAdd}>+ Add Deduction</Btn>
      </div>
      <ErrMsg msg={err} />

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={24} /></div>
        : deductions.length === 0
          ? <EmptyState icon="📉" title="No deductions configured" sub="Add deductions like income tax, NIS, health insurance." />
          : (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafbfc', borderBottom: `1px solid ${T.border}` }}>
                    {['Name', 'Type', 'Amount', 'Applies To', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deductions.map((d, i) => (
                    <tr key={d.id} style={{ borderBottom: i < deductions.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                      <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500, color: T.navy }}>{d.name}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, textTransform: 'capitalize',
                          background: d.type === 'percentage' ? '#eff6ff' : '#f0fdf4',
                          color: d.type === 'percentage' ? T.blue : T.green,
                        }}>{d.type}</span>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500 }}>
                        {d.type === 'percentage' ? `${parseFloat(d.amount).toFixed(1)}%` : `$${parseFloat(d.amount).toFixed(2)}`}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: T.muted, textTransform: 'capitalize' }}>
                        {(d.applies_to || 'all').replace('_', ' ')}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Btn variant="ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => openEdit(d)}>Edit</Btn>
                          <Btn variant="danger" style={{ fontSize: 11, padding: '3px 8px' }} loading={deleting === d.id} onClick={() => del(d.id)}>Delete</Btn>
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
        <Modal title={modal === 'add' ? 'Add Deduction' : 'Edit Deduction'} onClose={() => setModal(null)}>
          <ErrMsg msg={err} />
          <Field label="Name" required><Input {...F('name')} placeholder="e.g. Income Tax" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Type">
              <Select {...F('type')}>
                <option value="fixed">Fixed Amount ($)</option>
                <option value="percentage">Percentage (%)</option>
              </Select>
            </Field>
            <Field label={form.type === 'percentage' ? 'Percentage' : 'Amount'} required>
              <Input type="number" min="0" step="0.01" {...F('amount')}
                placeholder={form.type === 'percentage' ? '0.0' : '0.00'} />
            </Field>
          </div>
          <Field label="Applies To">
            <Select {...F('applies_to')}>
              <option value="all">All employees</option>
              <option value="hourly">Hourly employees only</option>
              <option value="salary">Salaried employees only</option>
            </Select>
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" loading={saving} onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
