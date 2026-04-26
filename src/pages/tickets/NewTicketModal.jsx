import { useState, useEffect, useRef } from 'react'
import { zammadApi, T } from './shared'
import api from '../../services/api'

const AGENT_ROLES = ['admin', 'agent']

export default function NewTicketModal({ onCreated, onClose }) {
  const [title,      setTitle]      = useState('')
  const [body,       setBody]       = useState('')
  const [priorityId, setPriority]   = useState('2')
  const [groupId,    setGroup]      = useState('')
  const [ownerId,    setOwner]      = useState('')
  const [tags,       setTags]       = useState([])
  const [tagInput,   setTagInput]   = useState('')
  const [file,       setFile]       = useState(null)
  const [priorities, setPriorities] = useState([])
  const [groups,     setGroups]     = useState([])
  const [agents,     setAgents]     = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    Promise.all([
      zammadApi.getTicketPriorities(),
      zammadApi.getGroups(),
      api.getUsers(),
    ])
      .then(([p, g, u]) => {
        const pArr = Array.isArray(p) ? p : []
        const gArr = Array.isArray(g) ? g : []
        const uArr = Array.isArray(u) ? u.filter(x => AGENT_ROLES.includes(x.role)) : []
        setPriorities(pArr)
        setGroups(gArr)
        setAgents(uArr)
        const def = pArr.find(x => x.default_create)?.id || pArr[1]?.id || pArr[0]?.id
        if (def) setPriority(String(def))
        if (gArr[0]) setGroup(String(gArr[0].id))
      })
      .catch(() => {})
  }, [])

  const addTag = (e) => {
    e.preventDefault()
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
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
        group_id: Number(groupId) || undefined,
        ...(ownerId ? { owner_id: Number(ownerId) } : {}),
        tags: tags.join(',') || undefined,
      }
      const ticket = await zammadApi.createTicket(payload)
      if (file) await zammadApi.uploadAttachment(file).catch(() => {})
      onCreated(ticket)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

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
        {/* Modal header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>New Ticket</div>
        </div>

        {/* Scrollable body */}
        <form onSubmit={submit} style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>

          <Field label="Title *">
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief description" style={inp} />
          </Field>

          {/* Priority + Group */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Priority">
              <select value={priorityId} onChange={e => setPriority(e.target.value)} style={inp}>
                {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Group">
              <select value={groupId} onChange={e => setGroup(e.target.value)} style={inp}>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
          </div>

          {/* Assignee */}
          {agents.length > 0 && (
            <Field label="Assign to">
              <select value={ownerId} onChange={e => setOwner(e.target.value)} style={inp}>
                <option value="">Unassigned</option>
                {agents.map(a => (
                  <option key={a.id} value={a.zammad_user_id || a.id}>
                    {a.name || a.email}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Description *">
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Describe the issue…"
              rows={5}
              style={{ ...inp, resize: 'vertical' }}
            />
          </Field>

          {/* Tags */}
          <Field label="Tags">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {tags.map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: '#eef2ff', color: '#6366f1', fontSize: 12 }}>
                  {t}
                  <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))}
                    style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 11, padding: 0 }}>✕</button>
                </span>
              ))}
            </div>
            <form onSubmit={addTag} style={{ display: 'flex', gap: 6 }}>
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add tag…"
                style={{ ...inp, flex: 1, marginBottom: 0 }} />
              <button type="submit" style={smallBtn}>Add</button>
            </form>
          </Field>

          {/* Attachment */}
          <Field label="Attachment">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={() => fileRef.current?.click()} style={smallBtn}>Choose file</button>
              <span style={{ fontSize: 12, color: T.muted }}>{file ? file.name : 'No file chosen'}</span>
              {file && <button type="button" onClick={() => setFile(null)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 12 }}>✕</button>}
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
