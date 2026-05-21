import { useState, useRef, useMemo } from 'react'
import { T, stateColor, priorityColor, zammadApi } from './shared'
import BoardCard from './BoardCard'

const COLUMNS = [
  { key: 'new',           label: 'New'          },
  { key: 'open',          label: 'Open'         },
  { key: 'pending reminder', label: 'Pending'   },
  { key: 'pending close', label: 'Pending Close'},
  { key: 'closed',        label: 'Closed'       },
]

const PRIORITY_OPTIONS = [
  { id: '', label: 'All priorities' },
  { id: '4', label: 'Emergency' },
  { id: '3', label: 'High' },
  { id: '2', label: 'Normal' },
  { id: '1', label: 'Low' },
]

export default function BoardView({ tickets, onSelect, onTicketUpdated, agents = [] }) {
  const [dragId,   setDragId]   = useState(null)
  const [overCol,  setOverCol]  = useState(null)
  const [updating, setUpdating] = useState(null)
  const [search,   setSearch]   = useState('')
  const [priority, setPriority] = useState('')
  const [agentId,  setAgentId]  = useState('')
  const sourceCol = useRef(null)

  const filtered = useMemo(() => {
    let rows = tickets || []
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        String(t.number || t.id).includes(q) ||
        t.customer?.toLowerCase().includes(q)
      )
    }
    if (priority) rows = rows.filter(t => String(t.priority_id) === priority)
    if (agentId)  rows = rows.filter(t => String(t.owner_id) === agentId)
    return rows
  }, [tickets, search, priority, agentId])

  const byState = (stateKey) =>
    filtered.filter(t => (t.state || '').toLowerCase() === stateKey)

  const handleDrop = async (colKey) => {
    if (!dragId || colKey === sourceCol.current) return
    setUpdating(dragId)
    try {
      await zammadApi.updateTicket(dragId, { state: colKey })
      onTicketUpdated?.()
    } catch {}
    setUpdating(null)
    setDragId(null)
    setOverCol(null)
    sourceCol.current = null
  }

  const activeFilters = [search, priority, agentId].filter(Boolean).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: T.font }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: '8px 14px', borderBottom: `1px solid ${T.border}`,
        background: T.card, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search board…"
          style={{
            flex: '1 1 160px', minWidth: 120, padding: '6px 10px', borderRadius: 7,
            border: `1px solid ${T.border}`, fontSize: 12, fontFamily: T.font,
            color: T.navy, background: '#fafafa', outline: 'none',
          }}
        />
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          style={selStyle}
        >
          {PRIORITY_OPTIONS.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        {agents.length > 0 && (
          <select value={agentId} onChange={e => setAgentId(e.target.value)} style={selStyle}>
            <option value="">All agents</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.firstname} {a.lastname}</option>
            ))}
          </select>
        )}
        {activeFilters > 0 && (
          <button
            onClick={() => { setSearch(''); setPriority(''); setAgentId('') }}
            style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 12, cursor: 'pointer', padding: '4px 8px', fontFamily: T.font }}
          >
            Clear ({activeFilters})
          </button>
        )}
        <span style={{ fontSize: 11, color: T.muted, whiteSpace: 'nowrap', marginLeft: 'auto' }}>
          {filtered.length} tickets
        </span>
      </div>

      {/* Columns */}
      <div style={{
        display: 'flex', gap: 12, padding: '14px 16px',
        flex: 1, overflowX: 'auto', overflowY: 'hidden',
      }}>
        {COLUMNS.map(col => {
          const colTickets = byState(col.key)
          const sc = stateColor(col.key)
          const isOver = overCol === col.key

          return (
            <div
              key={col.key}
              onDragOver={e => { e.preventDefault(); setOverCol(col.key) }}
              onDragLeave={() => setOverCol(null)}
              onDrop={() => handleDrop(col.key)}
              style={{
                width: 240, minWidth: 240, display: 'flex', flexDirection: 'column',
                background: isOver ? '#eef2ff' : '#f5f7fa',
                borderRadius: 10, border: `2px solid ${isOver ? '#6366f1' : 'transparent'}`,
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {/* Column header */}
              <div style={{
                padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: `1px solid ${T.border}`,
              }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: sc.color,
                }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.navy }}>{col.label}</span>
                <span style={{
                  marginLeft: 'auto', fontSize: 11, fontWeight: 600,
                  background: '#e2e8f0', color: T.muted,
                  borderRadius: 8, padding: '1px 7px',
                }}>
                  {colTickets.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
                {colTickets.map(t => (
                  <div key={t.id} style={{ opacity: updating === t.id ? 0.4 : 1 }}>
                    <BoardCard
                      ticket={t}
                      onSelect={onSelect}
                      onDragStart={id => { setDragId(id); sourceCol.current = col.key }}
                    />
                  </div>
                ))}
                {colTickets.length === 0 && (
                  <div style={{
                    textAlign: 'center', color: T.muted, fontSize: 12,
                    padding: '24px 0', border: `2px dashed ${T.border}`,
                    borderRadius: 8,
                  }}>
                    No tickets
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const selStyle = {
  padding: '6px 8px', borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans', sans-serif",
  border: `1px solid rgba(0,0,0,0.10)`, color: '#1a1f2e', background: '#fafafa',
  outline: 'none', cursor: 'pointer',
}
