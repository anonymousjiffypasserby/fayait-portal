import { useState, useCallback } from 'react'
import { T, fetchReport, exportReport, formatDate, inputStyle, selectStyle, btnStyle, outlineBtnStyle } from './shared'

// ── Shared sub-components (mirror MonitoringReports pattern) ──────────────────

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
          <div style={{ fontSize: 18, fontWeight: 700, color: s.color || T.text, marginTop: 2 }}>{s.value ?? '—'}</div>
        </div>
      ))}
    </div>
  )
}

function ExportBar({ onCSV, onPDF, exporting }) {
  return (
    <div style={{ padding: '10px 24px', background: '#fff', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
      <button onClick={onCSV} disabled={!!exporting} style={outlineBtnStyle}>{exporting === 'csv' ? 'Exporting…' : '↓ Export CSV'}</button>
      <button onClick={onPDF} disabled={!!exporting} style={outlineBtnStyle}>{exporting === 'pdf' ? 'Exporting…' : '↓ Export PDF'}</button>
    </div>
  )
}

function EmptyState({ message = 'Generate the report to see data.' }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: T.muted }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
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
                <td key={col.key} style={{
                  padding: '8px 12px', borderBottom: `1px solid ${T.border}`,
                  color: T.text, whiteSpace: 'nowrap', maxWidth: 280,
                  overflow: 'hidden', textOverflow: 'ellipsis',
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

const STATUS_COLORS = {
  todo:        '#64748b',
  in_progress: '#2563eb',
  review:      '#7c3aed',
  done:        '#16a34a',
}
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }
const PRIORITY_COLORS = { low: '#16a34a', medium: '#ca8a04', high: '#ea580c', urgent: '#dc2626' }

function StatusBadge({ value }) {
  const color = STATUS_COLORS[value] || '#888'
  const label = STATUS_LABELS[value] || value
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      background: color + '18', color,
    }}>
      {label}
    </span>
  )
}

function ProgressBar({ value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${value || 0}%`, height: '100%', background: '#6366f1', borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 10, color: T.muted, minWidth: 28 }}>{value || 0}%</span>
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────────────────────
function ProjectOverview() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(null)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/projects/overview', {})) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/projects/overview', { format: fmt }, `Project-Overview.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(null) }
  }

  const totals = data ? data.rows.reduce((acc, r) => {
    acc.total       += r.total
    acc.done        += r.done
    acc.overdue     += r.overdue
    acc.in_progress += r.in_progress
    return acc
  }, { total: 0, done: 0, overdue: 0, in_progress: 0 }) : null

  const cols = [
    { key: 'department',   label: 'Department' },
    { key: 'total',        label: 'Total' },
    { key: 'todo',         label: 'To Do' },
    { key: 'in_progress',  label: 'In Progress' },
    { key: 'review',       label: 'Review' },
    { key: 'done',         label: 'Done' },
    { key: 'overdue',      label: 'Overdue', render: v => <span style={{ color: v > 0 ? T.red : T.text, fontWeight: v > 0 ? 600 : 400 }}>{v}</span> },
    { key: 'avg_progress', label: 'Avg Progress', render: v => <ProgressBar value={v} /> },
  ]

  return (
    <ReportShell title="Project Overview" description="Status breakdown and completion rates by department.">
      <FilterBar onGenerate={generate} loading={loading} />
      {totals && (
        <SummaryBar stats={[
          { label: 'Total Projects', value: totals.total },
          { label: 'In Progress',    value: totals.in_progress, color: '#2563eb' },
          { label: 'Completed',      value: totals.done,        color: T.green },
          { label: 'Overdue',        value: totals.overdue,     color: T.red },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && data.rows.length === 0 && <EmptyState message="No projects found." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── By Department ─────────────────────────────────────────────────────────────
function ProjectsByDepartment() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(null)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/projects/by-department', {})) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/projects/by-department', { format: fmt }, `Projects-by-Department.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(null) }
  }

  const cols = [
    { key: 'department',   label: 'Department' },
    { key: 'status',       label: 'Status',       render: v => <StatusBadge value={v} /> },
    { key: 'count',        label: 'Count' },
    { key: 'avg_progress', label: 'Avg Progress', render: v => <ProgressBar value={v} /> },
  ]

  return (
    <ReportShell title="Projects by Department" description="Project counts and progress grouped by department and status.">
      <FilterBar onGenerate={generate} loading={loading} />
      {data && (
        <SummaryBar stats={[
          { label: 'Departments', value: data ? new Set(data.rows.map(r => r.department)).size : 0 },
          { label: 'Total Rows',  value: data?.count },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && data.rows.length === 0 && <EmptyState message="No project data found." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── By User ───────────────────────────────────────────────────────────────────
function ProjectsByUser() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(null)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/projects/by-user', {})) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/projects/by-user', { format: fmt }, `Projects-by-User.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(null) }
  }

  const cols = [
    { key: 'user_name',            label: 'User' },
    { key: 'projects_assigned',    label: 'Projects' },
    { key: 'tasks_total',          label: 'Tasks Total' },
    { key: 'tasks_done',           label: 'Tasks Done' },
    { key: 'task_completion_pct',  label: 'Task Completion', render: v => <ProgressBar value={v} /> },
    { key: 'avg_project_progress', label: 'Avg Progress',    render: v => <ProgressBar value={v} /> },
  ]

  return (
    <ReportShell title="Projects by User" description="Workload breakdown per team member — projects assigned, task counts, and completion rates.">
      <FilterBar onGenerate={generate} loading={loading} />
      {data && (
        <SummaryBar stats={[
          { label: 'Team Members', value: data?.count },
          { label: 'Avg Projects/Person', value: data?.count > 0 ? Math.round(data.rows.reduce((s, r) => s + r.projects_assigned, 0) / data.count) : 0 },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!data && !loading && <EmptyState />}
        {data && data.rows.length === 0 && <EmptyState message="No users found." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Overdue ───────────────────────────────────────────────────────────────────
function OverdueProjects() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(null)

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/projects/overdue', {})) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/projects/overdue', { format: fmt }, `Overdue-Projects.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(null) }
  }

  const cols = [
    { key: 'title',        label: 'Project' },
    { key: 'status',       label: 'Status',       render: v => <StatusBadge value={v} /> },
    { key: 'priority',     label: 'Priority',     render: v => <span style={{ color: PRIORITY_COLORS[v] || T.muted, fontWeight: 600, textTransform: 'capitalize' }}>{v}</span> },
    { key: 'due_date',     label: 'Due Date',     render: v => <span style={{ color: T.red }}>{formatDate(v)}</span> },
    { key: 'days_overdue', label: 'Days Overdue', render: v => <span style={{ color: T.red, fontWeight: 700 }}>{v}</span> },
    { key: 'assignee',     label: 'Assignee' },
    { key: 'department',   label: 'Department' },
    { key: 'progress',     label: 'Progress',     render: v => <ProgressBar value={v} /> },
  ]

  const maxDays = data ? Math.max(0, ...data.rows.map(r => r.days_overdue)) : 0

  return (
    <ReportShell title="Overdue Projects" description="All projects past their due date that are not yet complete.">
      <FilterBar onGenerate={generate} loading={loading} />
      {data && (
        <SummaryBar stats={[
          { label: 'Overdue Projects', value: data.count, color: T.red },
          { label: 'Most Overdue',     value: maxDays > 0 ? `${maxDays}d` : '—', color: T.red },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!data && !loading && <EmptyState message="Generate the report to see overdue projects." />}
        {data && data.rows.length === 0 && <EmptyState message="No overdue projects." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Activity ──────────────────────────────────────────────────────────────────
function ProjectActivity() {
  const [filters, setFilters]   = useState({ date_from: '', date_to: '', user_id: '' })
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(null)
  const sf = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/projects/activity', filters)) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [filters])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/projects/activity', { ...filters, format: fmt }, `Project-Activity.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(null) }
  }

  const ACTION_LABELS = {
    status_changed:   'Status Changed',
    task_added:       'Task Added',
    task_completed:   'Task Completed',
    task_deleted:     'Task Deleted',
    comment_added:    'Comment',
    signed_off:       'Signed Off',
    project_created:  'Created',
    project_updated:  'Updated',
    project_deleted:  'Deleted',
    attachment_added: 'File Uploaded',
  }

  const cols = [
    { key: 'created_at',    label: 'Date/Time',    render: v => formatDate(v) },
    { key: 'action',        label: 'Action',       render: v => ACTION_LABELS[v] || v },
    { key: 'performed_by',  label: 'Performed By' },
    { key: 'project_title', label: 'Project' },
    { key: 'details',       label: 'Details',      render: v => {
      try { const d = JSON.parse(v); return d.note || d.new_status || d.title || JSON.stringify(d) }
      catch { return v || '—' }
    }},
  ]

  return (
    <ReportShell title="Project Activity" description="Audit log of project events — filterable by date range and user.">
      <FilterBar onGenerate={generate} loading={loading}>
        <FilterField label="From">
          <input type="date" style={inputStyle} value={filters.date_from} onChange={e => sf('date_from', e.target.value)} />
        </FilterField>
        <FilterField label="To">
          <input type="date" style={inputStyle} value={filters.date_to} onChange={e => sf('date_to', e.target.value)} />
        </FilterField>
        <FilterField label="User ID">
          <input style={{ ...inputStyle, width: 200 }} placeholder="Filter by user ID…" value={filters.user_id} onChange={e => sf('user_id', e.target.value)} />
        </FilterField>
      </FilterBar>
      {data && (
        <SummaryBar stats={[
          { label: 'Events', value: data.count },
          { label: 'Unique Users', value: new Set(data.rows.map(r => r.performed_by)).size },
          { label: 'Unique Projects', value: new Set(data.rows.map(r => r.project_title)).size },
        ]} />
      )}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        {!data && !loading && <EmptyState message="Set filters and generate to see project activity." />}
        {data && data.rows.length === 0 && <EmptyState message="No activity in this period." />}
        {data && data.rows.length > 0 && <SortableTable columns={cols} rows={data.rows} />}
      </div>
      {data && data.rows.length > 0 && <ExportBar onCSV={() => doExport('csv')} onPDF={() => doExport('pdf')} exporting={exporting} />}
    </ReportShell>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function ProjectReports({ view }) {
  if (view === 'proj-overview')   return <ProjectOverview />
  if (view === 'proj-by-dept')    return <ProjectsByDepartment />
  if (view === 'proj-by-user')    return <ProjectsByUser />
  if (view === 'proj-overdue')    return <OverdueProjects />
  if (view === 'proj-activity')   return <ProjectActivity />
  return null
}
