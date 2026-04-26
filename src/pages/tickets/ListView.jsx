import { useState, useMemo } from 'react'
import { T, stateColor, priorityColor, fmtDateTime, slaStatus, SLA_COLORS } from './shared'
import SlaIndicator from './SlaIndicator'
import FilterPanel from './FilterPanel'

const th = {
  padding: '9px 12px', textAlign: 'left', fontSize: 11,
  fontWeight: 600, color: T.muted, textTransform: 'uppercase',
  letterSpacing: 0.5, background: '#fafafa', whiteSpace: 'nowrap',
  userSelect: 'none', cursor: 'pointer',
  borderBottom: `1px solid ${T.border}`,
}

const td = {
  padding: '10px 12px', fontSize: 13, color: T.navy,
  borderBottom: `1px solid ${T.border}`, verticalAlign: 'middle',
}

const EMPTY_FILTERS = {
  status: [], priority: [], group: '', agent: '',
  dateFrom: '', dateTo: '', hasAttachment: false, overdue: false,
}

export default function ListView({ tickets, loading, onSelect, isAdmin, newBanner, onDismissBanner }) {
  const [search,      setSearch]      = useState('')
  const [filters,     setFilters]     = useState(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [sort,        setSort]        = useState({ field: 'updated_at', dir: 'desc' })

  const activeFilterCount = [
    (filters.status || []).length,
    (filters.priority || []).length,
    filters.group ? 1 : 0,
    filters.agent ? 1 : 0,
    filters.dateFrom || filters.dateTo ? 1 : 0,
    filters.hasAttachment ? 1 : 0,
    filters.overdue ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

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

    if (filters.status?.length)
      rows = rows.filter(t => filters.status.includes(t.state?.toLowerCase()))

    if (filters.priority?.length)
      rows = rows.filter(t => filters.priority.includes(String(t.priority_id)))

    if (filters.group)
      rows = rows.filter(t => String(t.group_id) === String(filters.group))

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

      {/* New tickets banner */}
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
          placeholder="Search tickets, customer, #number…"
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
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                {[
                  { field: 'number',     label: '#',        w: 60  },
                  { field: 'title',      label: 'Title',    w: null },
                  { field: 'state',      label: 'Status',   w: 110 },
                  { field: 'priority_id',label: 'Priority', w: 105 },
                  { field: 'customer',   label: 'Customer', w: 130 },
                  { field: 'group',      label: 'Group',    w: 120 },
                  { field: 'owner',      label: 'Agent',    w: 120 },
                  { field: 'created_at', label: 'Created',  w: 130 },
                  { field: 'updated_at', label: 'Updated',  w: 130 },
                  { field: 'sla',        label: 'SLA',      w: 150 },
                ].map(col => (
                  <th key={col.field} style={{ ...th, width: col.w || undefined }} onClick={() => toggleSort(col.field)}>
                    {col.label}{sortArrow(col.field)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(ticket => {
                const sc = stateColor(ticket.state)
                const pc = priorityColor(ticket.priority_id)
                const sla = slaStatus(ticket)
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => onSelect(ticket)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ ...td, color: T.muted, fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                      #{ticket.number || ticket.id}
                    </td>
                    <td style={td}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                        {ticket.title}
                      </div>
                    </td>
                    <td style={td}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                        fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg,
                      }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '2px 8px', borderRadius: 10,
                        fontSize: 11, fontWeight: 600, color: pc.color, background: pc.bg,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: pc.dot || pc.color, flexShrink: 0 }} />
                        {ticket.priority || pc.label}
                      </span>
                    </td>
                    <td style={{ ...td, color: T.muted, fontSize: 12 }}>{ticket.customer || '—'}</td>
                    <td style={{ ...td, color: T.muted, fontSize: 12 }}>{ticket.group || '—'}</td>
                    <td style={{ ...td, color: T.muted, fontSize: 12 }}>{ticket.owner && ticket.owner !== '-' ? ticket.owner : '—'}</td>
                    <td style={{ ...td, color: T.muted, fontSize: 12 }}>{fmtDateTime(ticket.created_at)}</td>
                    <td style={{ ...td, color: T.muted, fontSize: 12 }}>{fmtDateTime(ticket.updated_at)}</td>
                    <td style={td}>
                      <SlaIndicator ticket={ticket} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Filter drawer */}
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
