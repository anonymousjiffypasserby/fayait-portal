import { useState, useEffect } from 'react'
import { T, PageHeader, SectionCard, Btn, SearchBar, FilterSelect,
         Spinner, ErrMsg, SetupNotice } from './shared'
import { erpReports, erpSetup } from '../../services/erpnextApi'

const ERP_URL = import.meta.env.VITE_ERP_URL || 'https://erp.fayait.com'

const MODULE_GROUPS = [
  'Accounts', 'Stock', 'Selling', 'Buying', 'HR', 'Payroll',
  'Projects', 'Manufacturing', 'Asset', 'CRM', 'Support',
]

function ReportResult({ result, onClose }) {
  if (!result) return null
  const { name, data } = result
  const cols = data?.columns || []
  const rows = data?.result  || []

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1000, paddingTop: 40, paddingBottom: 40, overflowY: 'auto',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
        width: '90%', maxWidth: 1100, display: 'flex', flexDirection: 'column',
        maxHeight: '85vh',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>{name}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={`${ERP_URL}/app/query-report/${encodeURIComponent(name)}`} target="_blank" rel="noreferrer"
              style={{ padding: '6px 14px', borderRadius: 7, background: T.orangeLight, color: T.orange, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              Open in ERPNext →
            </a>
            <Btn onClick={onClose} variant="outline" small>✕ Close</Btn>
          </div>
        </div>

        {/* Result table */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {rows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>
              No data returned. Try configuring filters in ERPNext.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, background: T.card }}>
                  <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                    {cols.map((c, i) => (
                      <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: T.muted, whiteSpace: 'nowrap' }}>
                        {typeof c === 'string' ? c.split(':')[0] : (c.label || c.fieldname || '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 500).map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                      {cols.map((c, j) => {
                        const key = typeof c === 'string' ? c.split(':')[0] : (c.fieldname || c.label || '')
                        const val = Array.isArray(row) ? row[j] : row[key]
                        return (
                          <td key={j} style={{ padding: '8px 14px', color: T.navy, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            {val == null ? '—' : String(val)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 500 && (
                <div style={{ padding: '10px 16px', fontSize: 12, color: T.muted, textAlign: 'center' }}>
                  Showing first 500 of {rows.length} rows. Open in ERPNext for the full result.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ERPReports() {
  const [reports,  setReports]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [search,   setSearch]   = useState('')
  const [module,   setModule]   = useState('')
  const [running,  setRunning]  = useState(null)
  const [result,   setResult]   = useState(null)
  const [runError, setRunError] = useState(null)
  const [noSetup,  setNoSetup]  = useState(false)
  const [company,  setCompany]  = useState(null)

  useEffect(() => {
    erpSetup.getCompanies().then(companies => {
      if (!companies.length) { setNoSetup(true); return }
      setCompany(companies[0])
    }).catch(() => setNoSetup(true))

    erpReports.getAll()
      .then(setReports).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  if (noSetup) return <SetupNotice erpUrl={ERP_URL} />

  const moduleOptions = [...new Set(reports.map(r => r.module).filter(Boolean))].sort().map(m => ({ value: m, label: m }))

  const filtered = reports.filter(r => {
    if (module && r.module !== module) return false
    if (search) {
      const q = search.toLowerCase()
      return r.name?.toLowerCase().includes(q) || r.module?.toLowerCase().includes(q)
    }
    return true
  })

  async function runReport(reportName) {
    setRunning(reportName)
    setRunError(null)
    setResult(null)
    try {
      const filters = company ? { company: company.name } : {}
      const data = await erpReports.run(reportName, filters)
      setResult({ name: reportName, data })
    } catch (e) {
      setRunError(`${reportName}: ${e.message}`)
    } finally {
      setRunning(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: T.font }}>
      <PageHeader
        title="ERPNext Reports"
        sub="Standard built-in reports across all modules"
      />
      <div style={{ padding: '12px 24px', background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search reports…" />
        <FilterSelect value={module} onChange={setModule} options={moduleOptions} placeholder="All Modules" />
      </div>

      {runError && <ErrMsg error={runError} />}

      <div className="erp-content" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {loading ? <Spinner /> : error ? <ErrMsg error={error} /> : (
          <>
            {/* Group by module */}
            {(module ? [module] : [...new Set(filtered.map(r => r.module))].sort()).map(mod => {
              const modReports = filtered.filter(r => r.module === mod)
              if (!modReports.length) return null
              return (
                <SectionCard key={mod} title={mod} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 14 }}>
                    {modReports.map(r => (
                      <div key={r.name} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: '#f8fafc', border: `1px solid ${T.border}`,
                        borderRadius: 8, padding: '6px 12px',
                      }}>
                        <span style={{ fontSize: 13, color: T.navy, fontWeight: 500 }}>{r.name}</span>
                        <button
                          onClick={() => runReport(r.name)}
                          disabled={running === r.name}
                          style={{
                            background: running === r.name ? T.border : T.orangeLight,
                            color: running === r.name ? T.muted : T.orange,
                            border: 'none', borderRadius: 5, padding: '3px 10px',
                            fontSize: 11, fontWeight: 600, cursor: running === r.name ? 'wait' : 'pointer',
                          }}
                        >{running === r.name ? '…' : 'Run'}</button>
                        <a href={`${ERP_URL}/app/query-report/${encodeURIComponent(r.name)}`}
                          target="_blank" rel="noreferrer"
                          style={{ color: T.muted, fontSize: 11, textDecoration: 'none' }}
                          title="Open in ERPNext"
                        >↗</a>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )
            })}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                <div>No reports match your filter.</div>
              </div>
            )}
          </>
        )}
      </div>

      {result && <ReportResult result={result} onClose={() => setResult(null)} />}
    </div>
  )
}
