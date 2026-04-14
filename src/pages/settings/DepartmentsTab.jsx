import { useState, useEffect } from 'react'
import api from '../../services/api'
import {
  Modal, ConfirmModal, Field, inputStyle, btnStyle,
  PageHeader, Table, Td, ActionCell, LoadingRow, ErrorRow,
} from './shared'

const EMPTY = { name: '' }

export default function DepartmentsTab({ showToast }) {
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
    api.getDepartments()
      .then(setRows)
      .catch(e => setFetchErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  const openAdd  = () => { setForm(EMPTY); setModal('add') }
  const openEdit = (row) => { setForm({ name: row.name }); setModal(row) }
  const closeModal = () => { setModal(null); setSaving(false) }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (modal === 'add') {
        const created = await api.createDepartment(form)
        setRows(r => [...r, created].sort((a, b) => a.name.localeCompare(b.name)))
        showToast('Department added')
      } else {
        const updated = await api.updateDepartment(modal.id, form)
        setRows(r => r.map(x => x.id === modal.id ? updated : x))
        showToast('Department updated')
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
      await api.deleteDepartment(delTarget.id)
      setRows(r => r.filter(x => x.id !== delTarget.id))
      showToast('Department deleted')
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
      <PageHeader title="Departments" onAdd={openAdd} addLabel="Add Department" />

      <Table columns={['Name']} empty={!loading && !fetchErr && rows.length === 0 ? 'No departments yet — add one above.' : null}>
        {loading && <LoadingRow cols={1} />}
        {fetchErr && <ErrorRow cols={1} message={fetchErr} />}
        {!loading && rows.map(row => (
          <tr key={row.id}>
            <Td>{row.name}</Td>
            <ActionCell onEdit={() => openEdit(row)} onDelete={() => { setDelTarget(row); setDelErr(null) }} />
          </tr>
        ))}
      </Table>

      {modal && (
        <Modal title={isEdit ? 'Edit Department' : 'Add Department'} onClose={closeModal} width={400}>
          <Field label="Name" required>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={closeModal} style={btnStyle('ghost')}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={btnStyle('primary')}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Department'}
            </button>
          </div>
        </Modal>
      )}

      {delTarget && (
        <ConfirmModal
          message={`Delete department "${delTarget.name}"? This cannot be undone.`}
          error={delErr}
          onConfirm={deleting ? undefined : handleDelete}
          onCancel={() => { setDelTarget(null); setDelErr(null) }}
        />
      )}
    </div>
  )
}
