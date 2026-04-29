import { useState, useMemo } from 'react'
import { T, zammadApi, stateColor, priorityColor, fmtDate, fmtDateTime, slaStatus, isNewTicket } from './shared'
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

const isSystemTag = (t) => t.startsWith('dept:') || t.startsWith('contact:') || t.startsWith('gdpr:')

const getCategory = (ticket) => {
  const tags = parseTags(ticket)
  const cats = tags.filter(t => !isSystemTag(t))
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

// ── CSV export ───────────────────────────────────────────────────────────────
function exportCsv(rows) {
  const cols = ['#', 'Date', 'Title', 'Status', 'Priority', 'Category', 'Dept', 'Customer', 'Agent', 'Updated']
  const data = rows.map(t => [
    t.number || t.id,
    fmtDateTime(t.created_at),
    t.title,
    t.state || '',
    t.priority || priorityColor(t.priority_id).label,
    getCategory(t) || '',
    getDept(t) || '',
    getContact(t) || t.customer || '',
    t.owner && t.owner !== '-' ? t.owner : '',
    fmtDateTime(t.updated_at),
  ])
  const csv = [cols, ...data]
    .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ── SAR HTML builder ─────────────────────────────────────────────────────────
function buildSarHtml(customerName, tickets, articleMap) {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const ticketBlocks = tickets.map(t => {
    const arts = articleMap[t.id] || []
    const msgs = arts.map(a => `
      <div style="margin:8px 0;padding:10px;background:${a.sender==='Agent'?'#eef2ff':'#f9fafb'};border-radius:6px;border:1px solid #e5e7eb">
        <div style="font-size:11px;color:#888;margin-bottom:4px">
          <strong>${esc(a.from||a.sender||'?')}</strong> · ${esc(fmtDateTime(a.created_at))}
          ${a.internal ? ' · <span style="color:#854d0e;background:#fef9c3;padding:1px 4px;border-radius:3px;font-size:10px">internal</span>' : ''}
        </div>
        <div style="font-size:13px;line-height:1.6">${a.body || ''}</div>
      </div>`).join('')
    return `
      <div style="margin-bottom:28px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <div style="background:#f1f5f9;padding:10px 16px;display:flex;align-items:center;gap:10px">
          <span style="font-size:12px;color:#888">#${esc(t.number||t.id)}</span>
          <strong style="font-size:14px">${esc(t.title)}</strong>
          <span style="margin-left:auto;font-size:11px;color:#888">${esc(t.state||'')} · ${esc(t.priority||'')} · ${esc(fmtDate(t.created_at))}</span>
        </div>
        <div style="padding:12px 16px">
          <div style="font-size:11px;color:#888;margin-bottom:8px">Agent: ${esc(t.owner&&t.owner!=='-'?t.owner:'Unassigned')} · Updated: ${esc(fmtDateTime(t.updated_at))}</div>
          ${msgs || '<div style="color:#aaa;font-size:12px">No messages</div>'}
        </div>
      </div>`
  }).join('')
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Subject Access Report – ${esc(customerName)}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:860px;margin:40px auto;color:#1a1f2e;padding:0 20px}
h1{font-size:22px;margin-bottom:4px}h2{font-size:16px;border-bottom:2px solid #6366f1;padding-bottom:6px;color:#6366f1}
.meta{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:28px}
.meta p{margin:4px 0;font-size:13px}.meta strong{color:#1a1f2e}
.notice{font-size:12px;color:#555;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px 14px;margin-bottom:28px}
@media print{.meta,.notice{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
</head><body>
<h1>Subject Access Report</h1>
<div class="meta">
  <p><strong>Data subject:</strong> ${esc(customerName)}</p>
  <p><strong>Report generated:</strong> ${date}</p>
  <p><strong>Total tickets found:</strong> ${tickets.length}</p>
</div>
<div class="notice">
  This report was generated in response to a Subject Access Request under GDPR Article 15.
  It contains all helpdesk ticket data held for the above data subject at the time of generation.
  Internal notes are included for completeness; their disclosure to the data subject should be reviewed by your Data Protection Officer.
</div>
<h2>Tickets</h2>
${ticketBlocks || '<p style="color:#aaa">No tickets found for this customer.</p>'}
</body></html>`
}

export default function ListView({ tickets, loading, onSelect, isAdmin, newBanner, onDismissBanner }) {
  const [search,      setSearch]      = useState('')
  const [filters,     setFilters]     = useState(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [sort,        setSort]        = useState({ field: 'updated_at', dir: 'desc' })
  const [showSar,     setShowSar]     = useState(false)
  const [sarCustomer, setSarCustomer] = useState('')
  const [sarLoading,  setSarLoading]  = useState(false)
  const [sarError,    setSarError]    = useState(null)

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

  const generateSar = async () => {
    if (!sarCustomer.trim()) return
    setSarLoading(true); setSarError(null)
    try {
      const found = await zammadApi.searchTickets(sarCustomer.trim(), 200).catch(() => [])
      const list = Array.isArray(found) ? found : []
      const results = await Promise.allSettled(list.map(t => zammadApi.getTicketArticles(t.id)))
      const articleMap = {}
      list.forEach((t, i) => {
        articleMap[t.id] = results[i].status === 'fulfilled' && Array.isArray(results[i].value)
          ? results[i].value : []
      })
      const html = buildSarHtml(sarCustomer.trim(), list, articleMap)
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `SAR-${sarCustomer.trim().replace(/\s+/g,'-')}-${new Date().toISOString().slice(0,10)}.html`
      a.click(); URL.revokeObjectURL(url)
      setShowSar(false); setSarCustomer('')
    } catch (err) {
      setSarError(err.message)
    } finally {
      setSarLoading(false)
    }
  }

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
        <button
          onClick={() => exportCsv(sorted)}
          style={{ padding: '7px 12px', borderRadius: 7, fontSize: 12, fontFamily: T.font, border: `1px solid ${T.border}`, background: T.card, color: T.muted, cursor: 'pointer', whiteSpace: 'nowrap' }}
          title="Export current view as CSV"
        >↓ CSV</button>
        {isAdmin && (
          <button
            onClick={() => setShowSar(true)}
            style={{ padding: '7px 12px', borderRadius: 7, fontSize: 12, fontFamily: T.font, border: '1px solid #fcd34d', background: '#fffbeb', color: '#92400e', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}
            title="Generate Subject Access Report (GDPR Art. 15)"
          >SAR Export</button>
        )}
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
                        {parseTags(ticket).includes('gdpr:restricted') && (
                          <span title="Processing Restricted (GDPR Art. 18)" style={{ fontSize: 11, flexShrink: 0 }}>🔒</span>
                        )}
                        {parseTags(ticket).includes('gdpr:anonymized') && (
                          <span title="Anonymized (GDPR Art. 17)" style={{ fontSize: 11, flexShrink: 0 }}>⚠️</span>
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

      {/* SAR Export modal */}
      {showSar && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3000, fontFamily: T.font,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, width: 460, padding: 28,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 6 }}>
              Subject Access Report — GDPR Art. 15
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 16, lineHeight: 1.5 }}>
              Enter the customer's name or email. All matching tickets and full conversation content will be exported as a downloadable HTML report.
            </div>
            <input
              autoFocus
              value={sarCustomer}
              onChange={e => setSarCustomer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateSar()}
              placeholder="Customer name or email…"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px',
                borderRadius: 7, border: `1px solid ${T.border}`,
                fontSize: 13, fontFamily: T.font, color: T.navy, outline: 'none',
                marginBottom: 10,
              }}
            />
            {sarError && <div style={{ fontSize: 12, color: T.red, marginBottom: 8 }}>{sarError}</div>}
            <div style={{ fontSize: 11, color: T.muted, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '7px 10px', marginBottom: 16, lineHeight: 1.5 }}>
              Internal notes will be included in the export. Review with your DPO before sharing with the data subject.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowSar(false); setSarCustomer(''); setSarError(null) }} style={{ padding: '8px 18px', borderRadius: 7, border: `1px solid ${T.border}`, background: '#fff', color: T.navy, fontSize: 13, cursor: 'pointer', fontFamily: T.font }}>
                Cancel
              </button>
              <button
                onClick={generateSar}
                disabled={!sarCustomer.trim() || sarLoading}
                style={{ padding: '8px 22px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: sarCustomer.trim() && !sarLoading ? 'pointer' : 'default', fontFamily: T.font, background: sarCustomer.trim() && !sarLoading ? '#92400e' : '#e5e7eb', color: sarCustomer.trim() && !sarLoading ? '#fff' : T.muted }}
              >
                {sarLoading ? 'Generating…' : 'Generate & Download'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
