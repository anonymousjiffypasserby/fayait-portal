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
  const settings = getTicketSettings()
  const [title,        setTitle]       = useState('')
  const [body,         setBody]        = useState('')
  const [priorityId,   setPriority]    = useState('2')
  const [ownerId,      setOwner]       = useState('')
  const [categories,   setCategories]  = useState([])
  const [deptId,       setDeptId]      = useState('')
  const [contactId,    setContactId]   = useState('')
  const [file,         setFile]        = useState(null)
  const [sendEmail,    setSendEmail]   = useState(false)
  const [emailTo,      setEmailTo]     = useState('')
  const [agents,       setAgents]      = useState([])
  const [departments,  setDepartments] = useState([])
  const [allUsers,     setAllUsers]    = useState([])
  const [submitting,   setSubmitting]  = useState(false)
  const [error,        setError]       = useState(null)
  const fileRef = useRef(null)

  const predefinedCategories = settings.predefinedTags
  const templates = settings.templates || []

  useEffect(() => {
    zammadApi.getUsers()
      .then(u => setAgents(Array.isArray(u) ? u.filter(isZammadAgent) : []))
      .catch(() => {})
    apiGet('/api/departments').then(d => setDepartments(Array.isArray(d) ? d : []))
    apiGet('/api/users').then(u => setAllUsers(Array.isArray(u) ? u : []))
  }, [])

  const customerList = deptId
    ? allUsers.filter(u => String(u.department_id) === String(deptId))
    : allUsers

  // When a contact is selected and sendEmail is on, pre-fill emailTo
  useEffect(() => {
    if (!sendEmail || !contactId) return
    const user = allUsers.find(u => String(u.id) === String(contactId))
    if (user?.email) setEmailTo(user.email)
  }, [contactId, sendEmail])

  const applyTemplate = (tpl) => {
    if (tpl.title)       setTitle(tpl.title)
    if (tpl.body)        setBody(tpl.body)
    if (tpl.priority_id) setPriority(String(tpl.priority_id))
    if (Array.isArray(tpl.categories)) setCategories(tpl.categories)
  }

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

      const selectedDept = departments.find(d => String(d.id) === String(deptId))
      if (selectedDept) allTags.push(`dept:${selectedDept.name}`)

      if (contactId) {
        const contact = allUsers.find(u => String(u.id) === String(contactId))
        if (contact) allTags.push(`contact:${contact.name}`)
      }

      const article = sendEmail
        ? { body: body.trim(), type: 'email', to: emailTo, internal: false }
        : { body: body.trim(), type: 'web', internal: false }

      const payload = {
        title: title.trim(),
        article,
        priority_id: Number(priorityId) || 2,
        ...(ownerId    ? { owner_id: Number(ownerId) } : {}),
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
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 1000, fontFamily: T.font,
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px 12px 0 0', width: '100%', maxWidth: 560,
        maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>New Ticket</div>
          {templates.length > 0 && (
            <select
              defaultValue=""
              onChange={e => { if (e.target.value) { applyTemplate(templates.find(t => t.id === e.target.value) || {}); e.target.value = '' } }}
              style={{
                padding: '5px 10px', borderRadius: 6, fontSize: 12, fontFamily: T.font,
                border: `1px solid #6366f1`, color: '#6366f1', background: '#eef2ff',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="" disabled>Use template…</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
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

          {/* Department */}
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

          {/* Customer */}
          <Field label="Customer">
            <select
              value={contactId}
              onChange={e => setContactId(e.target.value)}
              style={inp}
            >
              <option value="">— None —</option>
              {customerList.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </Field>

          {/* Email notification toggle */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div
                onClick={() => setSendEmail(v => !v)}
                style={{
                  width: 34, height: 18, borderRadius: 9, position: 'relative',
                  background: sendEmail ? '#6366f1' : '#d1d5db', transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: sendEmail ? 18 : 2,
                  width: 14, height: 14, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
              <span style={{ fontSize: 13, color: T.navy, fontFamily: T.font }}>
                Send email notification to customer
              </span>
            </label>
            {sendEmail && (
              <input
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                placeholder="Customer email address"
                type="email"
                style={{ ...inp, marginTop: 8 }}
              />
            )}
          </div>

          {/* Category */}
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

          {/* GDPR notice */}
          <div style={{
            fontSize: 11, color: T.muted, lineHeight: 1.5,
            background: '#f8fafc', borderRadius: 6, padding: '8px 10px',
            border: `1px solid ${T.border}`, marginBottom: 4,
          }}>
            Your ticket data (name, contact details, message content) will be processed by our support team to resolve your request.
            Data is retained per our{' '}
            {getTicketSettings().privacyPolicyUrl
              ? <a href={getTicketSettings().privacyPolicyUrl} target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>Privacy Policy</a>
              : 'Privacy Policy'
            }.{' '}
            You may request access, correction, or deletion of your data at any time.
          </div>
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
              background: canSubmit ? (sendEmail ? '#0ea5e9' : '#6366f1') : '#e5e7eb',
              color: canSubmit ? '#fff' : T.muted,
            }}
          >
            {submitting ? 'Creating…' : sendEmail ? 'Create & Send Email' : 'Create Ticket'}
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
