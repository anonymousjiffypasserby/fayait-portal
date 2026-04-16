import { useState, useCallback } from 'react'
import { T, fetchReport, exportReport, inputStyle, selectStyle, btnStyle, outlineBtnStyle } from './shared'

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
    <div style={{ display: 'flex', gap: 16, padding: '12px 24px', background: '#f8fafc', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
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
  return (
    <div style={{ padding: '10px 24px', background: '#fff', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
      <button onClick={onCSV} disabled={exporting} style={outlineBtnStyle}>{exporting === 'csv' ? 'Exporting…' : '↓ Export CSV'}</button>
      <button onClick={onPDF} disabled={exporting} style={outlineBtnStyle}>{exporting === 'pdf' ? 'Exporting…' : '↓ Export PDF'}</button>
    </div>
  )
}

function EmptyState({ icon = '📡', message = 'Generate the report to see monitoring data.' }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: T.muted }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{message}</div>
    </div>
  )
}

function SortableTable({ columns, rows }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey]; const bv = b[sortKey]
        const cmp = (av ?? '') < (bv ?? '') ? -1 : av > bv ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : rows
  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
            {columns.map(col => (
              <th key={col.key} onClick={() => handleSort(col.key)} style={{
                padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: T.muted,
                fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4,
                whiteSpace: 'nowrap', cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
              }}>
                {col.label}{sortKey === col.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
              {columns.map(col => (
                <td key={col.key} style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, color: T.text, whiteSpace: 'nowrap', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

// ── Alert History ─────────────────────────────────────────────────────────────
function AlertHistory() {
  const [filters, setFilters] = useState({ type: '', severity: '', date_from: '', date_to: '' })
  const [data, setData]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)
  const sf = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/monitoring/alert-history', filters)) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [filters])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/monitoring/alert-history', { ...filters, format: fmt }, `Alert-History.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const SEVERITY_COLOR = { critical: T.red, warning: T.orange, info: T.blue }
  const cols = [
    { key: 'created_at', label: 'Date/Time' },
    { key: 'severity',   label: 'Severity', render: v => <span style={{ color: SEVERITY_COLOR[v] || T.text, fontWeight: 600, textTransform: 'capitalize' }}>{v}</span> },
    { key: 'type',       label: 'Type' },
    { key: 'title',      label: 'Title', maxW: 240 },
    { key: 'message',    label: 'Message', maxW: 300, wrap: true },
    { key: 'hostname',   label: 'Asset' },
    { key: 'asset_tag',  label: 'Tag' },
    { key: 'read',       label: 'Read' },
  ]

  const bySeverity = (sev) => data ? data.rows.filter(r => r.severity === sev).length : 0

  return (
    <ReportShell title="Alert History" description="All notifications and monitoring alerts, filterable by type and severity.">
      <FilterBar onGenerate={generate} loading={loading}>
        <DateRange from={filters.date_from} to={filters.date_to} setFrom={v => sf('date_from', v)} setTo={v => sf('date_to', v)} />
        <FilterField label="Type">
          <input style={inputStyle} placeholder="e.g. asset_offline" value={filters.type} onChange={e => sf('type', e.target.value)} />
        </FilterField>
        <FilterField label="Severity">
          <select style={selectStyle} value={filters.severity} onChange={e => sf('severity', e.target.value)}>
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </FilterField>
      </FilterBar>
      {data && (
        <SummaryBar stats={[
          { label: 'Total Alerts', value: data.count },
          { label: 'Critical', value: bySeverity('critical'), color: T.red },
          { label: 'Warning',  value: bySeverity('warning'),  color: T.orange },
          { label: 'Info',     value: bySeverity('info'),     color: T.blue },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && data.rows.length === 0 && <EmptyState message="No alerts in this period." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Offline History ───────────────────────────────────────────────────────────
function OfflineHistory() {
  const [filters, setFilters] = useState({ date_from: '', date_to: '' })
  const [data, setData]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)
  const sf = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/monitoring/offline-history', filters)) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [filters])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/monitoring/offline-history', { ...filters, format: fmt }, `Offline-History.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const cols = [
    { key: 'offline_at',       label: 'Went Offline' },
    { key: 'hostname',         label: 'Hostname' },
    { key: 'asset_tag',        label: 'Tag' },
    { key: 'department',       label: 'Department' },
    { key: 'location',         label: 'Location' },
    { key: 'came_back_online', label: 'Last Online' },
  ]

  return (
    <ReportShell title="Offline History" description="All asset offline events from monitoring notifications.">
      <FilterBar onGenerate={generate} loading={loading}>
        <DateRange from={filters.date_from} to={filters.date_to} setFrom={v => sf('date_from', v)} setTo={v => sf('date_to', v)} />
      </FilterBar>
      {data && <SummaryBar stats={[{ label: 'Offline Events', value: data.count, color: T.orange }]} />}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!data && !loading && <EmptyState icon="📴" />}
        {data && data.rows.length === 0 && <EmptyState icon="✅" message="No offline events in this period." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Software Inventory ────────────────────────────────────────────────────────
function SoftwareInventory() {
  const [search, setSearch]   = useState('')
  const [data, setData]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/monitoring/software-inventory', {})) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/monitoring/software-inventory', { format: fmt }, `Software-Inventory.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const cols = [
    { key: 'name',         label: 'Software Name' },
    { key: 'version',      label: 'Version' },
    { key: 'publisher',    label: 'Publisher' },
    { key: 'device_count', label: 'Devices', render: v => <span style={{ fontWeight: 600, color: T.navy }}>{v}</span> },
    { key: 'devices',      label: 'Device List', maxW: 300, wrap: true },
  ]

  const filtered = data
    ? { ...data, rows: data.rows.filter(r => !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.publisher?.toLowerCase().includes(search.toLowerCase())) }
    : null

  return (
    <ReportShell title="Software Inventory" description="All unique software installed across company assets, aggregated by name, version, and publisher.">
      <FilterBar onGenerate={generate} loading={loading}>
        <FilterField label="Search">
          <input style={inputStyle} placeholder="Filter by name or publisher…" value={search} onChange={e => setSearch(e.target.value)} />
        </FilterField>
      </FilterBar>
      {filtered && <SummaryBar stats={[
        { label: 'Unique Titles', value: filtered.rows.length },
        { label: 'Total (all)', value: data.count },
      ]} />}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!data && !loading && <EmptyState icon="💿" message="Generate to see installed software across all assets." />}
        {data && filtered.rows.length === 0 && <EmptyState icon="🔍" message="No software matches the filter." />}
        {filtered && filtered.rows.length > 0 && <SortableTable columns={cols} rows={filtered.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Pending Updates ───────────────────────────────────────────────────────────
function PendingUpdates() {
  const [data, setData]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/monitoring/pending-updates', {})) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/monitoring/pending-updates', { format: fmt }, `Pending-Updates.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const cols = [
    { key: 'asset_tag',       label: 'Tag' },
    { key: 'hostname',        label: 'Hostname' },
    { key: 'manufacturer',    label: 'Manufacturer' },
    { key: 'model',           label: 'Model' },
    { key: 'asset_type',      label: 'Category' },
    { key: 'assigned_user',   label: 'Assigned To' },
    { key: 'department',      label: 'Department' },
    { key: 'location',        label: 'Location' },
    { key: 'pending_updates', label: 'Updates', render: v => <span style={{ color: T.orange, fontWeight: 700 }}>{v}</span> },
    { key: 'last_seen',       label: 'Last Seen' },
  ]

  const totalUpdates = data ? data.rows.reduce((s, r) => s + (parseInt(r.pending_updates) || 0), 0) : 0

  return (
    <ReportShell title="Pending Updates" description="Assets with outstanding Windows updates detected by the monitoring agent.">
      <FilterBar onGenerate={generate} loading={loading} />
      {data && <SummaryBar stats={[
        { label: 'Affected Assets', value: data.count, color: T.orange },
        { label: 'Total Pending Updates', value: totalUpdates, color: T.red },
      ]} />}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!data && !loading && <EmptyState icon="🔄" message="Generate to see assets with pending updates." />}
        {data && data.rows.length === 0 && <EmptyState icon="✅" message="All assets are up-to-date." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

export default function MonitoringReports({ view }) {
  if (view === 'alert-history')      return <AlertHistory />
  if (view === 'offline-history')    return <OfflineHistory />
  if (view === 'software-inventory') return <SoftwareInventory />
  if (view === 'pending-updates')    return <PendingUpdates />
  return null
}
