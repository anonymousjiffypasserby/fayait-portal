import { useState, useEffect } from 'react'
import api from '../../services/api'
import {
  Modal, ConfirmModal, Field, inputStyle, selectStyle, btnStyle,
  PageHeader, Table, Td, ActionCell, LoadingRow, ErrorRow,
} from './shared'

const CATEGORY_TYPES = ['asset', 'accessory', 'consumable', 'component', 'license']

const TYPE_BADGE = {
  asset:       { bg: '#dbeafe', color: '#1d4ed8' },
  accessory:   { bg: '#dcfce7', color: '#166534' },
  consumable:  { bg: '#fef9c3', color: '#854d0e' },
  component:   { bg: '#f3e8ff', color: '#6b21a8' },
  license:     { bg: '#ffe4e6', color: '#9f1239' },
}

const EMPTY = { name: '', type: 'asset', notes: '', min_quantity: 0, notify_low_stock: false }

export default function CategoriesTab({ showToast }) {
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
    api.getCategories()
      .then(setRows)
      .catch(e => setFetchErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  const openAdd  = () => { setForm(EMPTY); setModal('add') }
  const openEdit = (row) => {
    setForm({ name: row.name, type: row.type || 'asset', notes: row.notes || '', min_quantity: row.min_quantity ?? 0, notify_low_stock: row.notify_low_stock ?? false })
    setModal(row)
  }
  const closeModal = () => { setModal(null); setSaving(false) }
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (modal === 'add') {
        const created = await api.createCategory(form)
        setRows(r => [...r, created].sort((a, b) => a.name.localeCompare(b.name)))
        showToast('Category added')
      } else {
        const updated = await api.updateCategory(modal.id, form)
        setRows(r => r.map(x => x.id === modal.id ? updated : x))
        showToast('Category updated')
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
      await api.deleteCategory(delTarget.id)
      setRows(r => r.filter(x => x.id !== delTarget.id))
      showToast('Category deleted')
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
      <PageHeader title="Categories" onAdd={openAdd} addLabel="Add Category" />

      <Table
        columns={['Name', 'Type', 'Notes', 'Min Qty']}
        empty={!loading && !fetchErr && rows.length === 0 ? 'No categories yet — add one above.' : null}
      >
        {loading && <LoadingRow cols={4} />}
        {fetchErr && <ErrorRow cols={4} message={fetchErr} />}
        {!loading && rows.map(row => {
          const badge = TYPE_BADGE[row.type] || { bg: '#f3f4f6', color: '#374151' }
          return (
            <tr key={row.id}>
              <Td>{row.name}</Td>
              <td style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                  fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color,
                  textTransform: 'capitalize',
                }}>{row.type}</span>
              </td>
              <Td muted={!row.notes}>{row.notes || '—'}</Td>
              <Td>{row.min_quantity ?? 0}</Td>
              <ActionCell onEdit={() => openEdit(row)} onDelete={() => { setDelTarget(row); setDelErr(null) }} />
            </tr>
          )
        })}
      </Table>

      {modal && (
        <Modal title={isEdit ? 'Edit Category' : 'Add Category'} onClose={closeModal} width={440}>
          <Field label="Name" required>
            <input style={inputStyle} value={form.name} onChange={set('name')} autoFocus />
          </Field>
          <Field label="Type" required>
            <select style={selectStyle} value={form.type} onChange={set('type')}>
              {CATEGORY_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} value={form.notes} onChange={set('notes')} />
          </Field>
          <Field label="Minimum stock quantity">
            <input style={inputStyle} type="number" min={0} value={form.min_quantity} onChange={e => setForm(f => ({ ...f, min_quantity: parseInt(e.target.value) || 0 }))} />
          </Field>
          <Field label="Notify when low stock">
            <input type="checkbox" checked={form.notify_low_stock} onChange={e => setForm(f => ({ ...f, notify_low_stock: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={closeModal} style={btnStyle('ghost')}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={btnStyle('primary')}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Category'}
            </button>
          </div>
        </Modal>
      )}

      {delTarget && (
        <ConfirmModal
          message={`Delete category "${delTarget.name}"? This cannot be undone.`}
          error={delErr}
          onConfirm={deleting ? undefined : handleDelete}
          onCancel={() => { setDelTarget(null); setDelErr(null) }}
        />
      )}
    </div>
  )
}
