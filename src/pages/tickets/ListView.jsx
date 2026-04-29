import { useState, useMemo } from 'react'
import { T, stateColor, priorityColor, fmtDate, fmtDateTime, slaStatus, isNewTicket } from './shared'
import SlaIndicator from './SlaIndicator'
import FilterPanel from './FilterPanel'

const th = {
  padding: '8px 10px', textAlign: 'left', fontSize: 10,
  fontWeight: 600, color: T.muted, textTransform: 'uppercase',
  letterSpacing: 0.5, background: '#fafafa', whiteSpace: 'nowrap',
  userSelect: 'none', cursor: 'pointer',
  borderBottom: `1px solid ${T.border}`,
}

const td = {
  padding: '9px 10px', fontSize: 12, color: T.navy,
  borderBottom: `1px solid ${T.border}`, verticalAlign: 'middle',
}

const EMPTY_FILTERS = {
  status: [], priority: [], agent: '',
  dateFrom: '', dateTo: '', overdue: false,
}

const COLUMNS = [
  { field: 'created_at',  label: 'Date',      w: 90  },
  { field: 'number',      label: '#',          w: 55  },
  { field: 'title',       label: 'Title',      w: null },
  { field: 'category',    label: 'Category',   w: 110, noSort: true },
  { field: 'state',       label: 'Status',     w: 90  },
  { field: 'priority_id', label: 'Priority',   w: 90  },
  { field: 'department',  label: 'Dept',       w: 90, noSort: true  },
  { field: 'customer',    label: 'Customer',   w: 110, noSort: true },
  { field: 'owner',       label: 'Agent',      w: 100 },
  { field: 'updated_at',  label: 'Updated',    w: 90  },
  { field: 'sla',         label: 'SLA',        w: 120 },
]

// Parse tags array or comma-string from Zammad ticket
const parseTags = (ticket) => {
  if (!ticket) return []
  if (Array.isArray(ticket.tags)) return ticket.tags.map(t => String(t).trim()).filter(Boolean)
  if (typeof ticket.tags === 'string' && ticket.tags) return ticket.tags.split(',').map(t => t.trim()).filter(Boolean)
  return []
}

const getCategory = (ticket) => {
  const tags = parseTags(ticket)
  const cats = tags.filter(t => !t.startsWith('dept:') && !t.startsWith('contact:'))
  return cats.length ? cats.join(', ') : null
}

const getDept = (ticket) => {
  const tag = parseTags(ticket).find(t => t.startsWith('dept:'))
  return tag ? tag.slice(5) : null
}

const getContact = (ticket) => {
  const tag = parseTags(ticket).find(t => t.startsWith('contact:'))
  return tag ? tag.slice(8) : null
}

export default function ListView({ tickets, loading, onSelect, isAdmin, newBanner, onDismissBanner }) {
  const [search,      setSearch]      = useState('')
  const [filters,     setFilters]     = useState(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [sort,        setSort]        = useState({ field: 'updated_at', dir: 'desc' })

  const activeFilterCount = [
    (filters.status || []).length,
    (filters.priority || []).length,
    filters.agent ? 1 : 0,
    filters.dateFrom || filters.dateTo ? 1 : 0,
    filters.overdue ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const filtered = useMemo(() => {
    let rows = tickets || []
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        String(t.number || t.id).includes(q) ||
        t.customer?.toLowerCase().includes(q) ||
        (getContact(t) || '').toLowerCase().includes(q)
      )
    }
    if (filters.status?.length)
      rows = rows.filter(t => filters.status.includes(t.state?.toLowerCase()))
    if (filters.priority?.length)
      rows = rows.filter(t => filters.priority.includes(String(t.priority_id)))
    if (filters.agent)
      rows = rows.filter(t => String(t.owner_id) === String(filters.agent))
    if (filters.dateFrom)
      rows = rows.filter(t => t.created_at && new Date(t.created_at) >= new Date(filters.dateFrom))
    if (filters.dateTo)
      rows = rows.filter(t => t.created_at && new Date(t.created_at) <= new Date(filters.dateTo + 'T23:59:59'))
    if (filters.overdue)
      rows = rows.filter(t => t.escalation_at && new Date(t.escalation_at) < new Date())
    return rows
  }, [tickets, search, filters])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va = a[sort.field]
      let vb = b[sort.field]
      if (sort.field === 'sla') {
        va = a.escalation_at ? new Date(a.escalation_at).getTime() : Infinity
        vb = b.escalation_at ? new Date(b.escalation_at).getTime() : Infinity
      }
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sort])

  const toggleSort = (field) => {
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'desc' })
  }

  const sortArrow = (field) => sort.field === field ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.muted, fontSize: 13, fontFamily: T.font }}>Loading…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', fontFamily: T.font }}>

      {newBanner > 0 && (
        <div style={{
          background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 600,
          padding: '7px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span>{newBanner} new ticket{newBanner > 1 ? 's' : ''} arrived</span>
          <button onClick={onDismissBanner} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 11 }}>Dismiss</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderBottom: `1px solid ${T.border}`,
        background: T.card, flexShrink: 0,
      }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tickets, user, #number…"
          style={{
            flex: 1, padding: '7px 12px', borderRadius: 7,
            border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.font,
            color: T.navy, background: '#fafafa', outline: 'none',
          }}
        />
        <button
          onClick={() => setShowFilters(f => !f)}
          style={{
            padding: '7px 14px', borderRadius: 7, fontSize: 13, fontFamily: T.font,
            border: `1px solid ${activeFilterCount > 0 ? '#6366f1' : T.border}`,
            background: activeFilterCount > 0 ? '#eef2ff' : T.card,
            color: activeFilterCount > 0 ? '#6366f1' : T.navy,
            cursor: 'pointer', fontWeight: activeFilterCount > 0 ? 600 : 400,
            whiteSpace: 'nowrap',
          }}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        <div style={{ fontSize: 12, color: T.muted, whiteSpace: 'nowrap' }}>{sorted.length} tickets</div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        {sorted.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.muted, fontSize: 13 }}>
            No tickets match your filters
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.field}
                    style={{ ...th, width: col.w || undefined, cursor: col.noSort ? 'default' : 'pointer' }}
                    onClick={() => !col.noSort && toggleSort(col.field)}
                  >
                    {col.label}{!col.noSort && sortArrow(col.field)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(ticket => {
                const sc   = stateColor(ticket.state)
                const pc   = priorityColor(ticket.priority_id)
                const cat  = getCategory(ticket)
                const dept = getDept(ticket)
                const dt   = ticket.created_at ? new Date(ticket.created_at) : null
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => onSelect(ticket)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    {/* Date */}
                    <td style={{ ...td, color: T.muted, whiteSpace: 'nowrap' }}>
                      {dt ? (
                        <div>
                          <div style={{ fontSize: 11 }}>{fmtDate(ticket.created_at)}</div>
                          <div style={{ fontSize: 10, color: '#bbb' }}>
                            {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : '—'}
                    </td>

                    {/* # */}
                    <td style={{ ...td, color: T.muted, fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
                      #{ticket.number || ticket.id}
                    </td>

                    {/* Title */}
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 260 }}>
                        {isNewTicket(ticket) && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, flexShrink: 0,
                            background: '#dcfce7', color: '#15803d', letterSpacing: 0.4,
                          }}>NEW</span>
                        )}
                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ticket.title}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ ...td }}>
                      {cat ? (
                        <span style={{
                          display: 'inline-block', padding: '2px 7px', borderRadius: 8,
                          fontSize: 10, fontWeight: 600, background: '#eef2ff', color: '#6366f1',
                          maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{cat}</span>
                      ) : <span style={{ color: '#ccc' }}>—</span>}
                    </td>

                    {/* Status */}
                    <td style={td}>
                      <span style={{
                        display: 'inline-block', padding: '2px 7px', borderRadius: 10,
                        fontSize: 10, fontWeight: 600, color: sc.color, background: sc.bg,
                      }}>
                        {sc.label}
                      </span>
                    </td>

                    {/* Priority */}
                    <td style={td}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 7px', borderRadius: 10,
                        fontSize: 10, fontWeight: 600, color: pc.color, background: pc.bg,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: pc.dot || pc.color, flexShrink: 0 }} />
                        {ticket.priority || pc.label}
                      </span>
                    </td>

                    {/* Department */}
                    <td style={{ ...td, color: T.muted, fontSize: 11 }}>
                      {dept || <span style={{ color: '#ccc' }}>—</span>}
                    </td>

                    {/* Customer (contact tag, fallback to Zammad customer field) */}
                    <td style={{ ...td, color: T.muted, fontSize: 11 }}>
                      {getContact(ticket) || ticket.customer || '—'}
                    </td>

                    {/* Agent */}
                    <td style={{ ...td, color: T.muted, fontSize: 11 }}>
                      {ticket.owner && ticket.owner !== '-' ? ticket.owner : '—'}
                    </td>

                    {/* Updated */}
                    <td style={{ ...td, color: T.muted, fontSize: 11, whiteSpace: 'nowrap' }}>
                      {fmtDate(ticket.updated_at)}
                    </td>

                    {/* SLA */}
                    <td style={td}><SlaIndicator ticket={ticket} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          isAdmin={isAdmin}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  )
}
