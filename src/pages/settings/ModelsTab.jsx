import { useState, useEffect } from 'react'
import api from '../../services/api'
import {
  Modal, ConfirmModal, Field, inputStyle, selectStyle, btnStyle,
  PageHeader, Table, Td, ActionCell, LoadingRow, ErrorRow,
} from './shared'

const EMPTY = { name: '', manufacturer_id: '', category: '', eol_date: '', notes: '' }

export default function ModelsTab({ showToast }) {
  const [rows, setRows]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [fetchErr, setFetchErr]     = useState(null)
  const [manufacturers, setMfrs]   = useState([])
  const [categories, setCategories] = useState([])
  const [modal, setModal]           = useState(null)
  const [form, setForm]             = useState(EMPTY)
  const [saving, setSaving]         = useState(false)
  const [delTarget, setDelTarget]   = useState(null)
  const [delErr, setDelErr]         = useState(null)
  const [deleting, setDeleting]     = useState(false)

  useEffect(() => {
    Promise.all([
      api.getModels(),
      api.getManufacturers(),
      api.getCategories('asset'),
    ]).then(([m, mfrs, cats]) => {
      setRows(m)
      setMfrs(mfrs)
      setCategories(cats)
    }).catch(e => setFetchErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  const mfrName = (id) => manufacturers.find(m => m.id === id)?.name || '—'

  const openAdd  = () => { setForm(EMPTY); setModal('add') }
  const openEdit = (row) => {
    setForm({
      name:            row.name || '',
      manufacturer_id: row.manufacturer_id || '',
      category:        row.category || '',
      eol_date:        row.eol_date ? row.eol_date.slice(0, 10) : '',
      notes:           row.notes || '',
    })
    setModal(row)
  }
  const closeModal = () => { setModal(null); setSaving(false) }
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        manufacturer_id: form.manufacturer_id || null,
        category: form.category || null,
        eol_date: form.eol_date || null,
        notes: form.notes || null,
      }
      if (modal === 'add') {
        const created = await api.createModel(payload)
        setRows(r => [...r, created].sort((a, b) => a.name.localeCompare(b.name)))
        showToast('Model added')
      } else {
        const updated = await api.updateModel(modal.id, payload)
        setRows(r => r.map(x => x.id === modal.id ? updated : x))
        showToast('Model updated')
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
      await api.deleteModel(delTarget.id)
      setRows(r => r.filter(x => x.id !== delTarget.id))
      showToast('Model deleted')
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
      <PageHeader title="Models" onAdd={openAdd} addLabel="Add Model" />

      <Table
        columns={['Name', 'Manufacturer', 'Category', 'EOL Date']}
        empty={!loading && !fetchErr && rows.length === 0 ? 'No models yet — add one above.' : null}
      >
        {loading && <LoadingRow cols={4} />}
        {fetchErr && <ErrorRow cols={4} message={fetchErr} />}
        {!loading && rows.map(row => (
          <tr key={row.id}>
            <Td>{row.name}</Td>
            <Td muted={!row.manufacturer_id}>{mfrName(row.manufacturer_id)}</Td>
            <Td muted={!row.category}>{row.category || '—'}</Td>
            <Td muted={!row.eol_date}>{row.eol_date ? row.eol_date.slice(0, 10) : '—'}</Td>
            <ActionCell onEdit={() => openEdit(row)} onDelete={() => { setDelTarget(row); setDelErr(null) }} />
          </tr>
        ))}
      </Table>

      {modal && (
        <Modal title={isEdit ? 'Edit Model' : 'Add Model'} onClose={closeModal}>
          <Field label="Name" required>
            <input style={inputStyle} value={form.name} onChange={set('name')} autoFocus />
          </Field>
          <Field label="Manufacturer">
            <select style={selectStyle} value={form.manufacturer_id} onChange={set('manufacturer_id')}>
              <option value="">— Select manufacturer —</option>
              {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select style={selectStyle} value={form.category} onChange={set('category')}>
              <option value="">— Select category —</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="EOL Date">
            <input style={inputStyle} type="date" value={form.eol_date} onChange={set('eol_date')} />
          </Field>
          <Field label="Notes">
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} value={form.notes} onChange={set('notes')} />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={closeModal} style={btnStyle('ghost')}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={btnStyle('primary')}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Model'}
            </button>
          </div>
        </Modal>
      )}

      {delTarget && (
        <ConfirmModal
          message={`Delete model "${delTarget.name}"? This cannot be undone.`}
          error={delErr}
          onConfirm={deleting ? undefined : handleDelete}
          onCancel={() => { setDelTarget(null); setDelErr(null) }}
        />
      )}
    </div>
  )
}
