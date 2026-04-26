import { useState, useEffect, useRef } from 'react'
import { zammadApi, T } from './shared'
import { getTicketSettings } from './ticketSettings'

const PRIORITIES = [
  { id: 1, name: 'Low' },
  { id: 2, name: 'Normal' },
  { id: 3, name: 'High' },
  { id: 4, name: 'Emergency' },
]

const isZammadAgent = (u) => Array.isArray(u.role_ids) ? u.role_ids.some(id => id > 1) : false

export default function NewTicketModal({ onCreated, onClose }) {
  const [title,          setTitle]      = useState('')
  const [body,           setBody]       = useState('')
  const [priorityId,     setPriority]   = useState('2')
  const [ownerId,        setOwner]      = useState('')
  const [tags,           setTags]       = useState([])
  const [file,           setFile]       = useState(null)
  const [agents,         setAgents]     = useState([])
  const [defaultGroupId, setDefaultGroup] = useState(null)
  const [submitting,     setSubmitting] = useState(false)
  const [error,          setError]      = useState(null)
  const fileRef = useRef(null)

  const predefinedTags = getTicketSettings().predefinedTags

  useEffect(() => {
    // Fetch default group silently — Zammad requires group_id but we don't expose it in the UI
    zammadApi.getGroups()
      .then(g => { if (Array.isArray(g) && g[0]) setDefaultGroup(g[0].id) })
      .catch(() => {})
    zammadApi.getUsers()
      .then(u => setAgents(Array.isArray(u) ? u.filter(isZammadAgent) : []))
      .catch(() => {})
  }, [])

  const toggleTag = (tag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !body.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        title: title.trim(),
        article: { body: body.trim(), type: 'note', internal: false },
        priority_id: Number(priorityId) || 2,
        group_id: defaultGroupId || 1,
        ...(ownerId ? { owner_id: Number(ownerId) } : {}),
        ...(tags.length ? { tags: tags.join(',') } : {}),
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
        background: '#fff', borderRadius: 12, width: '100%', maxWidth: 540,
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
              rows={5}
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
              <Field label="Assign to">
                <select value={ownerId} onChange={e => setOwner(e.target.value)} style={inp}>
                  <option value="">Unassigned</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.firstname} {a.lastname}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {/* Tags — only show if predefined tags are configured */}
          {predefinedTags.length > 0 && (
            <Field label="Tags">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {predefinedTags.map(tag => {
                  const active = tags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                        fontFamily: T.font, fontWeight: active ? 600 : 400,
                        border: `1px solid ${active ? '#6366f1' : T.border}`,
                        background: active ? '#eef2ff' : '#fafafa',
                        color: active ? '#6366f1' : T.muted,
                        transition: 'all 0.1s',
                      }}
                    >
                      {active ? '✓ ' : ''}{tag}
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
