import { useState, useRef } from 'react'
import api from '../../../services/api'
import { T, btn } from '../shared'

const TEMPLATE_HEADERS = ['name', 'email', 'role', 'department', 'job_title', 'contract_type', 'start_date', 'phone']
const SAMPLE_ROW = ['Jane Smith', 'jane@company.com', 'staff', 'Engineering', 'Developer', 'Full Time', '2025-01-15', '+597 000 0000']

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(','), SAMPLE_ROW.join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'import_users_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/['"]/g, ''))
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']))
  })
}

const inputSt = { padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: T.font, boxSizing: 'border-box' }

function StepBadge({ n, active, done }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700,
      background: done ? '#3B6D11' : active ? T.orange : '#e5e7eb',
      color: done || active ? '#fff' : '#9ca3af',
    }}>
      {done ? '✓' : n}
    </div>
  )
}

export default function ImportUsers({ showToast }) {
  const [rows, setRows] = useState(null)
  const [step, setStep] = useState(1)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result)
      if (parsed.length === 0) { showToast('No data rows found in CSV', 'error'); return }
      setRows(parsed)
      setStep(2)
      setResult(null)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const res = await api.importUsers(rows)
      setResult(res)
      setStep(3)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setRows(null); setStep(1); setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const previewRows = rows?.slice(0, 10) || []
  const previewHeaders = rows?.[0] ? Object.keys(rows[0]) : []

  return (
    <div style={{ padding: 24, maxWidth: 820 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: T.navy }}>Import Users</h2>

      {/* Steps indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
        {[
          { n: 1, label: 'Download template' },
          { n: 2, label: 'Upload & preview' },
          { n: 3, label: 'Results' },
        ].map(({ n, label }, i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <div style={{ width: 24, height: 1, background: step > i ? T.orange : '#e5e7eb' }} />}
            <StepBadge n={n} active={step === n} done={step > n} />
            <span style={{ fontSize: 12, color: step === n ? T.orange : step > n ? '#3B6D11' : T.muted, fontWeight: step === n ? 600 : 400 }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1 */}
      <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, marginBottom: 8 }}>Step 1 — Download CSV Template</div>
        <p style={{ fontSize: 13, color: T.muted, marginBottom: 14, marginTop: 0 }}>
          Download the template, fill in your users, then upload it below.
          Columns: <code style={{ fontSize: 12, background: '#f3f4f6', padding: '1px 5px', borderRadius: 3 }}>{TEMPLATE_HEADERS.join(', ')}</code>
        </p>
        <button onClick={downloadTemplate} style={btn('ghost')}>Download Template CSV</button>
      </div>

      {/* Step 2 */}
      <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, marginBottom: 8 }}>Step 2 — Upload CSV</div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          style={{ ...inputSt, width: 'auto', cursor: 'pointer' }}
        />

        {rows && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>
              Preview — first {Math.min(previewRows.length, 10)} of {rows.length} rows:
            </div>
            <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f4f5f7' }}>
                    {previewHeaders.map(h => (
                      <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 600, color: T.muted, whiteSpace: 'nowrap', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                      {previewHeaders.map(h => (
                        <td key={h} style={{ padding: '7px 12px', color: T.navy, whiteSpace: 'nowrap' }}>{row[h] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={reset} style={btn('ghost')}>Clear</button>
              <button onClick={handleImport} disabled={importing} style={{ ...btn('primary'), padding: '7px 20px', opacity: importing ? 0.7 : 1 }}>
                {importing ? `Importing ${rows.length} users…` : `Import ${rows.length} Users`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step 3 — Results */}
      {result && (
        <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, marginBottom: 16 }}>Import Results</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { label: 'Imported', value: result.imported, color: '#3B6D11', bg: '#EAF3DE' },
              { label: 'Updated', value: result.updated, color: '#4338CA', bg: '#EEF2FF' },
              { label: 'Skipped', value: result.skipped, color: '#92400E', bg: '#FEF3C7' },
            ].map(item => (
              <div key={item.label} style={{ background: item.bg, borderRadius: 8, padding: '10px 18px', minWidth: 80, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 11, color: item.color, marginTop: 2 }}>{item.label}</div>
              </div>
            ))}
          </div>
          {result.errors?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#A32D2D', marginBottom: 8 }}>Errors ({result.errors.length})</div>
              <div style={{ background: '#FCEBEB', borderRadius: 8, padding: 12, maxHeight: 180, overflowY: 'auto' }}>
                {result.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#A32D2D', marginBottom: 4 }}>
                    Row {e.row}{e.email ? ` (${e.email})` : ''}: {e.error}
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={reset} style={{ ...btn('ghost'), marginTop: 16 }}>Import Another File</button>
        </div>
      )}
    </div>
  )
}
