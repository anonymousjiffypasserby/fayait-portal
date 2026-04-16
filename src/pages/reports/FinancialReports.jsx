import { useState, useCallback } from 'react'
import { T, fetchReport, exportReport, formatCurrency, inputStyle, selectStyle, btnStyle, outlineBtnStyle } from './shared'

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

function SummaryBar({ stats }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '12px 24px', background: '#f8fafc', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
      {stats.map((s, i) => (
        <div key={i} style={{ minWidth: 130 }}>
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

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: T.muted }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>💰</div>
      <div style={{ fontSize: 14 }}>Generate the report to see financial data.</div>
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
                <td key={col.key} style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, color: T.text, whiteSpace: 'nowrap' }}>
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

// ── Depreciation ──────────────────────────────────────────────────────────────
function Depreciation() {
  const [data, setData]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/financial/depreciation', {})) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/financial/depreciation', { format: fmt }, `Depreciation.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const cols = [
    { key: 'asset_tag',         label: 'Tag' },
    { key: 'hostname',          label: 'Hostname' },
    { key: 'manufacturer',      label: 'Manufacturer' },
    { key: 'model',             label: 'Model' },
    { key: 'asset_type',        label: 'Category' },
    { key: 'purchase_date',     label: 'Purchase Date' },
    { key: 'purchase_cost',     label: 'Purchase Cost', render: v => formatCurrency(v) },
    { key: 'current_value',     label: 'Current Value', render: v => v !== null ? formatCurrency(v) : '—' },
    { key: 'depreciation_loss', label: 'Depreciation', render: v => v !== null ? <span style={{ color: T.red }}>{formatCurrency(v)}</span> : '—' },
    { key: 'depreciation_method',label: 'Method' },
    { key: 'depreciation_years',label: 'Life (Yrs)' },
    { key: 'fully_depreciated', label: 'Fully Dep.', render: v => v === 'Yes' ? <span style={{ color: T.orange, fontWeight: 600 }}>Yes</span> : 'No' },
    { key: 'department',        label: 'Department' },
    { key: 'location',          label: 'Location' },
  ]

  return (
    <ReportShell title="Depreciation" description="Current book value of all assets based on depreciation method and purchase cost.">
      <FilterBar onGenerate={generate} loading={loading} />
      {data && (
        <SummaryBar stats={[
          { label: 'Assets', value: data.count },
          { label: 'Total Purchase Cost', value: formatCurrency(data.total_purchase_cost) },
          { label: 'Total Current Value', value: formatCurrency(data.total_current_value), color: T.green },
          { label: 'Total Depreciation', value: formatCurrency(data.total_depreciation), color: T.red },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && data.rows.length === 0 && <div style={{ padding: 40, color: T.muted, textAlign: 'center' }}>No assets with purchase data.</div>}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Purchase Cost ─────────────────────────────────────────────────────────────
function PurchaseCost() {
  const [groupBy, setGroupBy] = useState('category')
  const [data, setData]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/financial/purchase-cost', { group_by: groupBy })) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [groupBy])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/financial/purchase-cost', { group_by: groupBy, format: fmt }, `Purchase-Cost-By-${groupBy}.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const colLabel = groupBy.charAt(0).toUpperCase() + groupBy.slice(1)
  const cols = [
    { key: 'group_name',  label: colLabel },
    { key: 'asset_count', label: 'Assets' },
    { key: 'total_cost',  label: 'Total Cost', render: v => formatCurrency(v) },
    { key: 'avg_cost',    label: 'Avg Cost',   render: v => formatCurrency(v) },
    { key: 'min_cost',    label: 'Min Cost',   render: v => formatCurrency(v) },
    { key: 'max_cost',    label: 'Max Cost',   render: v => formatCurrency(v) },
  ]

  return (
    <ReportShell title="Purchase Cost" description="Total purchase cost of assets grouped by category, department, or location.">
      <FilterBar onGenerate={generate} loading={loading}>
        <div>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Group By</div>
          <select style={selectStyle} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
            <option value="category">Category</option>
            <option value="department">Department</option>
            <option value="location">Location</option>
          </select>
        </div>
      </FilterBar>
      {data && (
        <SummaryBar stats={[
          { label: 'Groups', value: data.count },
          { label: 'Grand Total', value: formatCurrency(data.grand_total), color: T.green },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && data.rows.length === 0 && <div style={{ padding: 40, color: T.muted, textAlign: 'center' }}>No data.</div>}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Maintenance Costs ─────────────────────────────────────────────────────────
function MaintenanceCosts() {
  const [data, setData]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/financial/maintenance-costs', {})) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/financial/maintenance-costs', { format: fmt }, `Maintenance-Costs.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const cols = [
    { key: 'asset_tag',         label: 'Tag' },
    { key: 'hostname',          label: 'Hostname' },
    { key: 'manufacturer',      label: 'Manufacturer' },
    { key: 'model',             label: 'Model' },
    { key: 'department',        label: 'Department' },
    { key: 'location',          label: 'Location' },
    { key: 'maintenance_count', label: 'Events' },
    { key: 'total_cost',        label: 'Total Cost', render: v => formatCurrency(v) },
    { key: 'last_maintenance',  label: 'Last Maintenance' },
  ]

  return (
    <ReportShell title="Maintenance Costs" description="Total maintenance spend per asset.">
      <FilterBar onGenerate={generate} loading={loading} />
      {data && (
        <SummaryBar stats={[
          { label: 'Assets with Maintenance', value: data.count },
          { label: 'Total Spend', value: formatCurrency(data.grand_total), color: T.orange },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && data.rows.length === 0 && <div style={{ padding: 40, color: T.muted, textAlign: 'center' }}>No maintenance records found.</div>}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

export default function FinancialReports({ view }) {
  if (view === 'depreciation')     return <Depreciation />
  if (view === 'purchase-cost')    return <PurchaseCost />
  if (view === 'maintenance-costs')return <MaintenanceCosts />
  return null
}
