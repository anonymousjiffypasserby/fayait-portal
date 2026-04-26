import { useState, useCallback } from 'react'
import { T } from './shared'
import zammadApi from '../../services/zammadApi'

// ── Shared sub-components ─────────────────────────────────────────────────────

function ReportShell({ title, description, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>{title}</h2>
        <p style={{ margin: '4px 0 16px', fontSize: 13, color: T.muted }}>{description}</p>
      </div>
      {children}
    </div>
  )
}

function FilterBar({ children, onGenerate, loading }) {
  return (
    <div style={{
      padding: '12px 24px', background: '#fff', borderBottom: `1px solid ${T.border}`,
      display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', flexShrink: 0,
    }}>
      {children}
      <button onClick={onGenerate} disabled={loading} style={{
        padding: '8px 16px', borderRadius: 8, border: 'none',
        background: loading ? '#e5e7eb' : T.navy, color: '#fff',
        fontWeight: 600, fontSize: 13, cursor: loading ? 'default' : 'pointer', fontFamily: T.font,
      }}>
        {loading ? 'Loading…' : 'Generate Report'}
      </button>
    </div>
  )
}

function SummaryBar({ stats }) {
  return (
    <div style={{ display: 'flex', gap: 20, padding: '12px 24px', background: '#f8fafc', borderBottom: `1px solid ${T.border}`, flexShrink: 0, flexWrap: 'wrap' }}>
      {stats.map((s, i) => (
        <div key={i} style={{ minWidth: 90 }}>
          <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: T.font }}>{s.label}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: s.color || T.text, marginTop: 2 }}>{s.value ?? '—'}</div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ message = 'Click Generate Report to load data.' }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: T.muted }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🎫</div>
      <div style={{ fontSize: 14, fontFamily: T.font }}>{message}</div>
    </div>
  )
}

function ClientExportBar({ rows, columns, filename }) {
  const [exporting, setExporting] = useState(false)

  const downloadCsv = () => {
    setExporting(true)
    try {
      const header = columns.map(c => c.label).join(',')
      const body = rows.map(r =>
        columns.map(c => {
          const v = r[c.key] ?? ''
          return typeof v === 'string' && v.includes(',') ? `"${v}"` : v
        }).join(',')
      ).join('\n')
      const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ padding: '10px 24px', background: '#fff', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
      <button onClick={downloadCsv} disabled={exporting} style={{
        padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`,
        background: '#fff', color: T.text, fontWeight: 500, fontSize: 13,
        cursor: 'pointer', fontFamily: T.font,
      }}>
        {exporting ? 'Exporting…' : '↓ Export CSV'}
      </button>
    </div>
  )
}

function SortableTable({ columns, rows }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey]; const bv = b[sortKey]
        const cmp = (av ?? '') < (bv ?? '') ? -1 : (av ?? '') > (bv ?? '') ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : rows

  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: T.font }}>
        <thead>
          <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
            {columns.map(col => (
              <th key={col.key} onClick={() => handleSort(col.key)} style={{
                padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: T.muted,
                fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4,
                whiteSpace: 'nowrap', cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
              }}>
                {col.label}{sortKey === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
              {columns.map(col => (
                <td key={col.key} style={{
                  padding: '8px 12px', borderBottom: `1px solid ${T.border}`,
                  color: T.text, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InlineBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 80, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color || T.blue, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, color: T.text, minWidth: 24 }}>{value}</span>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_LABELS = { 1: 'Low', 2: 'Normal', 3: 'High', 4: 'Emergency' }
const PRIORITY_COLORS_MAP = { 1: '#94a3b8', 2: '#3b82f6', 3: '#f59e0b', 4: '#e74c3c' }
const STATE_LABEL = { new: 'New', open: 'Open', 'pending reminder': 'Pending', closed: 'Closed' }

const fmtDur = (ms) => {
  if (ms == null || ms < 0) return '—'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const isoWeek = (d) => {
  const dt = new Date(d)
  const day = dt.getUTCDay() || 7
  dt.setUTCDate(dt.getUTCDate() + 4 - day)
  const jan1 = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
  const wk = Math.ceil((((dt - jan1) / 86400000) + 1) / 7)
  return `${dt.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`
}

const median = (arr) => {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

async function loadTickets(limit = 200) {
  return zammadApi.getAllTickets(limit)
    .then(r => Array.isArray(r) ? r : [])
}

// ── Overview ──────────────────────────────────────────────────────────────────
function TicketOverview() {
  const [rows,    setRows]    = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const tickets = await loadTickets(500)
      const weekMap = {}
      tickets.forEach(t => {
        const wk = isoWeek(t.created_at)
        if (!weekMap[wk]) weekMap[wk] = { week: wk, new: 0, open: 0, pending: 0, closed: 0, total: 0 }
        const state = (t.state || '').toLowerCase()
        if (state === 'new') weekMap[wk].new++
        else if (state === 'open') weekMap[wk].open++
        else if (state.startsWith('pending')) weekMap[wk].pending++
        else if (state === 'closed') weekMap[wk].closed++
        weekMap[wk].total++
      })
      setRows(Object.values(weekMap).sort((a, b) => b.week.localeCompare(a.week)).slice(0, 26))
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const totals = rows ? rows.reduce((a, r) => ({
    new: a.new + r.new, open: a.open + r.open,
    pending: a.pending + r.pending, closed: a.closed + r.closed, total: a.total + r.total,
  }), { new: 0, open: 0, pending: 0, closed: 0, total: 0 }) : null

  const cols = [
    { key: 'week',    label: 'Week' },
    { key: 'new',     label: 'New',     render: v => <InlineBar value={v} max={totals?.total || 1} color="#1D9E75" /> },
    { key: 'open',    label: 'Open',    render: v => <InlineBar value={v} max={totals?.total || 1} color="#3b82f6" /> },
    { key: 'pending', label: 'Pending', render: v => <InlineBar value={v} max={totals?.total || 1} color="#f59e0b" /> },
    { key: 'closed',  label: 'Closed',  render: v => <InlineBar value={v} max={totals?.total || 1} color="#94a3b8" /> },
    { key: 'total',   label: 'Total' },
  ]

  return (
    <ReportShell title="Ticket Overview" description="Weekly ticket volume grouped by state (last 26 weeks).">
      <FilterBar onGenerate={generate} loading={loading} />
      {totals && (
        <SummaryBar stats={[
          { label: 'Total',   value: totals.total },
          { label: 'New',     value: totals.new,     color: '#1D9E75' },
          { label: 'Open',    value: totals.open,     color: '#3b82f6' },
          { label: 'Pending', value: totals.pending,  color: '#f59e0b' },
          { label: 'Closed',  value: totals.closed,   color: '#888' },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!rows && !loading && <EmptyState />}
        {rows && rows.length === 0 && <EmptyState message="No tickets found." />}
        {rows && rows.length > 0 && <SortableTable columns={cols} rows={rows} />}
      </div>
      {rows?.length > 0 && <ClientExportBar rows={rows} columns={cols.map(c => ({ ...c, render: undefined }))} filename="Ticket-Overview.csv" />}
    </ReportShell>
  )
}

// ── By Priority ───────────────────────────────────────────────────────────────
function TicketsByPriority() {
  const [rows,    setRows]    = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const tickets = await loadTickets(500)
      const map = {}
      tickets.forEach(t => {
        const pid = t.priority_id || 2
        if (!map[pid]) map[pid] = { priority_id: pid, priority: PRIORITY_LABELS[pid] || `P${pid}`, count: 0, open: 0, closed: 0, pending: 0 }
        map[pid].count++
        const state = (t.state || '').toLowerCase()
        if (state === 'open' || state === 'new') map[pid].open++
        else if (state === 'closed') map[pid].closed++
        else if (state.startsWith('pending')) map[pid].pending++
      })
      const total = tickets.length || 1
      const result = Object.values(map).map(r => ({ ...r, pct: Math.round((r.count / total) * 100) }))
      setRows(result.sort((a, b) => b.priority_id - a.priority_id))
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const maxCount = rows ? Math.max(...rows.map(r => r.count)) : 1

  const cols = [
    { key: 'priority', label: 'Priority', render: (v, row) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS_MAP[row.priority_id] || '#888', display: 'inline-block' }} />
        {v}
      </span>
    )},
    { key: 'count',   label: 'Total',   render: (v) => <InlineBar value={v} max={maxCount} color="#6366f1" /> },
    { key: 'open',    label: 'Open / New' },
    { key: 'pending', label: 'Pending' },
    { key: 'closed',  label: 'Closed' },
    { key: 'pct',     label: '% of Total', render: v => `${v}%` },
  ]

  return (
    <ReportShell title="Tickets by Priority" description="Count of tickets broken down by priority level.">
      <FilterBar onGenerate={generate} loading={loading} />
      {rows && (
        <SummaryBar stats={rows.map(r => ({
          label: r.priority, value: r.count, color: PRIORITY_COLORS_MAP[r.priority_id],
        }))} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!rows && !loading && <EmptyState />}
        {rows && rows.length === 0 && <EmptyState message="No tickets found." />}
        {rows && rows.length > 0 && <SortableTable columns={cols} rows={rows} />}
      </div>
      {rows?.length > 0 && <ClientExportBar rows={rows} columns={[
        { key: 'priority', label: 'Priority' }, { key: 'count', label: 'Total' },
        { key: 'open', label: 'Open/New' }, { key: 'pending', label: 'Pending' },
        { key: 'closed', label: 'Closed' }, { key: 'pct', label: '% of Total' },
      ]} filename="Tickets-by-Priority.csv" />}
    </ReportShell>
  )
}

// ── By Group ──────────────────────────────────────────────────────────────────
function TicketsByGroup() {
  const [rows,    setRows]    = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const tickets = await loadTickets(500)
      const map = {}
      tickets.forEach(t => {
        const g = t.group || '(None)'
        if (!map[g]) map[g] = { group: g, total: 0, open: 0, pending: 0, closed: 0, unassigned: 0 }
        map[g].total++
        const state = (t.state || '').toLowerCase()
        if (state === 'open' || state === 'new') map[g].open++
        else if (state === 'closed') map[g].closed++
        else if (state.startsWith('pending')) map[g].pending++
        if (!t.owner || t.owner === '-') map[g].unassigned++
      })
      setRows(Object.values(map).sort((a, b) => b.total - a.total))
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const maxCount = rows ? Math.max(...rows.map(r => r.total)) : 1

  const cols = [
    { key: 'group',      label: 'Group / Team' },
    { key: 'total',      label: 'Total',      render: (v) => <InlineBar value={v} max={maxCount} color="#6366f1" /> },
    { key: 'open',       label: 'Open / New' },
    { key: 'pending',    label: 'Pending' },
    { key: 'closed',     label: 'Closed' },
    { key: 'unassigned', label: 'Unassigned', render: v => (
      <span style={{ color: v > 0 ? T.orange : T.text, fontWeight: v > 0 ? 600 : 400 }}>{v}</span>
    )},
  ]

  return (
    <ReportShell title="Tickets by Group" description="Ticket counts per group/team, including unassigned breakdown.">
      <FilterBar onGenerate={generate} loading={loading} />
      {rows && (
        <SummaryBar stats={[
          { label: 'Groups', value: rows.length },
          { label: 'Total Tickets', value: rows.reduce((a, r) => a + r.total, 0) },
          { label: 'Unassigned', value: rows.reduce((a, r) => a + r.unassigned, 0), color: T.orange },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!rows && !loading && <EmptyState />}
        {rows && rows.length === 0 && <EmptyState message="No tickets found." />}
        {rows && rows.length > 0 && <SortableTable columns={cols} rows={rows} />}
      </div>
      {rows?.length > 0 && <ClientExportBar rows={rows} columns={cols} filename="Tickets-by-Group.csv" />}
    </ReportShell>
  )
}

// ── Response Time ─────────────────────────────────────────────────────────────
function ResponseTime() {
  const [rows,    setRows]    = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const tickets = await loadTickets(300)
      const withResponse = tickets.filter(t => t.first_response_at && t.created_at)

      const agentMap = {}
      const allMs = []

      withResponse.forEach(t => {
        const ms = new Date(t.first_response_at) - new Date(t.created_at)
        if (ms < 0) return
        allMs.push(ms)
        const owner = t.owner && t.owner !== '-' ? t.owner : '(Unassigned)'
        if (!agentMap[owner]) agentMap[owner] = { agent: owner, count: 0, totalMs: 0, all: [] }
        agentMap[owner].count++
        agentMap[owner].totalMs += ms
        agentMap[owner].all.push(ms)
      })

      const result = Object.values(agentMap).map(a => ({
        agent:   a.agent,
        count:   a.count,
        avg:     Math.round(a.totalMs / a.count),
        min:     Math.min(...a.all),
        max:     Math.max(...a.all),
        median:  Math.round(median(a.all)),
      }))

      setSummary({
        total: withResponse.length,
        avg:   allMs.length ? Math.round(allMs.reduce((a, b) => a + b, 0) / allMs.length) : 0,
        min:   allMs.length ? Math.min(...allMs) : 0,
        max:   allMs.length ? Math.max(...allMs) : 0,
        median: Math.round(median(allMs)),
      })
      setRows(result.sort((a, b) => a.avg - b.avg))
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const cols = [
    { key: 'agent',  label: 'Agent' },
    { key: 'count',  label: 'Tickets' },
    { key: 'avg',    label: 'Avg Response', render: v => fmtDur(v) },
    { key: 'median', label: 'Median',        render: v => fmtDur(v) },
    { key: 'min',    label: 'Fastest',       render: v => fmtDur(v) },
    { key: 'max',    label: 'Slowest',       render: v => fmtDur(v) },
  ]

  return (
    <ReportShell title="Response Time" description="Average time from ticket creation to first agent response, grouped by agent.">
      <FilterBar onGenerate={generate} loading={loading} />
      {summary && (
        <SummaryBar stats={[
          { label: 'Tickets Measured', value: summary.total },
          { label: 'Avg Response',     value: fmtDur(summary.avg),    color: T.blue },
          { label: 'Median',           value: fmtDur(summary.median), color: T.blue },
          { label: 'Fastest',          value: fmtDur(summary.min),    color: '#1D9E75' },
          { label: 'Slowest',          value: fmtDur(summary.max),    color: T.red },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!rows && !loading && <EmptyState />}
        {rows && rows.length === 0 && <EmptyState message="No tickets with response time data found." />}
        {rows && rows.length > 0 && <SortableTable columns={cols} rows={rows} />}
      </div>
      {rows?.length > 0 && <ClientExportBar rows={rows.map(r => ({ ...r, avg: fmtDur(r.avg), median: fmtDur(r.median), min: fmtDur(r.min), max: fmtDur(r.max) }))} columns={cols} filename="Response-Time.csv" />}
    </ReportShell>
  )
}

// ── Resolution Time ───────────────────────────────────────────────────────────
function ResolutionTime() {
  const [rows,    setRows]    = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const tickets = await zammadApi.getTicketsByState('closed', 300).then(r => Array.isArray(r) ? r : [])
      const withClose = tickets.filter(t => t.close_at && t.created_at)

      const agentMap = {}
      const allMs = []

      withClose.forEach(t => {
        const ms = new Date(t.close_at) - new Date(t.created_at)
        if (ms < 0) return
        allMs.push(ms)
        const owner = t.owner && t.owner !== '-' ? t.owner : '(Unassigned)'
        if (!agentMap[owner]) agentMap[owner] = { agent: owner, count: 0, totalMs: 0, all: [] }
        agentMap[owner].count++
        agentMap[owner].totalMs += ms
        agentMap[owner].all.push(ms)
      })

      const result = Object.values(agentMap).map(a => ({
        agent:  a.agent,
        count:  a.count,
        avg:    Math.round(a.totalMs / a.count),
        min:    Math.min(...a.all),
        max:    Math.max(...a.all),
        median: Math.round(median(a.all)),
      }))

      setSummary({
        total:  withClose.length,
        avg:    allMs.length ? Math.round(allMs.reduce((a, b) => a + b, 0) / allMs.length) : 0,
        min:    allMs.length ? Math.min(...allMs) : 0,
        max:    allMs.length ? Math.max(...allMs) : 0,
        median: Math.round(median(allMs)),
      })
      setRows(result.sort((a, b) => a.avg - b.avg))
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const cols = [
    { key: 'agent',  label: 'Agent' },
    { key: 'count',  label: 'Closed' },
    { key: 'avg',    label: 'Avg Resolution', render: v => fmtDur(v) },
    { key: 'median', label: 'Median',          render: v => fmtDur(v) },
    { key: 'min',    label: 'Fastest',          render: v => fmtDur(v) },
    { key: 'max',    label: 'Slowest',          render: v => fmtDur(v) },
  ]

  return (
    <ReportShell title="Resolution Time" description="Time from ticket creation to close, for all resolved tickets.">
      <FilterBar onGenerate={generate} loading={loading} />
      {summary && (
        <SummaryBar stats={[
          { label: 'Closed Tickets', value: summary.total },
          { label: 'Avg Resolution', value: fmtDur(summary.avg),    color: T.blue },
          { label: 'Median',         value: fmtDur(summary.median), color: T.blue },
          { label: 'Fastest',        value: fmtDur(summary.min),    color: '#1D9E75' },
          { label: 'Slowest',        value: fmtDur(summary.max),    color: T.red },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!rows && !loading && <EmptyState />}
        {rows && rows.length === 0 && <EmptyState message="No closed tickets found." />}
        {rows && rows.length > 0 && <SortableTable columns={cols} rows={rows} />}
      </div>
      {rows?.length > 0 && <ClientExportBar rows={rows.map(r => ({ ...r, avg: fmtDur(r.avg), median: fmtDur(r.median), min: fmtDur(r.min), max: fmtDur(r.max) }))} columns={cols} filename="Resolution-Time.csv" />}
    </ReportShell>
  )
}

// ── Agent Performance ─────────────────────────────────────────────────────────
function AgentPerformance() {
  const [rows,    setRows]    = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const tickets = await loadTickets(500)
      const map = {}

      tickets.forEach(t => {
        const owner = t.owner && t.owner !== '-' ? t.owner : null
        if (!owner) return
        if (!map[owner]) map[owner] = { agent: owner, total: 0, open: 0, pending: 0, closed: 0, resMs: [], withSla: 0, withinSla: 0 }
        map[owner].total++
        const state = (t.state || '').toLowerCase()
        if (state === 'open' || state === 'new') map[owner].open++
        else if (state === 'closed') {
          map[owner].closed++
          if (t.close_at && t.created_at) {
            const ms = new Date(t.close_at) - new Date(t.created_at)
            if (ms >= 0) map[owner].resMs.push(ms)
          }
        } else if (state.startsWith('pending')) map[owner].pending++

        if (t.escalation_at) {
          map[owner].withSla++
          const deadline = new Date(t.escalation_at)
          const resolved = t.close_at ? new Date(t.close_at) : null
          if (resolved && resolved <= deadline) map[owner].withinSla++
        }
      })

      setRows(Object.values(map).map(a => ({
        agent:       a.agent,
        total:       a.total,
        open:        a.open,
        pending:     a.pending,
        closed:      a.closed,
        avg_res:     a.resMs.length ? Math.round(a.resMs.reduce((s, v) => s + v, 0) / a.resMs.length) : null,
        sla_pct:     a.withSla > 0 ? Math.round((a.withinSla / a.withSla) * 100) : null,
      })).sort((a, b) => b.total - a.total))
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const cols = [
    { key: 'agent',   label: 'Agent' },
    { key: 'total',   label: 'Total' },
    { key: 'open',    label: 'Open' },
    { key: 'pending', label: 'Pending' },
    { key: 'closed',  label: 'Closed', render: v => <span style={{ fontWeight: v > 0 ? 600 : 400, color: v > 0 ? '#1D9E75' : T.muted }}>{v}</span> },
    { key: 'avg_res', label: 'Avg Resolution', render: v => fmtDur(v) },
    { key: 'sla_pct', label: 'SLA %', render: v => v == null ? '—' : (
      <span style={{ fontWeight: 600, color: v >= 90 ? '#1D9E75' : v >= 70 ? '#f59e0b' : T.red }}>{v}%</span>
    )},
  ]

  return (
    <ReportShell title="Agent Performance" description="Tickets handled per agent with resolution time and SLA compliance.">
      <FilterBar onGenerate={generate} loading={loading} />
      {rows && (
        <SummaryBar stats={[
          { label: 'Agents', value: rows.length },
          { label: 'Total Handled', value: rows.reduce((a, r) => a + r.total, 0) },
          { label: 'Closed', value: rows.reduce((a, r) => a + r.closed, 0), color: '#1D9E75' },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!rows && !loading && <EmptyState />}
        {rows && rows.length === 0 && <EmptyState message="No agent data found." />}
        {rows && rows.length > 0 && <SortableTable columns={cols} rows={rows} />}
      </div>
      {rows?.length > 0 && <ClientExportBar rows={rows.map(r => ({ ...r, avg_res: fmtDur(r.avg_res), sla_pct: r.sla_pct != null ? `${r.sla_pct}%` : '—' }))} columns={cols} filename="Agent-Performance.csv" />}
    </ReportShell>
  )
}

// ── SLA Compliance ────────────────────────────────────────────────────────────
function SlaCompliance() {
  const [rows,    setRows]    = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const tickets = await loadTickets(500)
      const withSla = tickets.filter(t => t.escalation_at)

      const groupMap = {}
      withSla.forEach(t => {
        const g = t.group || '(None)'
        if (!groupMap[g]) groupMap[g] = { group: g, total: 0, within: 0, overdue: 0, open_at_risk: 0 }
        groupMap[g].total++
        const state = (t.state || '').toLowerCase()
        const deadline = new Date(t.escalation_at)

        if (state === 'closed' && t.close_at) {
          const closed = new Date(t.close_at)
          if (closed <= deadline) groupMap[g].within++
          else groupMap[g].overdue++
        } else {
          if (deadline < new Date()) groupMap[g].overdue++
          else groupMap[g].open_at_risk++
        }
      })

      const result = Object.values(groupMap).map(g => ({
        ...g,
        pct: g.total > 0 ? Math.round((g.within / g.total) * 100) : 0,
      }))

      const totals = result.reduce((a, r) => ({ total: a.total + r.total, within: a.within + r.within, overdue: a.overdue + r.overdue }), { total: 0, within: 0, overdue: 0 })
      setSummary({ ...totals, pct: totals.total > 0 ? Math.round((totals.within / totals.total) * 100) : 0, without_sla: tickets.length - withSla.length })
      setRows(result.sort((a, b) => a.pct - b.pct))
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const cols = [
    { key: 'group',       label: 'Group' },
    { key: 'total',       label: 'With SLA' },
    { key: 'within',      label: 'Within SLA', render: v => <span style={{ color: '#1D9E75', fontWeight: 600 }}>{v}</span> },
    { key: 'overdue',     label: 'Breached',   render: v => <span style={{ color: v > 0 ? T.red : T.text, fontWeight: v > 0 ? 600 : 400 }}>{v}</span> },
    { key: 'open_at_risk',label: 'Open (at risk)' },
    { key: 'pct',         label: 'Compliance %', render: v => (
      <span style={{ fontWeight: 700, color: v >= 90 ? '#1D9E75' : v >= 70 ? '#f59e0b' : T.red }}>{v}%</span>
    )},
  ]

  return (
    <ReportShell title="SLA Compliance" description="Percentage of tickets resolved within their SLA deadline, by group.">
      <FilterBar onGenerate={generate} loading={loading} />
      {summary && (
        <SummaryBar stats={[
          { label: 'With SLA',      value: summary.total },
          { label: 'Within SLA',    value: summary.within,      color: '#1D9E75' },
          { label: 'Breached',      value: summary.overdue,     color: T.red },
          { label: 'Compliance',    value: `${summary.pct}%`,   color: summary.pct >= 90 ? '#1D9E75' : summary.pct >= 70 ? '#f59e0b' : T.red },
          { label: 'No SLA',        value: summary.without_sla, color: T.muted },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!rows && !loading && <EmptyState />}
        {rows && rows.length === 0 && <EmptyState message="No tickets with SLA data found." />}
        {rows && rows.length > 0 && <SortableTable columns={cols} rows={rows} />}
      </div>
      {rows?.length > 0 && <ClientExportBar rows={rows.map(r => ({ ...r, pct: `${r.pct}%` }))} columns={cols} filename="SLA-Compliance.csv" />}
    </ReportShell>
  )
}

// ── CSAT placeholder ──────────────────────────────────────────────────────────
function CustomerSatisfaction() {
  return (
    <ReportShell title="Customer Satisfaction" description="CSAT scores from resolved ticket surveys.">
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 40 }}>
        <div style={{ fontSize: 40 }}>⭐</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.font }}>CSAT not yet configured</div>
        <div style={{ fontSize: 13, color: T.muted, textAlign: 'center', maxWidth: 380, fontFamily: T.font }}>
          Customer satisfaction surveys are managed in Zammad. Enable the CSAT feature in Zammad settings, then return here to view results.
        </div>
      </div>
    </ReportShell>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function TicketReports({ view }) {
  switch (view) {
    case 'tk-overview':     return <TicketOverview />
    case 'tk-by-priority':  return <TicketsByPriority />
    case 'tk-by-group':     return <TicketsByGroup />
    case 'tk-response':     return <ResponseTime />
    case 'tk-resolution':   return <ResolutionTime />
    case 'tk-agent-perf':   return <AgentPerformance />
    case 'tk-sla':          return <SlaCompliance />
    case 'tk-csat':         return <CustomerSatisfaction />
    default:                return null
  }
}
