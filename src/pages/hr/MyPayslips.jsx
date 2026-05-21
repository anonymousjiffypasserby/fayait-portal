import { useState, useEffect } from 'react'
import { T, hrApi, fmtDate, fmtMoney, Spinner, EmptyState, RunStatusBadge } from './shared'

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 100)
}

export default function MyPayslips() {
  const [payslips, setPayslips]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [expandedId, setExpandedId]     = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => {
    hrApi.getPayslips('?mine=true')
      .then(d => setPayslips(Array.isArray(d) ? d : (d?.rows || [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const downloadPdf = async (ps) => {
    setDownloadingId(ps.id)
    try {
      const blob = await hrApi.downloadPayslipPdf(ps.id)
      const label = ps.period_name || `payslip-${ps.id}`
      downloadBlob(blob, `${label}.pdf`)
    } catch {
      alert('PDF download failed.')
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={28} /></div>
  )

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.navy, marginBottom: 20 }}>My Payslips</div>

      {payslips.length === 0
        ? <EmptyState icon="💰" title="No payslips yet" sub="Your payslips will appear here once payroll is processed." />
        : (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, background: '#fafbfc' }}>
                  {['Pay Period', 'Period Dates', 'Gross Pay', 'Net Pay', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payslips.map((ps, i) => {
                  const isExpanded = expandedId === ps.id
                  const deductions = Array.isArray(ps.deductions) ? ps.deductions : []
                  const totalDeductions = deductions.reduce((s, d) => s + Number(d.amount || 0), 0)
                  const isLast = i === payslips.length - 1
                  return (
                    <>
                      <tr
                        key={ps.id}
                        onClick={() => setExpandedId(isExpanded ? null : ps.id)}
                        style={{
                          borderBottom: (!isExpanded && !isLast) ? `1px solid ${T.border}` : 'none',
                          cursor: 'pointer',
                          background: isExpanded ? '#f8f9ff' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#f8f9fa' }}
                        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}
                      >
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: T.navy }}>
                          <span style={{ marginRight: 6, fontSize: 11, color: T.muted }}>{isExpanded ? '▾' : '▸'}</span>
                          {ps.period_name || `Pay Period`}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: T.muted }}>
                          {fmtDate(ps.period_start)} – {fmtDate(ps.period_end)}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{fmtMoney(ps.gross_pay)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: T.green }}>{fmtMoney(ps.net_pay)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <RunStatusBadge status={ps.run_status || 'finalized'} />
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => downloadPdf(ps)}
                            disabled={downloadingId === ps.id}
                            style={{
                              fontSize: 12, color: downloadingId === ps.id ? T.muted : T.orange,
                              fontWeight: 500, padding: '5px 12px',
                              border: `1px solid ${downloadingId === ps.id ? T.border : T.orange + '44'}`,
                              borderRadius: 6, background: 'transparent', cursor: downloadingId === ps.id ? 'default' : 'pointer',
                            }}>
                            {downloadingId === ps.id ? '…' : '⬇ PDF'}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${ps.id}-detail`} style={{ borderBottom: !isLast ? `1px solid ${T.border}` : 'none' }}>
                          <td colSpan={6} style={{ padding: '0 16px 16px', background: '#f8f9ff' }}>
                            <div style={{
                              borderRadius: 8, border: `1px solid ${T.border}`,
                              background: '#fff', overflow: 'hidden',
                            }}>
                              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                Pay Breakdown
                              </div>

                              {/* Earnings */}
                              <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                <span style={{ color: '#374151' }}>Base Pay</span>
                                <span>{fmtMoney(ps.base_salary || ps.gross_pay)}</span>
                              </div>
                              {Number(ps.overtime_hours) > 0 && (
                                <div style={{ padding: '4px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.muted }}>
                                  <span>Overtime ({ps.overtime_hours}h × {fmtMoney(ps.overtime_rate)}/h)</span>
                                  <span>{fmtMoney(Number(ps.overtime_hours) * Number(ps.overtime_rate))}</span>
                                </div>
                              )}

                              {/* Deductions */}
                              {deductions.length > 0 && (
                                <>
                                  <div style={{ padding: '8px 14px 2px', fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, borderTop: `1px solid ${T.border}` }}>
                                    Deductions
                                  </div>
                                  {deductions.map((d, di) => (
                                    <div key={di} style={{ padding: '4px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151' }}>
                                      <span>{d.name}{d.type === 'percentage' ? ` (${d.rate || d.amount}%)` : ''}</span>
                                      <span style={{ color: T.red }}>−{fmtMoney(d.amount)}</span>
                                    </div>
                                  ))}
                                </>
                              )}

                              {/* Totals */}
                              <div style={{ borderTop: `1px solid ${T.border}`, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.muted }}>
                                <span>Total Deductions</span>
                                <span style={{ color: T.red }}>−{fmtMoney(totalDeductions)}</span>
                              </div>
                              <div style={{ borderTop: `1px solid ${T.border}`, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: T.navy, background: '#f8f9ff' }}>
                                <span>Net Pay</span>
                                <span style={{ color: T.green }}>{fmtMoney(ps.net_pay)}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}
