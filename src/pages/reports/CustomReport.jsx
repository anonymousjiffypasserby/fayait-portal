import { useState, useCallback } from 'react'
import { T, fetchReport, exportReport, inputStyle, selectStyle, btnStyle, outlineBtnStyle } from './shared'

const ENTITIES = [
  { value: 'asset',      label: 'Asset' },
  { value: 'accessory',  label: 'Accessory' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'component',  label: 'Component' },
]

const GROUP_BY_OPTIONS = {
  asset:     ['category','model','manufacturer','location','department','status','assigned_user'],
  accessory: ['category','manufacturer','location','status'],
  consumable:['category','manufacturer','location','status'],
  component: ['category','manufacturer','location','status'],
}

const FILTER_FIELDS = {
  asset:     ['status','asset_type','location','department','manufacturer','model','assigned_user'],
  accessory: ['status','name'],
  consumable:['status','name'],
  component: ['status','name'],
}

const OPERATORS = ['equals','contains','greater than','less than']

function Step({ num, title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', background: T.navy, color: '#fff',
          fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{num}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{title}</div>
      </div>
      <div style={{ marginLeft: 36 }}>{children}</div>
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
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
            {columns.map(col => (
              <th key={col} onClick={() => handleSort(col)} style={{
                padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: T.muted,
                fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4,
                whiteSpace: 'nowrap', cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
              }}>
                {col}{sortKey === col && (sortDir === 'asc' ? ' ↑' : ' ↓')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
              {columns.map(col => (
                <td key={col} style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, color: T.text, whiteSpace: 'nowrap', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row[col] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CustomReport() {
  const [entity,    setEntity]    = useState('asset')
  const [groupBy,   setGroupBy]   = useState('')
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [filterRows,setFilterRows]= useState([{ field: '', operator: 'equals', value: '' }])
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)

  const addFilterRow    = () => setFilterRows(r => [...r, { field: '', operator: 'equals', value: '' }])
  const removeFilterRow = (i) => setFilterRows(r => r.filter((_, idx) => idx !== i))
  const setFilterRow    = (i, k, v) => setFilterRows(r => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row))

  const buildParams = useCallback(() => {
    const validFilters = filterRows.filter(f => f.field && f.value)
    return {
      entity,
      group_by:  groupBy || undefined,
      date_from: dateFrom || undefined,
      date_to:   dateTo   || undefined,
      filters:   validFilters.length ? JSON.stringify({ rows: validFilters }) : undefined,
    }
  }, [entity, groupBy, dateFrom, dateTo, filterRows])

  const generate = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchReport('/custom', buildParams())) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }, [buildParams])

  const doExport = async (fmt) => {
    setExporting(fmt)
    try { await exportReport('/custom', { ...buildParams(), format: fmt }, `Custom-${entity}.${fmt}`) }
    catch (e) { alert(e.message) }
    finally { setExporting(false) }
  }

  const cols = data?.rows?.length ? Object.keys(data.rows[0]) : []
  const availableGroupBy = GROUP_BY_OPTIONS[entity] || []
  const availableFields  = FILTER_FIELDS[entity]    || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: T.font }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>Custom Report Builder</h2>
        <p style={{ margin: '4px 0 16px', fontSize: 13, color: T.muted }}>Build a custom report by choosing entity, grouping, filters, and date range.</p>
      </div>

      {/* Builder + Results split */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Builder panel */}
        <div style={{
          width: 340, flexShrink: 0, overflowY: 'auto',
          borderRight: `1px solid ${T.border}`,
          padding: '20px 24px',
          background: '#fff',
        }}>
          {/* Step 1: Entity */}
          <Step num="1" title="Choose Entity">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {ENTITIES.map(e => (
                <label key={e.value} style={{
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  padding: '6px 14px', borderRadius: 8, fontSize: 13,
                  border: `1.5px solid ${entity === e.value ? T.blue : T.border}`,
                  background: entity === e.value ? 'rgba(37,99,235,0.07)' : '#fff',
                  color: entity === e.value ? T.blue : T.text,
                  fontWeight: entity === e.value ? 600 : 400,
                }}>
                  <input type="radio" style={{ display: 'none' }} name="entity" value={e.value} checked={entity === e.value}
                    onChange={() => { setEntity(e.value); setGroupBy(''); setFilterRows([{ field: '', operator: 'equals', value: '' }]); setData(null) }} />
                  {e.label}
                </label>
              ))}
            </div>
          </Step>

          {/* Step 2: Group by */}
          <Step num="2" title="Group By (optional)">
            <select style={{ ...selectStyle, width: '100%' }} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              <option value="">— No grouping (flat rows) —</option>
              {availableGroupBy.map(g => (
                <option key={g} value={g}>{g.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </Step>

          {/* Step 3: Filters */}
          <Step num="3" title="Add Filters (optional)">
            {filterRows.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <select style={{ ...selectStyle, width: '100%', fontSize: 12 }} value={row.field} onChange={e => setFilterRow(i, 'field', e.target.value)}>
                    <option value="">Field…</option>
                    {availableFields.map(f => (
                      <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <select style={{ ...selectStyle, width: '100%', fontSize: 12 }} value={row.operator} onChange={e => setFilterRow(i, 'operator', e.target.value)}>
                    {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <input style={{ ...inputStyle, width: '100%', fontSize: 12, boxSizing: 'border-box' }} placeholder="Value" value={row.value} onChange={e => setFilterRow(i, 'value', e.target.value)} />
                </div>
                {filterRows.length > 1 && (
                  <button onClick={() => removeFilterRow(i)} style={{ ...outlineBtnStyle, padding: '7px 10px', color: T.red, borderColor: T.red, flexShrink: 0 }}>✕</button>
                )}
              </div>
            ))}
            <button onClick={addFilterRow} style={{ ...outlineBtnStyle, fontSize: 12, padding: '5px 12px' }}>+ Add Filter</button>
          </Step>

          {/* Step 4: Date range */}
          <Step num="4" title="Date Range (optional)">
            <div style={{ display: 'flex', gap: 10 }}>
              <FilterField label="From">
                <input type="date" style={inputStyle} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </FilterField>
              <FilterField label="To">
                <input type="date" style={inputStyle} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </FilterField>
            </div>
          </Step>

          {/* Step 5: Generate */}
          <Step num="5" title="Preview & Export">
            <button onClick={generate} disabled={loading} style={{ ...btnStyle(T.navy), width: '100%', marginBottom: 8 }}>
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
            {data && data.rows.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => doExport('csv')} disabled={!!exporting} style={{ ...outlineBtnStyle, flex: 1, fontSize: 12 }}>
                  {exporting === 'csv' ? 'Exporting…' : '↓ CSV'}
                </button>
                <button onClick={() => doExport('pdf')} disabled={!!exporting} style={{ ...outlineBtnStyle, flex: 1, fontSize: 12 }}>
                  {exporting === 'pdf' ? 'Exporting…' : '↓ PDF'}
                </button>
              </div>
            )}
          </Step>
        </div>

        {/* Results panel */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {!data && (
            <div style={{ textAlign: 'center', padding: '80px 24px', color: T.muted }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔧</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Configure your report</div>
              <div style={{ fontSize: 13 }}>Choose an entity and click Generate to see results.</div>
            </div>
          )}
          {data && data.rows.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 24px', color: T.muted }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 14 }}>No results match the current configuration.</div>
            </div>
          )}
          {data && data.rows.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: T.muted }}>
                  <strong style={{ color: T.text }}>{data.count}</strong> record{data.count !== 1 ? 's' : ''}
                  {groupBy ? ` grouped by ${groupBy}` : ''} · {entity}
                </div>
              </div>
              <SortableTable columns={cols} rows={data.rows} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
