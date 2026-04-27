import { useState, useEffect, useRef } from 'react'
import { zammadApi, T } from './shared'
import { getTicketSettings } from './ticketSettings'

const BASE = import.meta.env.VITE_API_URL || 'https://api.fayait.com'
const apiGet = (path) =>
  fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('faya_token')}` },
  }).then(r => r.ok ? r.json() : []).catch(() => [])

const PRIORITIES = [
  { id: 1, name: 'Low' },
  { id: 2, name: 'Normal' },
  { id: 3, name: 'High' },
  { id: 4, name: 'Emergency' },
]

const isZammadAgent = (u) => Array.isArray(u.role_ids) && u.role_ids.some(id => id === 1 || id === 2)

export default function NewTicketModal({ onCreated, onClose }) {
  const [title,       setTitle]      = useState('')
  const [body,        setBody]       = useState('')
  const [priorityId,  setPriority]   = useState('2')
  const [ownerId,     setOwner]      = useState('')
  const [categories,  setCategories] = useState([])
  const [deptId,      setDeptId]     = useState('')
  const [contactId,   setContactId]  = useState('')
  const [file,        setFile]       = useState(null)
  const [agents,      setAgents]     = useState([])
  const [departments, setDepartments]= useState([])
  const [allUsers,    setAllUsers]   = useState([])
  const [submitting,  setSubmitting] = useState(false)
  const [error,       setError]      = useState(null)
  const fileRef = useRef(null)

  const predefinedCategories = getTicketSettings().predefinedTags

  useEffect(() => {
    zammadApi.getUsers()
      .then(u => setAgents(Array.isArray(u) ? u.filter(isZammadAgent) : []))
      .catch(() => {})
    apiGet('/api/departments').then(d => setDepartments(Array.isArray(d) ? d : []))
    apiGet('/api/users').then(u => setAllUsers(Array.isArray(u) ? u : []))
  }, [])

  const selectedDept    = departments.find(d => d.id === deptId)
  const deptUsers       = deptId ? allUsers.filter(u => u.department_id === deptId) : []

  const toggleCategory = (cat) => {
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !body.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const allTags = [...categories]
      if (selectedDept) allTags.push(`dept:${selectedDept.name}`)
      if (contactId) {
        const contact = allUsers.find(u => u.id === contactId)
        if (contact) allTags.push(`contact:${contact.name}`)
      }

      const payload = {
        title: title.trim(),
        article: { body: body.trim(), type: 'note', internal: false },
        priority_id: Number(priorityId) || 2,
        ...(ownerId     ? { owner_id: Number(ownerId) } : {}),
        ...(allTags.length ? { tags: allTags.join(',') } : {}),
      }
      const ticket = await zammadApi.createTicket(payload)
      if (file) await zammadApi.uploadAttachment(file).catch(() => {})
      onCreated(ticket)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const canSubmit = title.trim() && body.trim() && !submitting

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, fontFamily: T.font,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>New Ticket</div>
        </div>

        {/* Body */}
        <form onSubmit={submit} style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>

          <Field label="Title *">
            <input
              autoFocus value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Brief description"
              style={inp}
            />
          </Field>

          <Field label="Description *">
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Describe the issue…"
              rows={4}
              style={{ ...inp, resize: 'vertical' }}
            />
          </Field>

          {/* Priority + Assignee */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Priority">
              <select value={priorityId} onChange={e => setPriority(e.target.value)} style={inp}>
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            {agents.length > 0 && (
              <Field label="Assign to agent">
                <select value={ownerId} onChange={e => setOwner(e.target.value)} style={inp}>
                  <option value="">Unassigned</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.firstname} {a.lastname}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {/* Department + Contact user */}
          <div style={{ display: 'grid', gridTemplateColumns: deptId && deptUsers.length > 0 ? '1fr 1fr' : '1fr', gap: 12 }}>
            <Field label="Department">
              <select
                value={deptId}
                onChange={e => { setDeptId(e.target.value); setContactId('') }}
                style={inp}
              >
                <option value="">— None —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            {deptId && deptUsers.length > 0 && (
              <Field label="Contact user">
                <select value={contactId} onChange={e => setContactId(e.target.value)} style={inp}>
                  <option value="">— None —</option>
                  {deptUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
            )}
          </div>

          {/* Category (predefined tags) */}
          {predefinedCategories.length > 0 && (
            <Field label="Category">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {predefinedCategories.map(cat => {
                  const active = categories.includes(cat)
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                        fontFamily: T.font, fontWeight: active ? 600 : 400,
                        border: `1px solid ${active ? '#6366f1' : T.border}`,
                        background: active ? '#eef2ff' : '#fafafa',
                        color: active ? '#6366f1' : T.muted,
                        transition: 'all 0.1s',
                      }}
                    >
                      {active ? '✓ ' : ''}{cat}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          {/* Attachment */}
          <Field label="Attachment">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={() => fileRef.current?.click()} style={smallBtn}>Choose file</button>
              <span style={{ fontSize: 12, color: T.muted }}>{file ? file.name : 'No file chosen'}</span>
              {file && (
                <button type="button" onClick={() => setFile(null)}
                  style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 12 }}>✕</button>
              )}
            </div>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0] || null)} />
          </Field>

          {error && <div style={{ fontSize: 12, color: T.red, marginBottom: 12 }}>{error}</div>}
        </form>

        {/* Footer */}
        <div style={{
          padding: '12px 24px', borderTop: `1px solid ${T.border}`,
          display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0,
        }}>
          <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              padding: '8px 22px', borderRadius: 7, border: 'none', fontSize: 13,
              fontWeight: 600, fontFamily: T.font, cursor: canSubmit ? 'pointer' : 'default',
              background: canSubmit ? '#6366f1' : '#e5e7eb',
              color: canSubmit ? '#fff' : T.muted,
            }}
          >
            {submitting ? 'Creating…' : 'Create Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      {children}
    </div>
  )
}

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '8px 11px',
  borderRadius: 7, border: `1px solid ${T.border}`,
  fontSize: 13, fontFamily: T.font, color: T.navy, outline: 'none',
  background: '#fafafa', marginBottom: 0,
}

const smallBtn = {
  padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  background: '#eef2ff', color: '#6366f1', border: 'none', cursor: 'pointer',
  fontFamily: T.font,
}

const cancelBtn = {
  padding: '8px 18px', borderRadius: 7, border: `1px solid ${T.border}`,
  fontSize: 13, fontWeight: 500, background: '#fff', color: T.navy,
  cursor: 'pointer', fontFamily: T.font,
}
