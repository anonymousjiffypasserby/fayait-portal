import { useState, useEffect, useCallback } from 'react'
import { T, hrApi, fmtDate, fmtTime, fmtHours, Spinner, EmptyState, TsBadge, Btn, ErrMsg } from './shared'

export default function MyTimesheets() {
  const [current, setCurrent] = useState(null)
  const [past, setPast]       = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [err, setErr]         = useState(null)
  const [action, setAction]   = useState(null) // 'clockin' | 'clockout' | 'submit'

  const load = useCallback(() => {
    setLoading(true); setErr(null)
    Promise.allSettled([
      hrApi.getCurrentTimesheet(),
      hrApi.getTimesheets('?mine=true&limit=20'),
    ]).then(([cur, all]) => {
      if (cur.status === 'fulfilled') setCurrent(cur.value)
      if (all.status === 'fulfilled') {
        const rows = Array.isArray(all.value) ? all.value : (all.value?.rows || [])
        setPast(rows.filter(r => r.status !== 'draft' || !cur.value || r.id !== cur.value.id))
      }
    }).catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const clockIn = async () => {
    setAction('clockin'); setErr(null)
    try { await hrApi.clockIn(); load() }
    catch (e) { setErr(e.message) }
    finally { setAction(null) }
  }

  const clockOut = async () => {
    setAction('clockout'); setErr(null)
    try { await hrApi.clockOut({}); load() }
    catch (e) { setErr(e.message) }
    finally { setAction(null) }
  }

  const submit = async (id) => {
    setAction('submit'); setErr(null)
    try { await hrApi.submitTimesheet(id); load() }
    catch (e) { setErr(e.message) }
    finally { setAction(null) }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={28} /></div>
  )

  const isClockedIn = current?.entries?.some(e => e.clock_in && !e.clock_out)
  const activeEntry = current?.entries?.find(e => e.clock_in && !e.clock_out)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.navy, marginBottom: 20 }}>My Timesheets</div>

      <ErrMsg msg={err} />

      {/* Current week card */}
      <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.navy }}>Current Week</div>
            {current && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Week of {fmtDate(current.week_start)}</div>}
          </div>
          {current && <TsBadge status={current.status} />}
        </div>

        <div style={{ padding: '24px 20px', textAlign: 'center', borderBottom: `1px solid ${T.border}` }}>
          {/* Clock status */}
          {isClockedIn ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: T.green, display: 'inline-block', marginRight: 6, animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 13, color: T.green, fontWeight: 600 }}>
                Clocked in since {fmtTime(activeEntry?.clock_in?.slice(11, 16))}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>Not currently clocked in</div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {!isClockedIn && (!current || current.status === 'draft') && (
              <Btn variant="primary" loading={action === 'clockin'} onClick={clockIn}
                style={{ padding: '12px 28px', fontSize: 15 }}>
                ⏵ Clock In
              </Btn>
            )}
            {isClockedIn && (
              <Btn variant="danger" loading={action === 'clockout'} onClick={clockOut}
                style={{ padding: '12px 28px', fontSize: 15 }}>
                ⏹ Clock Out
              </Btn>
            )}
            {current && current.status === 'draft' && !isClockedIn && (current.total_hours || 0) > 0 && (
              <Btn variant="outline" loading={action === 'submit'} onClick={() => submit(current.id)}>
                Submit for Approval
              </Btn>
            )}
          </div>
        </div>

        {/* Entries table */}
        {current?.entries?.length > 0 && (
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, padding: '14px 0 8px' }}>Daily Entries</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {['Date', 'Clock In', 'Clock Out', 'Hours', 'Notes'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: T.muted, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {current.entries.map((e, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '8px', fontSize: 13 }}>{fmtDate(e.date || e.clock_in?.slice(0, 10))}</td>
                    <td style={{ padding: '8px', fontSize: 13 }}>{e.clock_in ? fmtTime(e.clock_in.slice(11, 16)) : '—'}</td>
                    <td style={{ padding: '8px', fontSize: 13, color: e.clock_out ? undefined : T.muted }}>
                      {e.clock_out ? fmtTime(e.clock_out.slice(11, 16)) : 'Active'}
                    </td>
                    <td style={{ padding: '8px', fontSize: 13 }}>{fmtHours(e.hours)}</td>
                    <td style={{ padding: '8px', fontSize: 12, color: T.muted }}>{e.notes || '—'}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ padding: '10px 8px', fontSize: 13, fontWeight: 600, color: T.navy }}>Total</td>
                  <td style={{ padding: '10px 8px', fontSize: 13, fontWeight: 700, color: T.navy }}>{fmtHours(current.total_hours)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {!current && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: T.muted, fontSize: 13 }}>
            No timesheet for this week yet. Clock in to start tracking.
          </div>
        )}
      </div>

      {/* Past timesheets */}
      <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, marginBottom: 12 }}>Past Timesheets</div>
      {past.length === 0
        ? <EmptyState icon="⏱" title="No past timesheets" sub="Past timesheets will appear here." />
        : (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            {past.map((ts, i) => (
              <div key={ts.id}>
                <div
                  onClick={() => setExpanded(expanded === ts.id ? null : ts.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 20px', cursor: 'pointer',
                    borderBottom: i < past.length - 1 ? `1px solid ${T.border}` : 'none',
                    background: expanded === ts.id ? '#f8f9fa' : '#fff',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>Week of {fmtDate(ts.week_start)}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                      {fmtHours(ts.total_hours)} total · {fmtHours(ts.overtime_hours)} overtime
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <TsBadge status={ts.status} />
                    <span style={{ fontSize: 11, color: T.muted }}>{expanded === ts.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expanded === ts.id && ts.entries?.length > 0 && (
                  <div style={{ padding: '0 20px 16px', borderBottom: i < past.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                      <thead>
                        <tr>
                          {['Date', 'In', 'Out', 'Hours'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '4px 8px', fontSize: 11, color: T.muted }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ts.entries.map((e, j) => (
                          <tr key={j}>
                            <td style={{ padding: '4px 8px', fontSize: 12 }}>{fmtDate(e.date)}</td>
                            <td style={{ padding: '4px 8px', fontSize: 12 }}>{e.clock_in ? fmtTime(e.clock_in.slice(11, 16)) : '—'}</td>
                            <td style={{ padding: '4px 8px', fontSize: 12 }}>{e.clock_out ? fmtTime(e.clock_out.slice(11, 16)) : '—'}</td>
                            <td style={{ padding: '4px 8px', fontSize: 12, fontWeight: 500 }}>{fmtHours(e.hours)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ts.notes && <div style={{ fontSize: 12, color: T.muted, marginTop: 8, fontStyle: 'italic' }}>{ts.notes}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
