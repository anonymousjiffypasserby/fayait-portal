import { useState, useEffect } from 'react'
import { T, hrApi, fmtDate, fmtMoney, Spinner, EmptyState, RunStatusBadge } from './shared'

export default function MyPayslips() {
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    hrApi.getPayslips('?mine=true')
      .then(d => setPayslips(Array.isArray(d) ? d : (d?.rows || [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
                {payslips.map((ps, i) => (
                  <tr key={ps.id} style={{ borderBottom: i < payslips.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: T.navy }}>
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
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <a href={hrApi.payslipPdfUrl(ps.id)} target="_blank" rel="noreferrer"
                        style={{
                          fontSize: 12, color: T.orange, fontWeight: 500,
                          textDecoration: 'none', padding: '5px 12px',
                          border: `1px solid ${T.orange}44`, borderRadius: 6,
                        }}>
                        ⬇ PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}
