import { T, stateColor, priorityColor, fmtDateTime } from './shared'

const th = {
  padding: '10px 14px', textAlign: 'left', fontSize: 11,
  fontWeight: 600, color: T.muted, textTransform: 'uppercase',
  letterSpacing: 0.5, borderBottom: `1px solid ${T.border}`,
  background: '#fafafa', whiteSpace: 'nowrap',
}

const td = {
  padding: '11px 14px', fontSize: 13, color: T.navy,
  borderBottom: `1px solid ${T.border}`, verticalAlign: 'middle',
}

function StateBadge({ state }) {
  const c = stateColor(state)
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
      fontSize: 11, fontWeight: 600, color: c.color, background: c.bg,
      whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  )
}

function PriorityBadge({ priorityId, priorityName }) {
  const c = priorityColor(priorityId)
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
      fontSize: 11, fontWeight: 600, color: c.color, background: c.bg,
      whiteSpace: 'nowrap',
    }}>
      {priorityName || c.label}
    </span>
  )
}

export default function TicketList({ tickets, loading, onSelect }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.muted, fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  if (!tickets.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.muted, fontSize: 13 }}>
        No tickets found
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto', height: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.font }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 60 }}>#</th>
            <th style={th}>Title</th>
            <th style={{ ...th, width: 120 }}>State</th>
            <th style={{ ...th, width: 110 }}>Priority</th>
            <th style={{ ...th, width: 140 }}>Group</th>
            <th style={{ ...th, width: 150 }}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(ticket => (
            <tr
              key={ticket.id}
              onClick={() => onSelect(ticket)}
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <td style={{ ...td, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>
                #{ticket.number || ticket.id}
              </td>
              <td style={td}>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>{ticket.title}</div>
                {ticket.customer && (
                  <div style={{ fontSize: 11, color: T.muted }}>{ticket.customer}</div>
                )}
              </td>
              <td style={td}><StateBadge state={ticket.state} /></td>
              <td style={td}>
                <PriorityBadge priorityId={ticket.priority_id} priorityName={ticket.priority} />
              </td>
              <td style={{ ...td, color: T.muted }}>{ticket.group || '—'}</td>
              <td style={{ ...td, color: T.muted, fontSize: 12 }}>{fmtDateTime(ticket.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
