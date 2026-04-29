import { useState, useEffect } from 'react'
import { T, zammadApi, stateColor, priorityColor, fmtDateTime, slaStatus, SLA_COLORS, isNewTicket } from './shared'
import { useIsMobile } from '../../hooks/useIsMobile'
import { getTicketSettings } from './ticketSettings'
import ConversationTab   from './tabs/ConversationTab'
import DetailsTab        from './tabs/DetailsTab'
import KnowledgeBaseTab  from './tabs/KnowledgeBaseTab'

const BASE = import.meta.env.VITE_API_URL || 'https://api.fayait.com'
const apiGet = (path) =>
  fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('faya_token')}` },
  }).then(r => r.ok ? r.json() : []).catch(() => [])

// 'new' removed — set automatically by Zammad on creation, not manually
const STATES     = ['open', 'pending reminder', 'closed']
const PRIORITIES = [{ id: 1, name: 'Low' }, { id: 2, name: 'Normal' }, { id: 3, name: 'High' }, { id: 4, name: 'Emergency' }]
const TABS       = ['Conversation', 'Details', 'Knowledge Base']

// Zammad's individual-ticket GET may return state as a plain string, a capitalised
// string, or a nested object {id, name}. Normalise to the lowercase name string.
function resolveState(ticket) {
  if (!ticket) return ''
  if (typeof ticket.state === 'string') return ticket.state.toLowerCase()
  if (ticket.state?.name) return String(ticket.state.name).toLowerCase()
  // Last-resort: map state_id using Zammad's common defaults
  const MAP = { 1: 'new', 2: 'open', 3: 'pending reminder', 4: 'closed', 5: 'pending close' }
  return MAP[ticket.state_id] || ''
}

// Default pending_time: tomorrow at 8 am local time
function defaultPendingTime() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(8, 0, 0, 0)
  return d.toISOString().slice(0, 16) // "YYYY-MM-DDTHH:mm" for datetime-local input
}

const isZammadAgent = (u) => Array.isArray(u.role_ids) && u.role_ids.some(id => id === 1 || id === 2)

export default function DetailPanel({ ticketId, onClose, onUpdated, onTicketUpdated, isAdmin, isAgent }) {
  const isMobile = useIsMobile()
  const [ticket,      setTicket]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('Conversation')
  const [agents,      setAgents]      = useState([])
  const [departments, setDepartments] = useState([])
  const [allUsers,    setAllUsers]    = useState([])
  const [tags,        setTags]        = useState([])
  const [editTitle,   setEditTitle]   = useState(false)
  const [titleVal,    setTitleVal]    = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)
  const [deleting,     setDeleting]     = useState(false)
  const [anonymizing,  setAnonymizing]  = useState(false)
  const [kbInsert,     setKbInsert]     = useState('')
  const [pendingTime,  setPendingTime]  = useState(defaultPendingTime)

  const predefinedCategories = getTicketSettings().predefinedTags

  const load = () => {
    setLoading(true)
    Promise.all([
      zammadApi.getTicket(ticketId),
      zammadApi.getTicketTags(ticketId),
    ])
      .then(([t, tagData]) => {
        setTicket(t)
        setTitleVal(t.title || '')
        setTags(tagData?.tags || [])
        if (t.pending_time) {
          setPendingTime(new Date(t.pending_time).toISOString().slice(0, 16))
        }
      })
      .catch(() => setError('Failed to load ticket'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    zammadApi.getUsers()
      .then(users => setAgents(Array.isArray(users) ? users.filter(isZammadAgent) : []))
      .catch(() => {})
    apiGet('/api/departments').then(d => setDepartments(Array.isArray(d) ? d : []))
    apiGet('/api/users').then(u => setAllUsers(Array.isArray(u) ? u : []))
  }, [ticketId])

  // Derive dept/contact/category from tags
  const deptTag         = tags.find(t => t.startsWith('dept:'))
  const deptNameFromTag = deptTag ? deptTag.slice(5) : ''
  const currentDept     = departments.find(d => d.name === deptNameFromTag) || null
  const currentDeptId   = currentDept ? String(currentDept.id) : ''

  const contactTag         = tags.find(t => t.startsWith('contact:'))
  const contactNameFromTag = contactTag ? contactTag.slice(8) : ''
  // When a dept is selected, filter to its users; otherwise offer all users
  const contactPool    = currentDept
    ? allUsers.filter(u => String(u.department_id) === String(currentDept.id))
    : allUsers
  const currentContact   = allUsers.find(u => u.name === contactNameFromTag) || null
  const currentContactId = currentContact ? String(currentContact.id) : ''

  const currentCategories = tags.filter(t => !t.startsWith('dept:') && !t.startsWith('contact:') && !t.startsWith('gdpr:'))

  const patch = async (data) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await zammadApi.updateTicket(ticketId, data)
      setTicket(updated)
      setTitleVal(updated.title || '')
      // Merge tags from local state into the cache update (PUT response has no tags)
      onTicketUpdated?.({ ...updated, tags })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeptChange = async (newDeptId) => {
    const dept = departments.find(d => String(d.id) === newDeptId)
    const toRemove = tags.filter(t => t.startsWith('dept:') || t.startsWith('contact:'))
    await Promise.allSettled(toRemove.map(tag => zammadApi.removeTicketTag(ticketId, tag)))
    let newTags = tags.filter(t => !t.startsWith('dept:') && !t.startsWith('contact:'))
    if (dept) {
      const newTag = `dept:${dept.name}`
      await zammadApi.addTicketTag(ticketId, newTag).catch(() => {})
      newTags = [...newTags, newTag]
    }
    setTags(newTags)
    onTicketUpdated?.({ ...ticket, tags: newTags })
  }

  const handleContactChange = async (newUserId) => {
    const user = allUsers.find(u => String(u.id) === newUserId)
    const toRemove = tags.filter(t => t.startsWith('contact:'))
    await Promise.allSettled(toRemove.map(tag => zammadApi.removeTicketTag(ticketId, tag)))
    let newTags = tags.filter(t => !t.startsWith('contact:'))
    if (user) {
      const newTag = `contact:${user.name}`
      await zammadApi.addTicketTag(ticketId, newTag).catch(() => {})
      newTags = [...newTags, newTag]
    }
    setTags(newTags)
    onTicketUpdated?.({ ...ticket, tags: newTags })
  }

  const toggleCategory = async (cat) => {
    let newTags
    if (currentCategories.includes(cat)) {
      await zammadApi.removeTicketTag(ticketId, cat).catch(() => {})
      newTags = tags.filter(t => t !== cat)
    } else {
      await zammadApi.addTicketTag(ticketId, cat).catch(() => {})
      newTags = [...tags, cat]
    }
    setTags(newTags)
    onTicketUpdated?.({ ...ticket, tags: newTags })
  }

  const saveTitle = () => {
    setEditTitle(false)
    if (titleVal.trim() && titleVal.trim() !== ticket.title) patch({ title: titleVal.trim() })
  }

  // GDPR: processing restriction toggle (tag-based)
  const isRestricted  = tags.includes('gdpr:restricted')
  const isAnonymized  = tags.includes('gdpr:anonymized')

  const toggleRestriction = async () => {
    if (isRestricted) {
      await zammadApi.removeTicketTag(ticketId, 'gdpr:restricted').catch(() => {})
      const newTags = tags.filter(t => t !== 'gdpr:restricted')
      setTags(newTags)
      onTicketUpdated?.({ ...ticket, tags: newTags })
    } else {
      await zammadApi.addTicketTag(ticketId, 'gdpr:restricted').catch(() => {})
      const newTags = [...tags, 'gdpr:restricted']
      setTags(newTags)
      onTicketUpdated?.({ ...ticket, tags: newTags })
    }
  }

  // GDPR: anonymize — redact articles where possible, post audit note, tag ticket
  const handleAnonymize = async () => {
    if (!window.confirm(
      'Redact personal data from this ticket?\n\n' +
      '• The ticket title will be set to "[Anonymized]"\n' +
      '• Customer tag will be removed\n' +
      '• An audit note will be posted\n' +
      '• Article bodies will be redacted where the API permits\n\n' +
      'This cannot be undone.'
    )) return
    setAnonymizing(true)
    setError(null)
    try {
      const redactDate = new Date().toLocaleDateString('en-GB')
      const redactedBody = `[Content redacted – GDPR erasure request – ${redactDate}]`

      // Attempt to redact each article body
      const articles = await zammadApi.getTicketArticles(ticketId).catch(() => [])
      if (Array.isArray(articles)) {
        await Promise.allSettled(
          articles
            .filter(a => !a.internal || isAdmin) // only redact internal if admin
            .map(a => zammadApi.updateArticle(a.id, { body: redactedBody }).catch(() => null))
        )
      }

      // Post an internal audit note
      await zammadApi.createArticle({
        ticket_id: ticketId,
        body: `⚠️ GDPR erasure request processed on ${redactDate}. Customer personal data removed from ticket metadata. Article content redacted where API permitted. Review in Zammad admin for complete redaction if required.`,
        type: 'note', internal: true, sender: 'Agent',
      }).catch(() => {})

      // Remove contact tag, add anonymized marker
      const contactTags = tags.filter(t => t.startsWith('contact:'))
      await Promise.allSettled(contactTags.map(t => zammadApi.removeTicketTag(ticketId, t)))
      await zammadApi.addTicketTag(ticketId, 'gdpr:anonymized').catch(() => {})
      await zammadApi.addTicketTag(ticketId, 'gdpr:restricted').catch(() => {})

      // Update ticket title
      const updated = await zammadApi.updateTicket(ticketId, { title: '[Anonymized]' })
      const newTags = [...tags.filter(t => !t.startsWith('contact:')), 'gdpr:anonymized', 'gdpr:restricted']
      setTags(newTags)
      setTicket(updated)
      setTitleVal('[Anonymized]')
      onTicketUpdated?.({ ...updated, tags: newTags })
    } catch (err) {
      setError(err.message)
    } finally {
      setAnonymizing(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this ticket? This cannot be undone.')) return
    setDeleting(true)
    try {
      await zammadApi.deleteTicket(ticketId)
      onClose()
      onUpdated?.()
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <PanelShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: T.muted, fontSize: 13 }}>
          Loading…
        </div>
      </PanelShell>
    )
  }

  if (!ticket) {
    return (
      <PanelShell>
        <div style={{ padding: 24, color: T.red, fontSize: 13 }}>{error || 'Not found'}</div>
      </PanelShell>
    )
  }

  const ticketState  = resolveState(ticket)
  const sc           = stateColor(ticketState)
  const pc           = priorityColor(ticket.priority_id)
  const sla          = slaStatus({ ...ticket, state: ticketState })
  const slaC         = sla ? SLA_COLORS[sla.level] : null
  const showNewBadge = isNewTicket(ticket)

  return (
    <PanelShell>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${T.border}`,
        background: T.card, flexShrink: 0,
      }}>
        {/* GDPR banners */}
        {isRestricted && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6,
            padding: '6px 10px', marginBottom: 8, fontSize: 11, color: '#b91c1c',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            🔒 <strong>Processing Restricted (GDPR Art. 18)</strong> — do not act on this ticket data without authorisation.
          </div>
        )}
        {isAnonymized && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6,
            padding: '6px 10px', marginBottom: 8, fontSize: 11, color: '#92400e',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            ⚠️ <strong>Anonymized</strong> — personal data has been redacted from this ticket.
          </div>
        )}

        {/* Ticket # + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {isMobile && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 16, color: '#6366f1', cursor: 'pointer', padding: '2px 6px 2px 0', fontFamily: T.font, fontWeight: 600, flexShrink: 0 }}>
              ← Back
            </button>
          )}
          <span style={{ fontSize: 11, color: T.muted }}>#{ticket.number || ticket.id}</span>
          {showNewBadge && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 6,
              background: '#dcfce7', color: '#15803d', letterSpacing: 0.5,
            }}>NEW</span>
          )}
          <div style={{ flex: 1 }} />
          {saving && <span style={{ fontSize: 11, color: T.muted }}>Saving…</span>}
          {error && <span style={{ fontSize: 11, color: T.red, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{error}</span>}
          {ticketState !== 'closed' ? (
            <button onClick={() => patch({ state: 'closed' })} style={actionBtn('#1D9E75', '#f0fdf4')}>
              Close Ticket
            </button>
          ) : (
            <button onClick={() => patch({ state: 'open' })} style={actionBtn('#3b82f6', '#eff6ff')}>
              Reopen
            </button>
          )}
          {isAdmin && (
            <button onClick={handleDelete} disabled={deleting} style={actionBtn('#e74c3c', '#fef2f2')}>
              {deleting ? '…' : 'Delete'}
            </button>
          )}
        </div>

        {/* Title (inline edit) */}
        {editTitle ? (
          <input
            autoFocus
            value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditTitle(false) }}
            style={{
              width: '100%', boxSizing: 'border-box', fontSize: 16, fontWeight: 700,
              color: T.navy, border: 'none', borderBottom: `2px solid #6366f1`,
              outline: 'none', padding: '2px 0', fontFamily: T.font, marginBottom: 10,
              background: 'transparent',
            }}
          />
        ) : (
          <div
            onClick={() => setEditTitle(true)}
            style={{ fontSize: 16, fontWeight: 700, color: T.navy, lineHeight: 1.3, marginBottom: 10, cursor: 'text' }}
            title="Click to edit"
          >
            {ticket.title}
          </div>
        )}

        {/* Status + Priority */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={STATES.includes(ticketState) ? ticketState : ''}
            onChange={e => {
              const s = e.target.value
              const extra = s === 'pending reminder'
                ? { pending_time: new Date(pendingTime).toISOString() }
                : {}
              patch({ state: s, ...extra })
            }}
            style={{ ...dropdownStyle, color: sc.color, background: sc.bg, borderColor: sc.color + '44' }}
          >
            {ticketState === 'new' && (
              <option value="" disabled>New (auto)</option>
            )}
            {STATES.map(s => <option key={s} value={s}>{stateColor(s).label}</option>)}
          </select>

          <select
            value={ticket.priority_id || ''}
            onChange={e => patch({ priority_id: Number(e.target.value) })}
            style={{ ...dropdownStyle, color: pc.color, background: pc.bg, borderColor: pc.color + '44' }}
          >
            {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Pending-until picker — only shown when state is pending reminder */}
        {ticketState === 'pending reminder' && (
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: T.muted, minWidth: 60 }}>Pending until</span>
            <input
              type="datetime-local"
              value={pendingTime}
              onChange={e => {
                setPendingTime(e.target.value)
                if (e.target.value) patch({ pending_time: new Date(e.target.value).toISOString() })
              }}
              style={{ ...dropdownStyle, fontSize: 12 }}
            />
          </div>
        )}

        {/* Assignee */}
        {isAgent && agents.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: T.muted, minWidth: 60 }}>Assigned</span>
            <select
              value={ticket.owner_id || ''}
              onChange={e => patch({ owner_id: Number(e.target.value) || undefined })}
              style={{ ...dropdownStyle, flex: 1 }}
            >
              <option value="">Unassigned</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.firstname} {a.lastname}</option>
              ))}
            </select>
          </div>
        )}

        {/* Department + Customer — both always visible */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: T.muted, minWidth: 60 }}>Dept</span>
          <select
            value={currentDeptId}
            onChange={e => handleDeptChange(e.target.value)}
            style={{ ...dropdownStyle }}
          >
            <option value="">— None —</option>
            {departments.map(d => (
              <option key={d.id} value={String(d.id)}>{d.name}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: T.muted }}>Customer</span>
          <select
            value={currentContactId}
            onChange={e => handleContactChange(e.target.value)}
            style={{ ...dropdownStyle }}
          >
            <option value="">— None —</option>
            {contactPool.map(u => (
              <option key={u.id} value={String(u.id)}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Category chips */}
        {predefinedCategories.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <span style={{ fontSize: 11, color: T.muted, minWidth: 60, paddingTop: 5 }}>Category</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {predefinedCategories.map(cat => {
                const active = currentCategories.includes(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                      fontFamily: T.font, fontWeight: active ? 600 : 400,
                      border: `1px solid ${active ? '#6366f1' : T.border}`,
                      background: active ? '#eef2ff' : '#fafafa',
                      color: active ? '#6366f1' : T.muted,
                    }}
                  >
                    {active ? '✓ ' : ''}{cat}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* GDPR controls */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={toggleRestriction}
            style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
              fontFamily: T.font, fontWeight: 600,
              border: `1px solid ${isRestricted ? '#fca5a5' : T.border}`,
              background: isRestricted ? '#fef2f2' : '#fafafa',
              color: isRestricted ? '#b91c1c' : T.muted,
            }}
            title="GDPR Art. 18 — Restrict processing while a complaint or dispute is investigated"
          >
            🔒 {isRestricted ? 'Processing Restricted' : 'Restrict Processing'}
          </button>
          {isAdmin && !isAnonymized && (
            <button
              onClick={handleAnonymize}
              disabled={anonymizing}
              style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                fontFamily: T.font, fontWeight: 600,
                border: `1px solid #fcd34d`,
                background: '#fffbeb', color: '#92400e',
              }}
              title="GDPR Art. 17 — Redact personal data from this ticket"
            >
              {anonymizing ? 'Anonymizing…' : '🗑 Anonymize (GDPR Art. 17)'}
            </button>
          )}
        </div>

        {/* SLA */}
        {sla && slaC && (
          <div style={{
            marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 600,
            color: slaC.color, background: slaC.bg,
          }}>
            <span style={{ fontSize: 8 }}>●</span> SLA: {sla.label}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: `1px solid ${T.border}`,
        background: T.card, flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 16px', border: 'none', background: 'transparent',
            fontSize: 13, fontFamily: T.font, cursor: 'pointer',
            color: tab === t ? '#6366f1' : T.muted,
            fontWeight: tab === t ? 700 : 400,
            borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content — all three are always mounted; CSS hides the inactive ones.
           This avoids remounting + reloading data every time the user switches tabs. */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: tab === 'Conversation' ? 'flex' : 'none', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
          <ConversationTab
            ticketId={ticketId}
            onReplySent={() => load()}
            isAgent={isAgent}
            insertText={kbInsert}
            onInsertConsumed={() => setKbInsert('')}
            isActive={tab === 'Conversation'}
          />
        </div>
        <div style={{ display: tab === 'Details' ? 'flex' : 'none', flex: 1, overflow: 'auto', flexDirection: 'column' }}>
          <DetailsTab ticket={ticket} />
        </div>
        <div style={{ display: tab === 'Knowledge Base' ? 'flex' : 'none', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
          <KnowledgeBaseTab
            ticketTitle={ticket.title}
            onInsert={text => { setKbInsert(text); setTab('Conversation') }}
          />
        </div>
      </div>
    </PanelShell>
  )
}

function PanelShell({ children }) {
  const isMobile = useIsMobile()
  const mobileStyle = isMobile ? {
    position: 'fixed', inset: 0, width: '100%', minWidth: 0,
    borderLeft: 'none', zIndex: 50,
  } : {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: 580, minWidth: 380, borderLeft: `1px solid ${T.border}`,
    zIndex: 10,
  }
  return (
    <div id="ticket-detail-panel" style={{
      background: T.card, display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.10)', fontFamily: T.font,
      ...mobileStyle,
    }}>
      {children}
    </div>
  )
}

const dropdownStyle = {
  padding: '4px 8px', borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans', sans-serif",
  border: '1px solid rgba(0,0,0,0.12)', cursor: 'pointer', outline: 'none',
  background: '#f9fafb', color: '#1a1f2e',
}

const actionBtn = (color, bg) => ({
  padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  border: `1px solid ${color}44`, background: bg, color, cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
})
