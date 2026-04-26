import { useState, useEffect } from 'react'
import { zammadApi, T } from './shared'

export default function NewTicketModal({ onCreated, onClose }) {
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [priorityId, setPriority] = useState('')
  const [groupId, setGroup]     = useState('')
  const [priorities, setPriorities] = useState([])
  const [groups, setGroups]     = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    Promise.all([zammadApi.getTicketPriorities(), zammadApi.getGroups()])
      .then(([p, g]) => {
        const pArr = Array.isArray(p) ? p : []
        const gArr = Array.isArray(g) ? g : []
        setPriorities(pArr)
        setGroups(gArr)
        if (pArr.length) setPriority(String(pArr.find(x => x.default_create)?.id || pArr[0].id))
        if (gArr.length) setGroup(String(gArr[0].id))
      })
      .catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !body.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const ticket = await zammadApi.createTicket({
        title: title.trim(),
        article: { body: body.trim(), type: 'note', internal: false },
        priority_id: Number(priorityId) || 2,
        group_id: Number(groupId) || undefined,
      })
      onCreated(ticket)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, fontFamily: T.font,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520,
        padding: '28px 28px 24px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 20 }}>
          New Ticket
        </div>

        <form onSubmit={submit}>
          <Field label="Title *">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              autoFocus
              style={inputStyle}
            />
          </Field>

          <Field label="Description *">
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Describe the issue in detail…"
              rows={5}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Priority">
              <select value={priorityId} onChange={e => setPriority(e.target.value)} style={inputStyle}>
                {priorities.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Group">
              <select value={groupId} onChange={e => setGroup(e.target.value)} style={inputStyle}>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </Field>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: T.red, marginBottom: 12 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
            <button
              type="submit"
              disabled={!title.trim() || !body.trim() || submitting}
              style={{
                padding: '8px 22px', borderRadius: 7, border: 'none', fontSize: 13,
                fontWeight: 600, fontFamily: T.font, cursor: 'pointer',
                background: !title.trim() || !body.trim() || submitting ? '#e5e7eb' : '#6366f1',
                color: !title.trim() || !body.trim() || submitting ? T.muted : '#fff',
              }}
            >
              {submitting ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '8px 11px',
  borderRadius: 7, border: `1px solid ${T.border}`,
  fontSize: 13, fontFamily: T.font, color: T.navy, outline: 'none',
  background: '#fafafa',
}

const cancelBtn = {
  padding: '8px 18px', borderRadius: 7, border: `1px solid ${T.border}`,
  fontSize: 13, fontWeight: 500, fontFamily: T.font,
  background: '#fff', color: T.navy, cursor: 'pointer',
}
