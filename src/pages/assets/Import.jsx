import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { T } from './shared'
import api from '../../services/api'

const TEMPLATE_HEADERS = [
  'hostname', 'serial', 'mac_address', 'manufacturer', 'model',
  'asset_type', 'status', 'assigned_user', 'department', 'location',
  'ip_address', 'os', 'cpu', 'cpu_cores', 'ram_gb', 'disk_gb',
  'purchase_date', 'purchase_cost', 'warranty_expires', 'notes',
]

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: `1px solid ${T.border}`, fontSize: 13, boxSizing: 'border-box',
  fontFamily: T.font, outline: 'none', background: T.card, color: T.text,
}

function StepBadge({ n, active, done }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, flexShrink: 0,
      background: done ? T.green : active ? T.navy : '#e8eaed',
      color: done || active ? '#fff' : T.muted,
    }}>
      {done ? '✓' : n}
    </div>
  )
}

export default function Import() {
  const [rows, setRows]         = useState([])
  const [errors, setErrors]     = useState([])
  const [validRows, setValid]   = useState([])
  const [result, setResult]     = useState(null)
  const [step, setStep]         = useState(1) // 1=upload 2=validate 3=done
  const [dragging, setDragging] = useState(false)
  const [validating, setValidating] = useState(false)
  const [importing, setImporting]   = useState(false)
  const fileRef = useRef(null)

  const downloadTemplate = () => {
    const csv = TEMPLATE_HEADERS.join(',') + '\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'asset-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const parseFile = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        setRows(data)
        setErrors([])
        setValid([])
        setResult(null)
        setStep(2)
      },
    })
  }

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) return
    parseFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleValidate = async () => {
    setValidating(true)
    setErrors([])
    setValid([])
    try {
      const res = await api.importValidate(rows)
      setErrors(res.errors || [])
      setValid(res.valid || [])
    } catch (e) {
      setErrors([{ row: -1, field: 'general', message: e.message }])
    } finally {
      setValidating(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const res = await api.importAssets(validRows)
      setResult(res)
      setStep(3)
    } catch (e) {
      setResult({ error: e.message })
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setRows([]); setErrors([]); setValid([]); setResult(null); setStep(1)
    if (fileRef.current) fileRef.current.value = ''
  }

  const errorRowNums = new Set(errors.map(e => e.row))

  const preview = rows.slice(0, 10)
  const cols    = rows.length ? Object.keys(rows[0]) : TEMPLATE_HEADERS

  return (
    <div style={{ fontFamily: T.font, maxWidth: 900 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: T.navy }}>Import Assets</h2>
      <p style={{ margin: '0 0 28px', fontSize: 13, color: T.muted }}>Upload a CSV file to bulk-import or update assets.</p>

      {/* Step 1 — Download template */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
        <StepBadge n={1} active={step === 1} done={step > 1} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>Download Template</div>
          <button onClick={downloadTemplate} style={{
            padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`,
            background: T.card, cursor: 'pointer', fontSize: 13, fontFamily: T.font, color: T.text, fontWeight: 600,
          }}>
            ⬇ Download CSV Template
          </button>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
            Fill in the template then upload it below. Only <code>hostname</code> is required.
          </div>
        </div>
      </div>

      {/* Step 2 — Upload */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
        <StepBadge n={2} active={step >= 1} done={rows.length > 0} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>Upload CSV</div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? T.navy : T.border}`,
              borderRadius: 10, padding: '28px 20px', textAlign: 'center',
              cursor: 'pointer', background: dragging ? '#eef1ff' : '#fafbfc',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>
              {rows.length > 0 ? `${rows.length} rows loaded` : 'Drag & drop or click to upload'}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>CSV files only</div>
          </div>
        </div>
      </div>

      {/* Preview table */}
      {rows.length > 0 && (
        <div style={{ marginBottom: 24, overflowX: 'auto' }}>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>
            Preview — first {Math.min(10, rows.length)} of {rows.length} rows
            {rows.length > 10 && <span> ({rows.length - 10} more)</span>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f5f6f8' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: T.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${T.border}` }}>#</th>
                {cols.map(c => (
                  <th key={c} style={{ padding: '6px 8px', textAlign: 'left', color: T.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => {
                const hasError = errorRowNums.has(i)
                return (
                  <tr key={i} style={{ background: hasError ? '#fff3e0' : (i % 2 === 0 ? '#fff' : '#fafbfc') }}>
                    <td style={{ padding: '6px 8px', color: T.muted, borderBottom: `1px solid ${T.border}` }}>{i + 1}</td>
                    {cols.map(c => {
                      const colError = errors.find(e => e.row === i && e.field === c)
                      return (
                        <td key={c} style={{
                          padding: '6px 8px', borderBottom: `1px solid ${T.border}`,
                          color: colError ? '#c62828' : T.text,
                          background: colError ? '#fdecea' : 'transparent',
                          maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                          title={colError ? colError.message : undefined}>
                          {row[c] || <span style={{ color: T.muted }}>—</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Step 3 — Validate */}
      {rows.length > 0 && step < 3 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
          <StepBadge n={3} active={step >= 2} done={validRows.length > 0 && errors.length === 0} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>Validate</div>
            <button onClick={handleValidate} disabled={validating} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', background: T.navy,
              color: '#fff', cursor: validating ? 'not-allowed' : 'pointer',
              fontSize: 13, fontFamily: T.font, fontWeight: 700, opacity: validating ? 0.7 : 1,
            }}>
              {validating ? 'Validating…' : 'Validate'}
            </button>
            {errors.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: '#c62828', fontWeight: 600, marginBottom: 6 }}>
                  {errors.length} error{errors.length !== 1 ? 's' : ''} found — fix the CSV and re-upload:
                </div>
                {errors.slice(0, 8).map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#c62828', marginBottom: 2 }}>
                    Row {e.row + 1}, <strong>{e.field}</strong>: {e.message}
                  </div>
                ))}
                {errors.length > 8 && <div style={{ fontSize: 12, color: T.muted }}>…and {errors.length - 8} more</div>}
              </div>
            )}
            {errors.length === 0 && validRows.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#2e7d32', fontWeight: 600 }}>
                ✓ All {validRows.length} rows valid
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4 — Import */}
      {validRows.length > 0 && errors.length === 0 && step < 3 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
          <StepBadge n={4} active done={false} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>Import</div>
            <button onClick={handleImport} disabled={importing} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', background: T.green,
              color: '#fff', cursor: importing ? 'not-allowed' : 'pointer',
              fontSize: 13, fontFamily: T.font, fontWeight: 700, opacity: importing ? 0.7 : 1,
            }}>
              {importing ? 'Importing…' : `Import ${validRows.length} Asset${validRows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{
          padding: '16px 20px', borderRadius: 12, marginTop: 8,
          background: result.error ? '#fdecea' : '#e8f5e9',
          border: `1px solid ${result.error ? '#ef9a9a' : '#a5d6a7'}`,
        }}>
          {result.error ? (
            <div style={{ color: '#c62828', fontWeight: 600, fontSize: 14 }}>Import failed: {result.error}</div>
          ) : (
            <>
              <div style={{ color: '#2e7d32', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Import complete</div>
              <div style={{ fontSize: 13, color: T.text }}>
                <span style={{ marginRight: 20 }}>✓ <strong>{result.imported}</strong> new assets created</span>
                <span style={{ marginRight: 20 }}>↑ <strong>{result.updated}</strong> assets updated</span>
                {result.skipped > 0 && <span style={{ color: '#c62828' }}>✗ <strong>{result.skipped}</strong> skipped</span>}
              </div>
              {result.errors?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {result.errors.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#c62828' }}>{e.hostname}: {e.message}</div>
                  ))}
                </div>
              )}
            </>
          )}
          <button onClick={reset} style={{
            marginTop: 14, padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`,
            background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: T.font, color: T.text,
          }}>
            Import another file
          </button>
        </div>
      )}
    </div>
  )
}
