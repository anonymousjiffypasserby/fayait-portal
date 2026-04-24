import { useState, useEffect, useCallback } from 'react'
import { hrApi } from '../hr/shared'
import {
  Modal, ConfirmModal, Field, inputStyle, btnStyle,
  PageHeader, Table, Td, ActionCell, LoadingRow, ErrorRow,
} from './shared'

const EMPTY = { name: '', description: '', rate_type: 'hourly', rate_amount: '', currency: 'SRD', overtime_rate: '' }

export default function JobFunctionsTab({ showToast }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState(null)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const [delErr, setDelErr] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    hrApi.getJobFunctions()
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(e => setFetchErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setForm(EMPTY); setModal('add') }
  const openEdit = (row) => {
    setForm({ name: row.name || '', description: row.description || '', rate_type: row.rate_type || 'hourly', rate_amount: row.rate_amount ?? '', currency: row.currency || 'SRD', overtime_rate: row.overtime_rate ?? '' })
    setModal(row)
  }
  const closeModal = () => { setModal(null); setSaving(false) }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = { name: form.name.trim(), description: form.description || null, rate_type: form.rate_type, rate_amount: parseFloat(form.rate_amount) || 0, currency: form.currency || 'SRD', overtime_rate: parseFloat(form.overtime_rate) || 0 }
    try {
      if (modal === 'add') await hrApi.createJobFunction(payload)
      else await hrApi.updateJobFunction(modal.id, payload)
      showToast(modal === 'add' ? 'Job function added' : 'Job function updated')
      closeModal()
      load()
    } catch (e) {
      showToast(e.message, 'error')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await hrApi.deleteJobFunction(delTarget.id)
      showToast('Job function deleted')
      setDelTarget(null)
      setDelErr(null)
      load()
    } catch (e) {
      setDelErr(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isEdit = modal && modal !== 'add'

  return (
    <div>
      <PageHeader title="Job Functions" onAdd={openAdd} addLabel="Add Job Function" />

      <Table columns={['Name', 'Rate Type', 'Rate', 'Currency', 'Employees']} empty={!loading && !fetchErr && rows.length === 0 ? 'No job functions yet.' : null}>
        {loading && <LoadingRow cols={5} />}
        {fetchErr && <ErrorRow cols={5} message={fetchErr} />}
        {!loading && rows.map(row => (
          <tr key={row.id}>
            <Td>
              <div>{row.name}</div>
              {row.description && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{row.description}</div>}
            </Td>
            <Td muted>{row.rate_type || '—'}</Td>
            <Td>{row.rate_amount != null ? parseFloat(row.rate_amount).toFixed(2) : '—'}</Td>
            <Td muted>{row.currency || 'SRD'}</Td>
            <Td muted>{row.employee_count ?? 0}</Td>
            <ActionCell onEdit={() => openEdit(row)} onDelete={() => { setDelTarget(row); setDelErr(null) }} />
          </tr>
        ))}
      </Table>

      {modal && (
        <Modal title={isEdit ? 'Edit Job Function' : 'Add Job Function'} onClose={closeModal}>
          <Field label="Name" required>
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
          </Field>
          <Field label="Description">
            <input style={inputStyle} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Rate Type">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.rate_type} onChange={e => set('rate_type', e.target.value)}>
                <option value="hourly">Hourly</option>
                <option value="salary">Salary (yearly)</option>
              </select>
            </Field>
            <Field label="Rate Amount">
              <input style={inputStyle} type="number" min="0" step="0.01" value={form.rate_amount} onChange={e => set('rate_amount', e.target.value)} placeholder="0.00" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Currency">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.currency} onChange={e => set('currency', e.target.value)}>
                <option value="SRD">SRD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </Field>
            <Field label="Overtime Rate">
              <input style={inputStyle} type="number" min="0" step="0.01" value={form.overtime_rate} onChange={e => set('overtime_rate', e.target.value)} placeholder="0.00" />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={closeModal} style={btnStyle('ghost')}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={btnStyle('primary')}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Job Function'}
            </button>
          </div>
        </Modal>
      )}

      {delTarget && (
        <ConfirmModal
          message={`Delete job function "${delTarget.name}"? This cannot be undone.`}
          error={delErr}
          onConfirm={deleting ? undefined : handleDelete}
          onCancel={() => { setDelTarget(null); setDelErr(null) }}
        />
      )}
    </div>
  )
}
