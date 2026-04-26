import { useState, useEffect } from 'react'
import { T, zammadApi, stateColor, priorityColor, fmtDateTime, slaStatus, SLA_COLORS, isNewTicket } from './shared'
import ConversationTab   from './tabs/ConversationTab'
import DetailsTab        from './tabs/DetailsTab'
import KnowledgeBaseTab  from './tabs/KnowledgeBaseTab'
import api from '../../services/api'

// 'new' removed — it is set automatically by Zammad on creation, not manually
const STATES     = ['open', 'pending reminder', 'closed']
const PRIORITIES = [{ id: 1, name: 'Low' }, { id: 2, name: 'Normal' }, { id: 3, name: 'High' }, { id: 4, name: 'Emergency' }]
const TABS       = ['Conversation', 'Details', 'Knowledge Base']

const AGENT_ROLES = ['admin', 'agent']

export default function DetailPanel({ ticketId, onClose, onUpdated, isAdmin, isAgent }) {
  const [ticket,    setTicket]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('Conversation')
  const [groups,    setGroups]    = useState([])
  const [agents,    setAgents]    = useState([])
  const [editTitle, setEditTitle] = useState(false)
  const [titleVal,  setTitleVal]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)
  const [deleting,  setDeleting]  = useState(false)
  const [kbInsert,  setKbInsert]  = useState('')

  const load = () => {
    setLoading(true)
    zammadApi.getTicket(ticketId)
      .then(t => { setTicket(t); setTitleVal(t.title || '') })
      .catch(() => setError('Failed to load ticket'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    zammadApi.getGroups().then(g => setGroups(Array.isArray(g) ? g : [])).catch(() => {})
    // Load agents from portal API (company-scoped) for the assignee dropdown
    api.getUsers()
      .then(users => {
        const agentUsers = Array.isArray(users)
          ? users.filter(u => AGENT_ROLES.includes(u.role))
          : []
        setAgents(agentUsers)
      })
      .catch(() => {})
  }, [ticketId])

  const patch = async (data) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await zammadApi.updateTicket(ticketId, data)
      setTicket(prev => ({ ...prev, ...updated }))
      onUpdated?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const saveTitle = () => {
    setEditTitle(false)
    if (titleVal.trim() && titleVal.trim() !== ticket.title) patch({ title: titleVal.trim() })
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
      <PanelShell onClose={onClose}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: T.muted, fontSize: 13 }}>
          Loading…
        </div>
      </PanelShell>
    )
  }

  if (!ticket) {
    return (
      <PanelShell onClose={onClose}>
        <div style={{ padding: 24, color: T.red, fontSize: 13 }}>{error || 'Not found'}</div>
      </PanelShell>
    )
  }

  const sc   = stateColor(ticket.state)
  const pc   = priorityColor(ticket.priority_id)
  const sla  = slaStatus(ticket)
  const slaC = sla ? SLA_COLORS[sla.level] : null
  const showNewBadge = isNewTicket(ticket)

  // Current assignee name from portal agent list (matched by email if available)
  const currentAgentName = ticket.owner && ticket.owner !== '-' ? ticket.owner : null

  return (
    <PanelShell onClose={onClose}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${T.border}`,
        background: T.card, flexShrink: 0,
      }}>
        {/* Ticket # + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
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
          {ticket.state !== 'closed' ? (
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

        {/* Dropdowns row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* State — 'new' excluded; shown read-only if current state is new */}
          <select
            value={STATES.includes(ticket.state) ? ticket.state : ''}
            onChange={e => patch({ state: e.target.value })}
            style={{ ...dropdownStyle, color: sc.color, background: sc.bg, borderColor: sc.color + '44' }}
          >
            {ticket.state === 'new' && (
              <option value="" disabled>New (auto)</option>
            )}
            {STATES.map(s => <option key={s} value={s}>{stateColor(s).label}</option>)}
          </select>

          {/* Priority */}
          <select
            value={ticket.priority_id || ''}
            onChange={e => patch({ priority_id: Number(e.target.value) })}
            style={{ ...dropdownStyle, color: pc.color, background: pc.bg, borderColor: pc.color + '44' }}
          >
            {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Group */}
          {groups.length > 0 && (
            <select
              value={ticket.group_id || ''}
              onChange={e => patch({ group_id: Number(e.target.value) })}
              style={dropdownStyle}
            >
              <option value="">No group</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
        </div>

        {/* Assignee row — shown for agents and admins */}
        {isAgent && agents.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: T.muted, minWidth: 56 }}>Assigned</span>
            <select
              value={ticket.owner_id || ''}
              onChange={e => patch({ owner_id: Number(e.target.value) || undefined })}
              style={{ ...dropdownStyle, flex: 1 }}
            >
              <option value="">Unassigned</option>
              {agents.map(a => (
                <option key={a.id} value={a.zammad_user_id || a.id}>
                  {a.name || a.email}
                </option>
              ))}
            </select>
          </div>
        )}

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

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'Conversation' && (
          <ConversationTab
            ticketId={ticketId}
            onReplySent={() => { load(); onUpdated?.() }}
            isAgent={isAgent}
            insertText={kbInsert}
            onInsertConsumed={() => setKbInsert('')}
          />
        )}
        {tab === 'Details' && (
          <DetailsTab ticket={ticket} onTagsChanged={onUpdated} />
        )}
        {tab === 'Knowledge Base' && (
          <KnowledgeBaseTab
            ticketTitle={ticket.title}
            onInsert={text => { setKbInsert(text); setTab('Conversation') }}
          />
        )}
      </div>
    </PanelShell>
  )
}

function PanelShell({ onClose, children }) {
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 560, minWidth: 360, background: T.card,
      borderLeft: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column',
      zIndex: 10, boxShadow: '-4px 0 24px rgba(0,0,0,0.10)',
      fontFamily: T.font,
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 12, right: 16, background: 'none', border: 'none',
        fontSize: 18, cursor: 'pointer', color: T.muted, zIndex: 1, lineHeight: 1,
      }}>×</button>
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
