import { useState, useRef } from 'react'
import { T, stateColor, zammadApi } from './shared'
import BoardCard from './BoardCard'

const COLUMNS = [
  { key: 'new',              label: 'New'     },
  { key: 'open',             label: 'Open'    },
  { key: 'pending reminder', label: 'Pending' },
  { key: 'closed',           label: 'Closed'  },
]

export default function BoardView({ tickets, onSelect, onTicketUpdated }) {
  const [dragId,   setDragId]   = useState(null)
  const [overCol,  setOverCol]  = useState(null)
  const [updating, setUpdating] = useState(null)
  const dragOver = useRef(null)

  const byState = (stateKey) =>
    tickets.filter(t => (t.state || '').toLowerCase() === stateKey)

  const handleDrop = async (colKey) => {
    if (!dragId || colKey === dragOver.current) return
    setUpdating(dragId)
    try {
      await zammadApi.updateTicket(dragId, { state: colKey })
      onTicketUpdated?.()
    } catch {}
    setUpdating(null)
    setDragId(null)
    setOverCol(null)
    dragOver.current = null
  }

  return (
    <div style={{
      display: 'flex', gap: 12, padding: '14px 16px',
      height: '100%', overflowX: 'auto', overflowY: 'hidden',
      fontFamily: T.font,
    }}>
      {COLUMNS.map(col => {
        const colTickets = byState(col.key)
        const sc = stateColor(col.key)
        const isOver = overCol === col.key

        return (
          <div
            key={col.key}
            onDragOver={e => { e.preventDefault(); setOverCol(col.key); dragOver.current = col.key }}
            onDragLeave={() => setOverCol(null)}
            onDrop={() => handleDrop(col.key)}
            style={{
              width: 260, minWidth: 260, display: 'flex', flexDirection: 'column',
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
                    onDragStart={id => { setDragId(id); dragOver.current = col.key }}
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
  )
}
