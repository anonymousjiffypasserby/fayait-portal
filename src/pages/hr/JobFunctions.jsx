import { useState, useEffect, useCallback } from 'react'
import { T, hrApi, Spinner, EmptyState, Btn, Modal, Field, Input, Select, Textarea, ErrMsg } from './shared'

const EMPTY = { title: '', description: '', department: '', rate_type: 'salary', rate_amount: '' }

export default function JobFunctions() {
  const [jfs, setJfs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'add' | item
  const [form, setForm]   = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]     = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    hrApi.getJobFunctions()
      .then(d => setJfs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setForm(EMPTY); setErr(null); setModal('add') }
  const openEdit = (jf) => {
    setForm({ title: jf.title, description: jf.description || '', department: jf.department || '', rate_type: jf.rate_type || 'salary', rate_amount: jf.rate_amount || '' })
    setErr(null)
    setModal(jf)
  }

  const save = async () => {
    if (!form.title) { setErr('Title is required'); return }
    setSaving(true); setErr(null)
    try {
      if (modal === 'add') await hrApi.createJobFunction(form)
      else await hrApi.updateJobFunction(modal.id, form)
      setModal(null); load()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    setDeleting(id)
    try { await hrApi.deleteJobFunction(id); load() }
    catch (e) { setErr(e.message) }
    finally { setDeleting(null) }
  }

  const F = (field) => ({ value: form[field], onChange: e => setForm(f => ({ ...f, [field]: e.target.value })) })

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>Job Functions</div>
        <Btn variant="primary" onClick={openAdd}>+ Add Job Function</Btn>
      </div>
      <ErrMsg msg={err} />

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={24} /></div>
        : jfs.length === 0
          ? <EmptyState icon="🏷" title="No job functions" sub="Create job functions to assign to employees." />
          : (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafbfc', borderBottom: `1px solid ${T.border}` }}>
                    {['Title', 'Department', 'Rate Type', 'Rate', 'Employees', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jfs.map((jf, i) => (
                    <tr key={jf.id} style={{ borderBottom: i < jfs.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>{jf.title}</div>
                        {jf.description && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{jf.description}</div>}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: T.muted }}>{jf.department || '—'}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12, textTransform: 'capitalize', color: T.muted }}>{jf.rate_type}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13 }}>
                        {jf.rate_amount ? `$${parseFloat(jf.rate_amount).toFixed(2)}/${jf.rate_type === 'hourly' ? 'hr' : 'yr'}` : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: T.muted }}>{jf.employee_count ?? 0}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Btn variant="ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => openEdit(jf)}>Edit</Btn>
                          <Btn variant="danger" style={{ fontSize: 11, padding: '3px 8px' }}
                            loading={deleting === jf.id}
                            onClick={() => del(jf.id)}>
                            Delete
                          </Btn>
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
        <Modal title={modal === 'add' ? 'Add Job Function' : 'Edit Job Function'} onClose={() => setModal(null)}>
          <ErrMsg msg={err} />
          <Field label="Title" required><Input {...F('title')} placeholder="e.g. Software Engineer" /></Field>
          <Field label="Description"><Textarea {...F('description')} placeholder="Optional description…" /></Field>
          <Field label="Department"><Input {...F('department')} placeholder="e.g. Engineering" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Rate Type">
              <Select {...F('rate_type')}>
                <option value="salary">Salary (per year)</option>
                <option value="hourly">Hourly (per hour)</option>
              </Select>
            </Field>
            <Field label="Rate Amount">
              <Input type="number" min="0" step="0.01" {...F('rate_amount')} placeholder="0.00" />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" loading={saving} onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
