import { useState, useEffect, useCallback } from 'react'
import { T, hrApi, fmtDate, fmtMoney, Spinner, EmptyState, RunStatusBadge, Btn, Modal, Field, Input, Select, ErrMsg } from './shared'

export default function PayrollRuns() {
  const [periods, setPeriods]   = useState([])
  const [runs, setRuns]         = useState([])
  const [selectedRun, setSelectedRun] = useState(null)
  const [runDetail, setRunDetail]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showNewPeriod, setShowNewPeriod] = useState(false)
  const [showNewRun, setShowNewRun]     = useState(false)
  const [periodForm, setPeriodForm] = useState({ name: '', pay_frequency: 'monthly', start_date: '', end_date: '' })
  const [runForm, setRunForm]   = useState({ pay_period_id: '' })
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState(null)
  const [finalizing, setFinalizing] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.allSettled([
      hrApi.getPayPeriods(),
      hrApi.getPayrollRuns(),
    ]).then(([pp, pr]) => {
      if (pp.status === 'fulfilled') setPeriods(Array.isArray(pp.value) ? pp.value : (pp.value?.rows || []))
      if (pr.status === 'fulfilled') setRuns(Array.isArray(pr.value) ? pr.value : (pr.value?.rows || []))
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!selectedRun) { setRunDetail(null); return }
    setDetailLoading(true)
    hrApi.getPayrollRun(selectedRun.id)
      .then(setRunDetail)
      .catch(() => setRunDetail(null))
      .finally(() => setDetailLoading(false))
  }, [selectedRun])

  const createPeriod = async () => {
    if (!periodForm.name || !periodForm.start_date || !periodForm.end_date) {
      setErr('Fill in all fields'); return
    }
    setSaving(true); setErr(null)
    try { await hrApi.createPayPeriod(periodForm); setShowNewPeriod(false); load() }
    catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const closePeriod = async (id) => {
    try { await hrApi.closePayPeriod(id); load() } catch (e) { setErr(e.message) }
  }

  const createRun = async () => {
    if (!runForm.pay_period_id) { setErr('Select a pay period'); return }
    setSaving(true); setErr(null)
    try {
      const run = await hrApi.createPayrollRun(runForm)
      setShowNewRun(false)
      load()
      setSelectedRun(run)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const finalize = async (id) => {
    setFinalizing(true)
    try { await hrApi.finalizePayrollRun(id); load(); hrApi.getPayrollRun(id).then(setRunDetail) }
    catch (e) { setErr(e.message) }
    finally { setFinalizing(false) }
  }

  const exportCsv = () => {
    if (!runDetail?.payslips) return
    const rows = [['Employee', 'Gross Pay', 'Deductions', 'Net Pay']]
    runDetail.payslips.forEach(ps => {
      rows.push([ps.employee_name, ps.gross_pay, ps.total_deductions, ps.net_pay])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `payroll-run-${runDetail.id}.csv`
    a.click()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={28} /></div>

  const openPeriods = periods.filter(p => p.status !== 'closed')

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.navy, marginBottom: 20 }}>Pay Periods &amp; Payroll Runs</div>
      <ErrMsg msg={err} />

      {/* Pay Periods */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.navy }}>Pay Periods</div>
        <Btn variant="ghost" style={{ fontSize: 12 }} onClick={() => { setShowNewPeriod(true); setErr(null) }}>+ New Period</Btn>
      </div>

      {periods.length === 0
        ? <EmptyState icon="📅" title="No pay periods" sub="Create a pay period to start payroll." />
        : (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafbfc', borderBottom: `1px solid ${T.border}` }}>
                  {['Name', 'Frequency', 'Start', 'End', 'Status', 'Runs', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '9px 14px', fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < periods.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500, color: T.navy }}>{p.name}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: T.muted, textTransform: 'capitalize' }}>{p.pay_frequency}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: T.muted }}>{fmtDate(p.start_date)}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: T.muted }}>{fmtDate(p.end_date)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                        background: p.status === 'closed' ? '#f1f5f9' : '#f0fdf4',
                        color: p.status === 'closed' ? '#64748b' : '#16a34a',
                      }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: T.muted }}>{p.run_count || 0}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn variant="ghost" style={{ fontSize: 11, padding: '3px 8px' }}
                          onClick={() => { setRunForm({ pay_period_id: p.id }); setShowNewRun(true); setErr(null) }}>
                          New Run
                        </Btn>
                        {p.status !== 'closed' && (
                          <Btn variant="danger" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => closePeriod(p.id)}>
                            Close
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Payroll Runs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.navy }}>Payroll Runs</div>
        <Btn variant="primary" style={{ fontSize: 12 }} onClick={() => { setShowNewRun(true); setErr(null) }}>+ New Run</Btn>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Runs list */}
        <div style={{ flex: 1 }}>
          {runs.length === 0
            ? <EmptyState icon="💳" title="No payroll runs" sub="Create a run to generate payslips." />
            : (
              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
                {runs.map((run, i) => (
                  <div
                    key={run.id}
                    onClick={() => setSelectedRun(run)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '13px 20px', cursor: 'pointer',
                      borderBottom: i < runs.length - 1 ? `1px solid ${T.border}` : 'none',
                      background: selectedRun?.id === run.id ? '#fff8f5' : '#fff',
                    }}
                    onMouseEnter={e => { if (selectedRun?.id !== run.id) e.currentTarget.style.background = '#f8f9fa' }}
                    onMouseLeave={e => { if (selectedRun?.id !== run.id) e.currentTarget.style.background = '#fff' }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>
                        {run.period_name || `Run ${run.id?.slice(0, 8)}`}
                      </div>
                      <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                        {run.employee_count || 0} employees · Total Net: {fmtMoney(run.total_net)}
                      </div>
                    </div>
                    <RunStatusBadge status={run.status} />
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Run detail */}
        {selectedRun && (
          <div style={{ width: 380, flexShrink: 0 }}>
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.navy }}>Run Detail</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {runDetail && (
                    <Btn variant="ghost" style={{ fontSize: 12 }} onClick={exportCsv}>CSV</Btn>
                  )}
                  {selectedRun.status === 'draft' && (
                    <Btn variant="primary" style={{ fontSize: 12 }} loading={finalizing} onClick={() => finalize(selectedRun.id)}>
                      Finalize & Notify
                    </Btn>
                  )}
                </div>
              </div>
              {detailLoading
                ? <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Spinner size={20} /></div>
                : runDetail ? (
                  <>
                    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <SumBox label="Gross" val={fmtMoney(runDetail.total_gross)} />
                      <SumBox label="Deductions" val={fmtMoney(runDetail.total_deductions)} />
                      <SumBox label="Net" val={fmtMoney(runDetail.total_net)} highlight />
                    </div>
                    <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                      {runDetail.payslips?.map((ps, i) => (
                        <div key={ps.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 20px', borderBottom: i < runDetail.payslips.length - 1 ? `1px solid ${T.border}` : 'none',
                        }}>
                          <div style={{ fontSize: 12, color: T.navy, fontWeight: 500 }}>{ps.employee_name}</div>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <div style={{ fontSize: 11, color: T.muted }}>Net: <strong style={{ color: T.green }}>{fmtMoney(ps.net_pay)}</strong></div>
                            <a href={hrApi.payslipPdfUrl(ps.id)} target="_blank" rel="noreferrer"
                              style={{ fontSize: 11, color: T.orange, textDecoration: 'none' }}>PDF</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div style={{ padding: 32, textAlign: 'center', color: T.muted, fontSize: 13 }}>Failed to load detail.</div>
              }
            </div>
          </div>
        )}
      </div>

      {/* New Pay Period modal */}
      {showNewPeriod && (
        <Modal title="New Pay Period" onClose={() => setShowNewPeriod(false)}>
          <ErrMsg msg={err} />
          <Field label="Period Name" required>
            <Input value={periodForm.name} onChange={e => setPeriodForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Jan 2026" />
          </Field>
          <Field label="Frequency">
            <Select value={periodForm.pay_frequency} onChange={e => setPeriodForm(f => ({ ...f, pay_frequency: e.target.value }))}>
              {['monthly','biweekly','weekly'].map(f => <option key={f} value={f}>{f}</option>)}
            </Select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Start Date" required>
              <Input type="date" value={periodForm.start_date} onChange={e => setPeriodForm(f => ({ ...f, start_date: e.target.value }))} />
            </Field>
            <Field label="End Date" required>
              <Input type="date" value={periodForm.end_date} onChange={e => setPeriodForm(f => ({ ...f, end_date: e.target.value }))} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowNewPeriod(false)}>Cancel</Btn>
            <Btn variant="primary" loading={saving} onClick={createPeriod}>Create</Btn>
          </div>
        </Modal>
      )}

      {/* New Run modal */}
      {showNewRun && (
        <Modal title="New Payroll Run" onClose={() => setShowNewRun(false)}>
          <ErrMsg msg={err} />
          <p style={{ fontSize: 13, color: T.muted, marginTop: 0 }}>
            This will auto-generate payslips for all active employees based on their approved timesheets and deductions.
          </p>
          <Field label="Pay Period" required>
            <Select value={runForm.pay_period_id} onChange={e => setRunForm(f => ({ ...f, pay_period_id: e.target.value }))}>
              <option value="">Select period…</option>
              {openPeriods.map(p => <option key={p.id} value={p.id}>{p.name} ({fmtDate(p.start_date)} – {fmtDate(p.end_date)})</option>)}
            </Select>
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowNewRun(false)}>Cancel</Btn>
            <Btn variant="primary" loading={saving} onClick={createRun}>Generate Payroll Run</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

function SumBox({ label, val, highlight }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: highlight ? T.green : T.navy }}>{val}</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{label}</div>
    </div>
  )
}
