import { useState, useEffect, useCallback } from 'react'
import { T, hrApi, fmtTime, Spinner, EmptyState, Btn, Modal, Field, Input, ErrMsg } from './shared'

const PALETTE = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#6366f1','#f97316','#64748b']
const EMPTY = { name: '', start_time: '', end_time: '', break_minutes: '30', color: PALETTE[0] }

export default function ShiftTemplates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState(null)
  const [deleting, setDeleting]   = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    hrApi.getSettings()
      .then(s => setTemplates(s.shift_templates || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setForm(EMPTY); setErr(null); setModal('add') }
  const openEdit = (t) => {
    setForm({ name: t.name, start_time: t.start_time?.slice(0, 5) || '', end_time: t.end_time?.slice(0, 5) || '', break_minutes: String(t.break_minutes ?? 30), color: t.color || PALETTE[0] })
    setErr(null); setModal(t)
  }

  const hours = (s, e, brk) => {
    if (!s || !e) return null
    const [sh, sm] = s.split(':').map(Number)
    const [eh, em] = e.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm) - (parseInt(brk) || 0)
    return (mins / 60).toFixed(1)
  }

  const save = async () => {
    if (!form.name || !form.start_time || !form.end_time) { setErr('Name, start and end time required'); return }
    setSaving(true); setErr(null)
    try {
      const body = { ...form, break_minutes: parseInt(form.break_minutes) || 0 }
      if (modal === 'add') await hrApi.createShiftTpl(body)
      else await hrApi.updateShiftTpl(modal.id, body)
      setModal(null); load()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    setDeleting(id)
    try { await hrApi.deleteShiftTpl(id); load() }
    catch (e) { setErr(e.message) }
    finally { setDeleting(null) }
  }

  const F = (field) => ({ value: form[field], onChange: e => setForm(f => ({ ...f, [field]: e.target.value })) })

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>Shift Templates</div>
        <Btn variant="primary" onClick={openAdd}>+ Add Template</Btn>
      </div>
      <ErrMsg msg={err} />

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={24} /></div>
        : templates.length === 0
          ? <EmptyState icon="🕐" title="No shift templates" sub="Create templates to speed up scheduling." />
          : (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafbfc', borderBottom: `1px solid ${T.border}` }}>
                    {['', 'Name', 'Start', 'End', 'Break', 'Hours', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {templates.map((tpl, i) => {
                    const h = hours(tpl.start_time, tpl.end_time, tpl.break_minutes)
                    return (
                      <tr key={tpl.id} style={{ borderBottom: i < templates.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                        <td style={{ padding: '11px 14px', width: 20 }}>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', background: tpl.color || PALETTE[0] }} />
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500, color: T.navy }}>{tpl.name}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: T.muted }}>{fmtTime(tpl.start_time)}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: T.muted }}>{fmtTime(tpl.end_time)}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: T.muted }}>{tpl.break_minutes ?? 0} min</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500, color: T.navy }}>{h ? `${h}h` : '—'}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Btn variant="ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => openEdit(tpl)}>Edit</Btn>
                            <Btn variant="danger" style={{ fontSize: 11, padding: '3px 8px' }} loading={deleting === tpl.id} onClick={() => del(tpl.id)}>Delete</Btn>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
      }

      {modal && (
        <Modal title={modal === 'add' ? 'Add Shift Template' : 'Edit Shift Template'} onClose={() => setModal(null)}>
          <ErrMsg msg={err} />
          <Field label="Template Name" required><Input {...F('name')} placeholder="e.g. Morning Shift" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Start Time" required><Input type="time" {...F('start_time')} /></Field>
            <Field label="End Time" required><Input type="time" {...F('end_time')} /></Field>
          </div>
          <Field label="Break (minutes)"><Input type="number" min="0" {...F('break_minutes')} /></Field>
          <Field label="Color">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {PALETTE.map(c => (
                <div
                  key={c}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: form.color === c ? `3px solid ${T.navy}` : '3px solid transparent',
                    transition: 'border 0.1s',
                  }}
                />
              ))}
            </div>
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
