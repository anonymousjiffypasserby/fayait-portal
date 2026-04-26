import { T, priorityColor, isNewTicket } from './shared'
import SlaIndicator from './SlaIndicator'

export default function BoardCard({ ticket, onSelect, onDragStart }) {
  const pc = priorityColor(ticket.priority_id)

  const initials = (name) => {
    if (!name || name === '-') return '?'
    const p = name.trim().split(' ')
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(ticket.id)}
      onClick={() => onSelect(ticket)}
      style={{
        background: '#fff', borderRadius: 8, padding: '11px 12px',
        border: `1px solid ${T.border}`, cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 8,
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      {/* Priority dot + ID */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: pc.dot || pc.color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>
          #{ticket.number || ticket.id}
        </span>
        <div style={{ flex: 1 }} />
        <SlaIndicator ticket={ticket} compact />
      </div>

      {/* Title + New badge */}
      <div style={{ marginBottom: 8 }}>
        {isNewTicket(ticket) && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
            background: '#dcfce7', color: '#15803d', letterSpacing: 0.4,
            display: 'inline-block', marginBottom: 4,
          }}>NEW</span>
        )}
        <div style={{
          fontSize: 13, fontWeight: 600, color: T.navy, lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {ticket.title}
        </div>
      </div>

      {/* Customer + agent row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ticket.customer || '—'}
        </span>
        {ticket.owner && ticket.owner !== '-' && (
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: '#6366f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0,
            title: ticket.owner,
          }} title={ticket.owner}>
            {initials(ticket.owner)}
          </div>
        )}
      </div>
    </div>
  )
}
