import { useState, useCallback, useEffect } from 'react'
import { T, fetchReport, exportReport, formatDate, formatCurrency, inputStyle, selectStyle, btnStyle, outlineBtnStyle, BASE, authHeaders } from './shared'
import { usePermission } from '../../hooks/usePermission'

// ── Shared primitives ─────────────────────────────────────────────────────────

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
      <button onClick={onGenerate} disabled={loading} style={btnStyle(T.navy)}>
        {loading ? 'Loading…' : 'Generate Report'}
      </button>
    </div>
  )
}

function FilterField({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      {children}
    </div>
  )
}

function SummaryBar({ stats }) {
  return (
    <div style={{
      display: 'flex', gap: 16, padding: '12px 24px',
      background: '#f8fafc', borderBottom: `1px solid ${T.border}`, flexShrink: 0,
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{ minWidth: 100 }}>
          <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: s.color || T.text, marginTop: 2 }}>{s.value}</div>
        </div>
      ))}
    </div>
  )
}

function ExportBar({ onCSV, onPDF, exporting }) {
  const { hasPermission } = usePermission()
  if (!hasPermission('reports', 'export')) return null
  return (
    <div style={{
      padding: '10px 24px', background: '#fff', borderTop: `1px solid ${T.border}`,
      display: 'flex', gap: 10, flexShrink: 0,
    }}>
      <button onClick={onCSV} disabled={exporting} style={outlineBtnStyle}>
        {exporting === 'csv' ? 'Exporting…' : '↓ Export CSV'}
      </button>
      <button onClick={onPDF} disabled={exporting} style={outlineBtnStyle}>
        {exporting === 'pdf' ? 'Exporting…' : '↓ Export PDF'}
      </button>
    </div>
  )
}

function EmptyState({ message = 'No results. Adjust filters and generate the report.' }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: T.muted }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 14 }}>{message}</div>
    </div>
  )
}

function SortableTable({ columns, rows, maxH = '100%' }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey]; const bv = b[sortKey]
        const cmp = (av === null || av === undefined ? '' : av) < (bv === null || bv === undefined ? '' : bv) ? -1 : av > bv ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : rows

  return (
    <div style={{ overflow: 'auto', maxHeight: maxH }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                style={{
                  padding: '9px 12px', textAlign: 'left', fontWeight: 600,
                  color: T.muted, fontSize: 11, textTransform: 'uppercase',
                  letterSpacing: 0.4, whiteSpace: 'nowrap', cursor: 'pointer',
                  borderBottom: `1px solid ${T.border}`, userSelect: 'none',
                }}
              >
                {col.label}
                {sortKey === col.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
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
                  color: T.text, whiteSpace: col.wrap ? 'normal' : 'nowrap',
                  maxWidth: col.maxW || 220, overflow: 'hidden', textOverflow: 'ellipsis',
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

// ── Date range fields (reused across all reports) ─────────────────────────────
function DateRange({ from, to, setFrom, setTo }) {
  return (
    <>
      <FilterField label="From">
        <input type="date" style={inputStyle} value={from} onChange={e => setFrom(e.target.value)} />
      </FilterField>
      <FilterField label="To">
        <input type="date" style={inputStyle} value={to} onChange={e => setTo(e.target.value)} />
      </FilterField>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// INDIVIDUAL REPORT VIEWS
// ════════════════════════════════════════════════════════════════════════════

// ── Inventory ─────────────────────────────────────────────────────────────────
function Inventory() {
  const [filters, setFilters] = useState({ status: '', category: '', location: '', department: '', manufacturer: '', model: '', date_from: '', date_to: '' })
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const sf = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/assets/inventory', filters)) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [filters])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/assets/inventory', { ...filters, format: fmt }, `Asset-Inventory.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const STATUSES = ['Ready to Deploy','Deployed','Pending','Un-deployable','Archived','Lost/Stolen','Maintenance']
  const cols = [
    { key: 'asset_tag', label: 'Tag' },
    { key: 'hostname', label: 'Hostname' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'model', label: 'Model' },
    { key: 'asset_type', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'assigned_user', label: 'Assigned To' },
    { key: 'department', label: 'Department' },
    { key: 'location', label: 'Location' },
    { key: 'purchase_date', label: 'Purchase Date' },
    { key: 'purchase_cost', label: 'Cost', render: v => formatCurrency(v) },
    { key: 'warranty_expires', label: 'Warranty' },
    { key: 'ip_address', label: 'IP' },
    { key: 'os', label: 'OS' },
    { key: 'last_seen', label: 'Last Seen' },
  ]

  return (
    <ReportShell title="Asset Inventory" description="All assets with full details. Use filters to narrow results.">
      <FilterBar onGenerate={generate} loading={loading}>
        <DateRange from={filters.date_from} to={filters.date_to} setFrom={v => sf('date_from', v)} setTo={v => sf('date_to', v)} />
        <FilterField label="Status">
          <select style={selectStyle} value={filters.status} onChange={e => sf('status', e.target.value)}>
            <option value="">All</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FilterField>
        <FilterField label="Category">
          <input style={inputStyle} placeholder="e.g. Laptop" value={filters.category} onChange={e => sf('category', e.target.value)} />
        </FilterField>
        <FilterField label="Location">
          <input style={inputStyle} placeholder="Location" value={filters.location} onChange={e => sf('location', e.target.value)} />
        </FilterField>
        <FilterField label="Department">
          <input style={inputStyle} placeholder="Department" value={filters.department} onChange={e => sf('department', e.target.value)} />
        </FilterField>
        <FilterField label="Manufacturer">
          <input style={inputStyle} placeholder="Manufacturer" value={filters.manufacturer} onChange={e => sf('manufacturer', e.target.value)} />
        </FilterField>
      </FilterBar>
      {data && (
        <SummaryBar stats={[
          { label: 'Total Assets', value: data.count },
          { label: 'Online', value: data.rows.filter(r => r.online).length, color: T.green },
          { label: 'Offline', value: data.rows.filter(r => !r.online).length, color: T.muted },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 0' }}>
        {!data && !loading && <EmptyState />}
        {data && data.rows.length === 0 && <EmptyState message="No assets match the selected filters." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Grouped report (by-status / by-location / by-department / by-category) ────
function GroupedReport({ view }) {
  const META = {
    'by-status':     { title: 'Assets by Status',     desc: 'Count of assets grouped by status.',     path: '/assets/by-status',     col: 'status',     colLabel: 'Status' },
    'by-location':   { title: 'Assets by Location',   desc: 'Count of assets grouped by location.',   path: '/assets/by-location',   col: 'location',   colLabel: 'Location' },
    'by-department': { title: 'Assets by Department', desc: 'Count of assets grouped by department.', path: '/assets/by-department', col: 'department', colLabel: 'Department' },
    'by-category':   { title: 'Assets by Category',   desc: 'Count of assets grouped by category.',   path: '/assets/by-category',   col: 'category',   colLabel: 'Category' },
  }
  const { title, desc, path, col, colLabel } = META[view]
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport(path, {})) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [path])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport(path, { format: fmt }, `${title.replace(/\s+/g, '-')}.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const cols = [
    { key: col,    label: colLabel },
    { key: 'count', label: 'Count' },
  ]
  const total = data ? data.rows.reduce((s, r) => s + parseInt(r.count || 0), 0) : 0

  return (
    <ReportShell title={title} description={desc}>
      <FilterBar onGenerate={generate} loading={loading} />
      {data && <SummaryBar stats={[{ label: 'Total Assets', value: total }, { label: 'Groups', value: data.rows.length }]} />}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && data.rows.length === 0 && <EmptyState message="No data." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Warranty Expiring ─────────────────────────────────────────────────────────
function WarrantyExpiring() {
  const [days, setDays] = useState('30')
  const [data, setData]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/assets/warranty-expiring', { days })) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [days])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/assets/warranty-expiring', { days, format: fmt }, `Warranty-Expiring.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const cols = [
    { key: 'asset_tag', label: 'Tag' }, { key: 'hostname', label: 'Hostname' },
    { key: 'manufacturer', label: 'Manufacturer' }, { key: 'model', label: 'Model' },
    { key: 'assigned_user', label: 'Assigned To' }, { key: 'department', label: 'Department' },
    { key: 'location', label: 'Location' },
    { key: 'warranty_expires', label: 'Expires', render: v => formatDate(v) },
    { key: 'days_remaining', label: 'Days Left', render: (v, row) => (
      <span style={{ color: parseInt(v) <= 7 ? T.red : parseInt(v) <= 14 ? T.orange : T.green, fontWeight: 600 }}>{v}</span>
    )},
  ]

  return (
    <ReportShell title="Warranty Expiring" description="Assets whose warranty expires within a configurable window.">
      <FilterBar onGenerate={generate} loading={loading}>
        <FilterField label="Expiring Within (Days)">
          <input type="number" style={{ ...inputStyle, width: 80 }} value={days} min="1" onChange={e => setDays(e.target.value)} />
        </FilterField>
      </FilterBar>
      {data && <SummaryBar stats={[{ label: 'Expiring Assets', value: data.count, color: T.orange }]} />}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && data.rows.length === 0 && <EmptyState message="No assets with expiring warranties in this window." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Audit Due ─────────────────────────────────────────────────────────────────
function AuditDue() {
  const [data, setData]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/assets/audit-due', {})) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/assets/audit-due', { format: fmt }, `Audit-Due.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const cols = [
    { key: 'asset_tag', label: 'Tag' }, { key: 'hostname', label: 'Hostname' },
    { key: 'manufacturer', label: 'Manufacturer' }, { key: 'model', label: 'Model' },
    { key: 'status', label: 'Status' }, { key: 'assigned_user', label: 'Assigned To' },
    { key: 'department', label: 'Department' }, { key: 'location', label: 'Location' },
    { key: 'last_audited_at', label: 'Last Audited' },
    { key: 'audit_status', label: 'Reason', render: v => (
      <span style={{ color: v === 'Never audited' ? T.red : T.orange }}>{v}</span>
    )},
  ]

  return (
    <ReportShell title="Audit Due" description="Assets that have never been audited, or were last audited over 1 year ago.">
      <FilterBar onGenerate={generate} loading={loading} />
      {data && <SummaryBar stats={[
        { label: 'Due for Audit', value: data.count, color: T.orange },
        { label: 'Never Audited', value: data.rows.filter(r => r.audit_status === 'Never audited').length, color: T.red },
      ]} />}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && data.rows.length === 0 && <EmptyState message="All assets are up-to-date on audits." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Checkout History ──────────────────────────────────────────────────────────
function CheckoutHistory() {
  const [filters, setFilters] = useState({ date_from: '', date_to: '', asset_id: '', user_id: '' })
  const [users, setUsers]     = useState([])
  const [data, setData]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)
  const sf = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  useEffect(() => {
    fetch(`${BASE}/api/users`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(rows => setUsers(rows))
      .catch(() => {})
  }, [])

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/assets/checkout-history', filters)) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [filters])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/assets/checkout-history', { ...filters, format: fmt }, `Checkout-History.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const cols = [
    { key: 'created_at', label: 'Date/Time' }, { key: 'action', label: 'Action' },
    { key: 'asset_tag', label: 'Tag' }, { key: 'hostname', label: 'Hostname' },
    { key: 'manufacturer', label: 'Manufacturer' }, { key: 'model', label: 'Model' },
    { key: 'performed_by', label: 'Performed By' },
    { key: 'assigned_to', label: 'Assigned To' }, { key: 'location', label: 'Location' },
  ]
  const checkouts = data ? data.rows.filter(r => r.action === 'checked_out').length : 0
  const checkins  = data ? data.rows.filter(r => r.action === 'checked_in').length  : 0

  return (
    <ReportShell title="Checkout History" description="All checkout and check-in events from the audit log.">
      <FilterBar onGenerate={generate} loading={loading}>
        <DateRange from={filters.date_from} to={filters.date_to} setFrom={v => sf('date_from', v)} setTo={v => sf('date_to', v)} />
        <FilterField label="User">
          <select style={selectStyle} value={filters.user_id} onChange={e => sf('user_id', e.target.value)}>
            <option value="">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
        </FilterField>
      </FilterBar>
      {data && <SummaryBar stats={[
        { label: 'Total Events', value: data.count },
        { label: 'Checkouts', value: checkouts, color: T.blue },
        { label: 'Check-ins', value: checkins, color: T.green },
      ]} />}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && data.rows.length === 0 && <EmptyState message="No checkout events in this period." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Never Checked In ──────────────────────────────────────────────────────────
function NeverCheckedIn() {
  const [data, setData]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/assets/never-checked-in', {})) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/assets/never-checked-in', { format: fmt }, `Never-Checked-In.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const cols = [
    { key: 'asset_tag', label: 'Tag' }, { key: 'hostname', label: 'Hostname' },
    { key: 'manufacturer', label: 'Manufacturer' }, { key: 'model', label: 'Model' },
    { key: 'assigned_user', label: 'Assigned To' }, { key: 'department', label: 'Department' },
    { key: 'location', label: 'Location' },
    { key: 'checkout_date', label: 'Checkout Date' },
    { key: 'expected_checkin_date', label: 'Expected Checkin' },
    { key: 'days_overdue', label: 'Days Overdue', render: v => (
      <span style={{ color: T.red, fontWeight: 600 }}>{v}</span>
    )},
  ]

  return (
    <ReportShell title="Never Checked In" description="Assets checked out past their expected check-in date.">
      <FilterBar onGenerate={generate} loading={loading} />
      {data && <SummaryBar stats={[{ label: 'Overdue Assets', value: data.count, color: T.red }]} />}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && data.rows.length === 0 && <EmptyState message="No overdue check-ins." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Age Report ────────────────────────────────────────────────────────────────
function AgeReport() {
  const [data, setData]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/assets/age', {})) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/assets/age', { format: fmt }, `Asset-Age.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const cols = [
    { key: 'asset_tag', label: 'Tag' }, { key: 'hostname', label: 'Hostname' },
    { key: 'manufacturer', label: 'Manufacturer' }, { key: 'model', label: 'Model' },
    { key: 'asset_type', label: 'Category' }, { key: 'status', label: 'Status' },
    { key: 'department', label: 'Department' }, { key: 'location', label: 'Location' },
    { key: 'created_at', label: 'Created' },
    { key: 'age_days', label: 'Age (Days)' },
    { key: 'age_range', label: 'Range' },
  ]

  const AGE_ORDER = ['<1 year','1–2 years','2–3 years','3–5 years','5+ years']

  return (
    <ReportShell title="Asset Age Report" description="Age of all assets from creation date, grouped into ranges.">
      <FilterBar onGenerate={generate} loading={loading} />
      {data && (
        <>
          <SummaryBar stats={[{ label: 'Total Assets', value: data.count }]} />
          {data.buckets && (
            <div style={{ display: 'flex', gap: 12, padding: '10px 24px', background: '#f8fafc', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              {AGE_ORDER.filter(k => data.buckets[k]).map(k => (
                <div key={k} style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: T.muted }}>{k}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>{data.buckets[k]}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && data.rows.length === 0 && <EmptyState message="No assets found." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function AssetReports({ view }) {
  if (view === 'inventory')         return <Inventory />
  if (view === 'by-status')         return <GroupedReport view={view} key={view} />
  if (view === 'by-location')       return <GroupedReport view={view} key={view} />
  if (view === 'by-department')     return <GroupedReport view={view} key={view} />
  if (view === 'by-category')       return <GroupedReport view={view} key={view} />
  if (view === 'warranty-expiring') return <WarrantyExpiring />
  if (view === 'audit-due')         return <AuditDue />
  if (view === 'checkout-history')  return <CheckoutHistory />
  if (view === 'never-checked-in')  return <NeverCheckedIn />
  if (view === 'age')               return <AgeReport />
  return null
}
