import { useState, useEffect } from 'react'
import api from '../../services/api'
import {
  Modal, ConfirmModal, Field, inputStyle, btnStyle,
  PageHeader, Table, Td, ActionCell, LoadingRow, ErrorRow, SyncBadge,
} from './shared'

const EMPTY = { name: '', address: '' }

export default function LocationsTab({ showToast }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState(null)
  const [modal, setModal]     = useState(null)   // null | 'add' | row-object
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [delTarget, setDelTarget] = useState(null)  // row
  const [delErr, setDelErr]   = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.getLocations()
      .then(setRows)
      .catch(e => setFetchErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  const openAdd  = () => { setForm(EMPTY); setModal('add') }
  const openEdit = (row) => { setForm({ name: row.name, address: row.address || '' }); setModal(row) }
  const closeModal = () => { setModal(null); setSaving(false) }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (modal === 'add') {
        const created = await api.createLocation(form)
        setRows(r => [...r, created].sort((a, b) => a.name.localeCompare(b.name)))
        showToast('Location added')
      } else {
        const updated = await api.updateLocation(modal.id, form)
        setRows(r => r.map(x => x.id === modal.id ? updated : x))
        showToast('Location updated')
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
      await api.deleteLocation(delTarget.id)
      setRows(r => r.filter(x => x.id !== delTarget.id))
      showToast('Location deleted')
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
      <PageHeader title="Locations" onAdd={openAdd} addLabel="Add Location" />

      <Table columns={['Name', 'Address', 'Sync']} empty={!loading && !fetchErr && rows.length === 0 ? 'No locations yet — add one above.' : null}>
        {loading && <LoadingRow cols={3} />}
        {fetchErr && <ErrorRow cols={3} message={fetchErr} />}
        {!loading && rows.map(row => (
          <tr key={row.id}>
            <Td>{row.name}</Td>
            <Td muted={!row.address}>{row.address || '—'}</Td>
            <Td>
              <SyncBadge
                syncStatus={row.sync_status}
                entity="location"
                id={row.id}
                onRetried={updated => setRows(r => r.map(x => x.id === updated.id ? { ...x, ...updated } : x))}
              />
            </Td>
            <ActionCell onEdit={() => openEdit(row)} onDelete={() => { setDelTarget(row); setDelErr(null) }} />
          </tr>
        ))}
      </Table>

      {modal && (
        <Modal title={isEdit ? 'Edit Location' : 'Add Location'} onClose={closeModal}>
          <Field label="Name" required>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </Field>
          <Field label="Address">
            <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={closeModal} style={btnStyle('ghost')}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={btnStyle('primary')}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Location'}
            </button>
          </div>
        </Modal>
      )}

      {delTarget && (
        <ConfirmModal
          message={`Delete location "${delTarget.name}"? This cannot be undone.`}
          error={delErr}
          onConfirm={deleting ? undefined : handleDelete}
          onCancel={() => { setDelTarget(null); setDelErr(null) }}
        />
      )}
    </div>
  )
}
