import { useState, useEffect } from 'react'
import api from '../../services/api'
import {
  Modal, ConfirmModal, Field, inputStyle, btnStyle,
  PageHeader, Table, Td, ActionCell, LoadingRow, ErrorRow, SyncBadge,
} from './shared'

const EMPTY = { name: '', url: '', support_url: '', support_phone: '', support_email: '' }

export default function ManufacturersTab({ showToast }) {
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
    api.getManufacturers()
      .then(setRows)
      .catch(e => setFetchErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  const openAdd  = () => { setForm(EMPTY); setModal('add') }
  const openEdit = (row) => {
    setForm({
      name:          row.name || '',
      url:           row.url || '',
      support_url:   row.support_url || '',
      support_phone: row.support_phone || '',
      support_email: row.support_email || '',
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
        const created = await api.createManufacturer(form)
        setRows(r => [...r, created].sort((a, b) => a.name.localeCompare(b.name)))
        showToast('Manufacturer added')
      } else {
        const updated = await api.updateManufacturer(modal.id, form)
        setRows(r => r.map(x => x.id === modal.id ? updated : x))
        showToast('Manufacturer updated')
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
      await api.deleteManufacturer(delTarget.id)
      setRows(r => r.filter(x => x.id !== delTarget.id))
      showToast('Manufacturer deleted')
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
      <PageHeader title="Manufacturers" onAdd={openAdd} addLabel="Add Manufacturer" />

      <Table
        columns={['Name', 'Website', 'Support Email', 'Support Phone', 'Sync']}
        empty={!loading && !fetchErr && rows.length === 0 ? 'No manufacturers yet — add one above.' : null}
      >
        {loading && <LoadingRow cols={5} />}
        {fetchErr && <ErrorRow cols={5} message={fetchErr} />}
        {!loading && rows.map(row => (
          <tr key={row.id}>
            <Td>{row.name}</Td>
            <Td muted={!row.url}>{row.url || '—'}</Td>
            <Td muted={!row.support_email}>{row.support_email || '—'}</Td>
            <Td muted={!row.support_phone}>{row.support_phone || '—'}</Td>
            <Td>
              <SyncBadge
                syncStatus={row.sync_status}
                entity="manufacturer"
                id={row.id}
                onRetried={updated => setRows(r => r.map(x => x.id === updated.id ? { ...x, ...updated } : x))}
              />
            </Td>
            <ActionCell onEdit={() => openEdit(row)} onDelete={() => { setDelTarget(row); setDelErr(null) }} />
          </tr>
        ))}
      </Table>

      {modal && (
        <Modal title={isEdit ? 'Edit Manufacturer' : 'Add Manufacturer'} onClose={closeModal}>
          <Field label="Name" required>
            <input style={inputStyle} value={form.name} onChange={set('name')} autoFocus />
          </Field>
          <Field label="Website URL">
            <input style={inputStyle} value={form.url} onChange={set('url')} placeholder="https://" />
          </Field>
          <Field label="Support URL">
            <input style={inputStyle} value={form.support_url} onChange={set('support_url')} placeholder="https://" />
          </Field>
          <Field label="Support Phone">
            <input style={inputStyle} value={form.support_phone} onChange={set('support_phone')} />
          </Field>
          <Field label="Support Email">
            <input style={inputStyle} value={form.support_email} onChange={set('support_email')} type="email" />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={closeModal} style={btnStyle('ghost')}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={btnStyle('primary')}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Manufacturer'}
            </button>
          </div>
        </Modal>
      )}

      {delTarget && (
        <ConfirmModal
          message={`Delete manufacturer "${delTarget.name}"? This cannot be undone.`}
          error={delErr}
          onConfirm={deleting ? undefined : handleDelete}
          onCancel={() => { setDelTarget(null); setDelErr(null) }}
        />
      )}
    </div>
  )
}
