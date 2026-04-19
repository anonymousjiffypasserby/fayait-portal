import { useState, useCallback } from 'react'
import { T, fetchReport, exportReport, formatDate, formatCurrency, inputStyle, selectStyle, btnStyle, outlineBtnStyle } from './shared'

// ── Shared primitives (same pattern as AssetReports) ─────────────────────────

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

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: T.muted }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 14 }}>No results. Adjust filters and generate the report.</div>
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
        const av = a[sortKey] ?? ''; const bv = b[sortKey] ?? ''
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : rows

  return (
    <div style={{ overflow: 'auto' }}>
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
                {col.label}{sortKey === col.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
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
                  color: col.color?.(row[col.key], row) || T.text,
                  whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis',
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtHours = (h) => (h == null ? '—' : `${parseFloat(h).toFixed(1)}h`)
const fmtNum   = (n) => (n == null ? '—' : String(n))

function useReport(path) {
  const [filters, setFilters] = useState({})
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const sf = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const generate = useCallback(async (f) => {
    setLoading(true)
    try { setData(await fetchReport(path, f)) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [path])

  const doExport = async (fmt, f, filename) => {
    setExporting(fmt)
    try { await exportReport(path, { ...f, format: fmt }, filename) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  return { filters, setFilters, sf, data, loading, exporting, generate, doExport }
}

// ════════════════════════════════════════════════════════════════════════════
// REPORT VIEWS
// ════════════════════════════════════════════════════════════════════════════

// ── Payroll Summary ───────────────────────────────────────────────────────────
function PayrollSummary() {
  const [payPeriodId, setPayPeriodId] = useState('')
  const [deptId, setDeptId]           = useState('')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const params = () => ({ pay_period_id: payPeriodId, department_id: deptId })

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/hr/payroll-summary', params())) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [payPeriodId, deptId])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/hr/payroll-summary', { ...params(), format: fmt }, `Payroll-Summary.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const deptCols = [
    { key: 'department',  label: 'Department' },
    { key: 'employees',   label: 'Employees', render: fmtNum },
    { key: 'gross',       label: 'Gross Pay',  render: formatCurrency },
    { key: 'deductions',  label: 'Deductions', render: formatCurrency },
    { key: 'net',         label: 'Net Pay',    render: formatCurrency },
  ]

  const jfCols = [
    { key: 'job_function', label: 'Job Function' },
    { key: 'employees',    label: 'Employees', render: fmtNum },
    { key: 'gross',        label: 'Gross Pay', render: formatCurrency },
    { key: 'net',          label: 'Net Pay',   render: formatCurrency },
  ]

  const rows = data?.by_department || []
  const jfRows = data?.by_job_function || []

  return (
    <ReportShell title="Payroll Summary" description="Total payroll cost broken down by department and job function.">
      <FilterBar onGenerate={generate} loading={loading}>
        <FilterField label="Pay Period ID">
          <input style={inputStyle} placeholder="e.g. 42" value={payPeriodId} onChange={e => setPayPeriodId(e.target.value)} />
        </FilterField>
        <FilterField label="Department ID">
          <input style={inputStyle} placeholder="Optional" value={deptId} onChange={e => setDeptId(e.target.value)} />
        </FilterField>
      </FilterBar>
      {data && (
        <SummaryBar stats={[
          { label: 'Total Employees', value: fmtNum(data.total_employees) },
          { label: 'Total Gross',     value: formatCurrency(data.total_gross), color: T.navy },
          { label: 'Total Net',       value: formatCurrency(data.total_net),   color: T.green },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, padding: '14px 0 6px' }}>By Department</div>
            {rows.length > 0 ? <SortableTable columns={deptCols} rows={rows} /> : <div style={{ color: T.muted, fontSize: 13, paddingBottom: 12 }}>No data.</div>}
            <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, padding: '18px 0 6px' }}>By Job Function</div>
            {jfRows.length > 0 ? <SortableTable columns={jfCols} rows={jfRows} /> : <div style={{ color: T.muted, fontSize: 13, paddingBottom: 12 }}>No data.</div>}
          </>
        )}
      </div>
      {data && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Hours Worked ──────────────────────────────────────────────────────────────
function HoursWorked() {
  const [f, setF] = useState({ date_from: '', date_to: '', employee_id: '', department_id: '' })
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const sf = (k, v) => setF(p => ({ ...p, [k]: v }))

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/hr/hours-worked', f)) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [f])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/hr/hours-worked', { ...f, format: fmt }, `Hours-Worked.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const rows = data?.rows || []
  const cols = [
    { key: 'employee_name',   label: 'Employee' },
    { key: 'department',      label: 'Department' },
    { key: 'week_start',      label: 'Week',      render: formatDate },
    { key: 'regular_hours',   label: 'Regular',   render: fmtHours },
    { key: 'overtime_hours',  label: 'Overtime',  render: fmtHours, color: (v) => v > 0 ? T.orange : undefined },
    { key: 'total_hours',     label: 'Total',     render: fmtHours },
    { key: 'scheduled_hours', label: 'Scheduled', render: fmtHours },
  ]

  return (
    <ReportShell title="Hours Worked" description="Employee hours per week with regular vs overtime breakdown.">
      <FilterBar onGenerate={generate} loading={loading}>
        <DateRange from={f.date_from} to={f.date_to} setFrom={v => sf('date_from', v)} setTo={v => sf('date_to', v)} />
        <FilterField label="Employee ID">
          <input style={inputStyle} placeholder="Optional" value={f.employee_id} onChange={e => sf('employee_id', e.target.value)} />
        </FilterField>
        <FilterField label="Department ID">
          <input style={inputStyle} placeholder="Optional" value={f.department_id} onChange={e => sf('department_id', e.target.value)} />
        </FilterField>
      </FilterBar>
      {data && (
        <SummaryBar stats={[
          { label: 'Total Hours',    value: fmtHours(data.total_hours) },
          { label: 'Regular Hours',  value: fmtHours(data.regular_hours) },
          { label: 'Overtime Hours', value: fmtHours(data.overtime_hours), color: data.overtime_hours > 0 ? T.orange : T.text },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && rows.length === 0 && <EmptyState />}
        {data && rows.length > 0 && <SortableTable columns={cols} rows={rows} />}
      </div>
      {data && rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Leave Balances ────────────────────────────────────────────────────────────
function LeaveBalances() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/hr/leave-balances', {})) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/hr/leave-balances', { format: fmt }, `Leave-Balances.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const rows = data?.rows || []
  const cols = [
    { key: 'employee_name', label: 'Employee' },
    { key: 'department',    label: 'Department' },
    { key: 'leave_type',    label: 'Leave Type' },
    { key: 'allocated',     label: 'Allocated', render: fmtNum },
    { key: 'used',          label: 'Used',      render: fmtNum },
    { key: 'remaining',     label: 'Remaining', render: fmtNum, color: (v) => v <= 2 ? T.red : v <= 5 ? T.orange : T.green },
  ]

  return (
    <ReportShell title="Leave Balances" description="All employees' current leave balances by type.">
      <FilterBar onGenerate={generate} loading={loading} />
      {data && (
        <SummaryBar stats={[
          { label: 'Employees',       value: fmtNum(data.total_employees) },
          { label: 'Avg Remaining',   value: fmtNum(data.avg_remaining) },
          { label: 'Most Remaining',  value: data.most_remaining_name  || '—' },
          { label: 'Least Remaining', value: data.least_remaining_name || '—', color: T.orange },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && rows.length === 0 && <EmptyState />}
        {data && rows.length > 0 && <SortableTable columns={cols} rows={rows} />}
      </div>
      {data && rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Leave Usage ───────────────────────────────────────────────────────────────
function LeaveUsage() {
  const [year, setYear]   = useState(String(new Date().getFullYear()))
  const [deptId, setDeptId] = useState('')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const params = () => ({ year, department_id: deptId })

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/hr/leave-usage', params())) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [year, deptId])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/hr/leave-usage', { ...params(), format: fmt }, `Leave-Usage-${year}.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const rows = data?.rows || []
  const cols = [
    { key: 'employee_name', label: 'Employee' },
    { key: 'department',    label: 'Department' },
    { key: 'leave_type',    label: 'Leave Type' },
    { key: 'days_taken',    label: 'Days Taken', render: fmtNum },
    { key: 'period',        label: 'Period' },
  ]

  return (
    <ReportShell title="Leave Usage" description="Leave days taken by employee, department, and type.">
      <FilterBar onGenerate={generate} loading={loading}>
        <FilterField label="Year">
          <input style={{ ...inputStyle, width: 80 }} value={year} onChange={e => setYear(e.target.value)} placeholder="2026" />
        </FilterField>
        <FilterField label="Department ID">
          <input style={inputStyle} placeholder="Optional" value={deptId} onChange={e => setDeptId(e.target.value)} />
        </FilterField>
      </FilterBar>
      {data && (
        <SummaryBar stats={[
          { label: 'Total Days Taken', value: fmtNum(data.total_days) },
          { label: 'Employees',        value: fmtNum(data.total_employees) },
          { label: 'Most Used Type',   value: data.most_used_type || '—' },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && rows.length === 0 && <EmptyState />}
        {data && rows.length > 0 && <SortableTable columns={cols} rows={rows} />}
      </div>
      {data && rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Overtime ──────────────────────────────────────────────────────────────────
function Overtime() {
  const [f, setF] = useState({ date_from: '', date_to: '' })
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const sf = (k, v) => setF(p => ({ ...p, [k]: v }))

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/hr/overtime', f)) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [f])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/hr/overtime', { ...f, format: fmt }, `Overtime.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const rows = data?.rows || []
  const cols = [
    { key: 'employee_name',  label: 'Employee' },
    { key: 'department',     label: 'Department' },
    { key: 'week_start',     label: 'Week',           render: formatDate },
    { key: 'regular_hours',  label: 'Regular Hours',  render: fmtHours },
    { key: 'overtime_hours', label: 'Overtime Hours', render: fmtHours, color: () => T.orange },
    { key: 'total_hours',    label: 'Total Hours',    render: fmtHours },
  ]

  return (
    <ReportShell title="Overtime" description="Employees who worked overtime hours in the selected period.">
      <FilterBar onGenerate={generate} loading={loading}>
        <DateRange from={f.date_from} to={f.date_to} setFrom={v => sf('date_from', v)} setTo={v => sf('date_to', v)} />
      </FilterBar>
      {data && (
        <SummaryBar stats={[
          { label: 'Employees w/ OT',  value: fmtNum(data.employees_with_overtime) },
          { label: 'Total OT Hours',   value: fmtHours(data.total_overtime_hours), color: T.orange },
          { label: 'Avg OT / Employee',value: fmtHours(data.avg_overtime_per_employee) },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && rows.length === 0 && <EmptyState />}
        {data && rows.length > 0 && <SortableTable columns={cols} rows={rows} />}
      </div>
      {data && rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Headcount ─────────────────────────────────────────────────────────────────
function Headcount() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/hr/headcount', {})) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/hr/headcount', { format: fmt }, `Headcount.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const rows = data?.rows || []
  const cols = [
    { key: 'employee_name',   label: 'Employee' },
    { key: 'department',      label: 'Department' },
    { key: 'job_function',    label: 'Job Function' },
    { key: 'contract_type',   label: 'Contract', render: v => v?.replace(/_/g, ' ') || '—' },
    { key: 'start_date',      label: 'Start Date',  render: formatDate },
    { key: 'employment_status', label: 'Status',    render: v => v?.replace(/_/g, ' ') || '—' },
  ]

  return (
    <ReportShell title="Headcount" description="Active workforce by department and contract type, with new hires and terminations.">
      <FilterBar onGenerate={generate} loading={loading} />
      {data && (
        <SummaryBar stats={[
          { label: 'Active Employees', value: fmtNum(data.active),     color: T.green },
          { label: 'New Hires',        value: fmtNum(data.new_hires),  color: T.blue },
          { label: 'Terminated',       value: fmtNum(data.terminated), color: T.red },
          { label: 'On Leave',         value: fmtNum(data.on_leave) },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && rows.length === 0 && <EmptyState />}
        {data && rows.length > 0 && (
          <>
            <SortableTable columns={cols} rows={rows} />
            {data.by_department?.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, padding: '18px 0 6px' }}>By Department</div>
                <SortableTable
                  columns={[
                    { key: 'department', label: 'Department' },
                    { key: 'count',      label: 'Employees', render: fmtNum },
                  ]}
                  rows={data.by_department}
                />
              </>
            )}
            {data.by_contract?.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, padding: '18px 0 6px' }}>By Contract Type</div>
                <SortableTable
                  columns={[
                    { key: 'contract_type', label: 'Contract Type', render: v => v?.replace(/_/g, ' ') || '—' },
                    { key: 'count',         label: 'Employees',     render: fmtNum },
                  ]}
                  rows={data.by_contract}
                />
              </>
            )}
          </>
        )}
      </div>
      {data && rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Schedule Coverage ─────────────────────────────────────────────────────────
function ScheduleCoverage() {
  const [weekStart, setWeekStart] = useState('')
  const [deptId, setDeptId]       = useState('')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const params = () => ({ week_start: weekStart, department_id: deptId })

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/hr/schedule-coverage', params())) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [weekStart, deptId])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/hr/schedule-coverage', { ...params(), format: fmt }, `Schedule-Coverage.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const rows = data?.rows || []
  const cols = [
    { key: 'employee_name', label: 'Employee' },
    { key: 'department',    label: 'Department' },
    { key: 'day',           label: 'Day',        render: formatDate },
    { key: 'shift',         label: 'Shift' },
    { key: 'covered',       label: 'Covered',    render: v => v ? '✓' : '✗', color: (v) => v ? T.green : T.red },
    { key: 'overtime_flag', label: 'OT Flag',    render: v => v ? 'Yes' : '—', color: (v) => v ? T.orange : undefined },
  ]

  return (
    <ReportShell title="Schedule Coverage" description="Shifts filled vs required, overtime flags, and uncovered days.">
      <FilterBar onGenerate={generate} loading={loading}>
        <FilterField label="Week Start">
          <input type="date" style={inputStyle} value={weekStart} onChange={e => setWeekStart(e.target.value)} />
        </FilterField>
        <FilterField label="Department ID">
          <input style={inputStyle} placeholder="Optional" value={deptId} onChange={e => setDeptId(e.target.value)} />
        </FilterField>
      </FilterBar>
      {data && (
        <SummaryBar stats={[
          { label: 'Shifts Required', value: fmtNum(data.shifts_required) },
          { label: 'Shifts Filled',   value: fmtNum(data.shifts_filled),   color: T.green },
          { label: 'Uncovered',       value: fmtNum(data.shifts_uncovered), color: data.shifts_uncovered > 0 ? T.red : T.text },
          { label: 'OT Flags',        value: fmtNum(data.overtime_flags),   color: data.overtime_flags > 0 ? T.orange : T.text },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && rows.length === 0 && <EmptyState />}
        {data && rows.length > 0 && <SortableTable columns={cols} rows={rows} />}
      </div>
      {data && rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function HRReports({ view }) {
  if (view === 'hr-payroll')   return <PayrollSummary />
  if (view === 'hr-hours')     return <HoursWorked />
  if (view === 'hr-leave-bal') return <LeaveBalances />
  if (view === 'hr-leave-use') return <LeaveUsage />
  if (view === 'hr-overtime')  return <Overtime />
  if (view === 'hr-headcount') return <Headcount />
  if (view === 'hr-schedule')  return <ScheduleCoverage />
  return null
}
