import { useState, useEffect } from 'react'
import api from '../../services/api'
import {
  Modal, ConfirmModal, Field, inputStyle, btnStyle,
  PageHeader, Table, Td, ActionCell, LoadingRow, ErrorRow,
} from './shared'

const EMPTY = { name: '', address: '', city: '', country: '', phone: '', email: '', url: '', notes: '' }

export default function SuppliersTab({ showToast }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState(null)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const [delErr, setDelErr]   = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.getSuppliers()
      .then(setRows)
      .catch(e => setFetchErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  const openAdd  = () => { setForm(EMPTY); setModal('add') }
  const openEdit = (row) => {
    setForm({
      name:    row.name    || '',
      address: row.address || '',
      city:    row.city    || '',
      country: row.country || '',
      phone:   row.phone   || '',
      email:   row.email   || '',
      url:     row.url     || '',
      notes:   row.notes   || '',
    })
    setModal(row)
  }
  const closeModal = () => { setModal(null); setSaving(false) }
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (modal === 'add') {
        const created = await api.createSupplier(form)
        setRows(r => [...r, created].sort((a, b) => a.name.localeCompare(b.name)))
        showToast('Supplier added')
      } else {
        const updated = await api.updateSupplier(modal.id, form)
        setRows(r => r.map(x => x.id === modal.id ? updated : x))
        showToast('Supplier updated')
      }
      closeModal()
    } catch (e) {
      showToast(e.message, 'error')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteSupplier(delTarget.id)
      setRows(r => r.filter(x => x.id !== delTarget.id))
      showToast('Supplier deleted')
      setDelTarget(null)
      setDelErr(null)
    } catch (e) {
      setDelErr(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const isEdit = modal && modal !== 'add'

  return (
    <div>
      <PageHeader title="Suppliers" onAdd={openAdd} addLabel="Add Supplier" />

      <Table
        columns={['Name', 'City', 'Country', 'Email', 'Phone']}
        empty={!loading && !fetchErr && rows.length === 0 ? 'No suppliers yet — add one above.' : null}
      >
        {loading && <LoadingRow cols={5} />}
        {fetchErr && <ErrorRow cols={5} message={fetchErr} />}
        {!loading && rows.map(row => (
          <tr key={row.id}>
            <Td>{row.name}</Td>
            <Td muted={!row.city}>{row.city || '—'}</Td>
            <Td muted={!row.country}>{row.country || '—'}</Td>
            <Td muted={!row.email}>{row.email || '—'}</Td>
            <Td muted={!row.phone}>{row.phone || '—'}</Td>
            <ActionCell onEdit={() => openEdit(row)} onDelete={() => { setDelTarget(row); setDelErr(null) }} />
          </tr>
        ))}
      </Table>

      {modal && (
        <Modal title={isEdit ? 'Edit Supplier' : 'Add Supplier'} onClose={closeModal} width={520}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Name" required>
                <input style={inputStyle} value={form.name} onChange={set('name')} autoFocus />
              </Field>
            </div>
            <Field label="Address">
              <input style={inputStyle} value={form.address} onChange={set('address')} />
            </Field>
            <Field label="City">
              <input style={inputStyle} value={form.city} onChange={set('city')} />
            </Field>
            <Field label="Country">
              <input style={inputStyle} value={form.country} onChange={set('country')} />
            </Field>
            <Field label="Phone">
              <input style={inputStyle} value={form.phone} onChange={set('phone')} />
            </Field>
            <Field label="Email">
              <input style={inputStyle} value={form.email} onChange={set('email')} type="email" />
            </Field>
            <Field label="Website URL">
              <input style={inputStyle} value={form.url} onChange={set('url')} placeholder="https://" />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Notes">
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} value={form.notes} onChange={set('notes')} />
              </Field>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={closeModal} style={btnStyle('ghost')}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={btnStyle('primary')}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Supplier'}
            </button>
          </div>
        </Modal>
      )}

      {delTarget && (
        <ConfirmModal
          message={`Delete supplier "${delTarget.name}"? This cannot be undone.`}
          error={delErr}
          onConfirm={deleting ? undefined : handleDelete}
          onCancel={() => { setDelTarget(null); setDelErr(null) }}
        />
      )}
    </div>
  )
}
