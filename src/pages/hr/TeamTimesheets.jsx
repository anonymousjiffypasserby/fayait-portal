import { useState, useEffect, useCallback } from 'react'
import { T, hrApi, fmtDate, fmtHours, Avatar, Spinner, EmptyState, TsBadge, Btn, ErrMsg } from './shared'
import PermissionGate from '../../components/PermissionGate'

export default function TeamTimesheets() {
  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState(null)
  const [selected, setSelected]     = useState(new Set())
  const [acting, setActing]         = useState(null)
  const [err, setErr]               = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    hrApi.getTimesheets('?status=submitted')
      .then(d => setTimesheets(Array.isArray(d) ? d : (d?.rows || [])))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (id, action, notes) => {
    setActing(id)
    try {
      await hrApi.updateTimesheet(id, { action, notes })
      load()
      setSelected(s => { const n = new Set(s); n.delete(id); return n })
    } catch (e) { setErr(e.message) }
    finally { setActing(null) }
  }

  const bulkApprove = async () => {
    setActing('bulk')
    try {
      await Promise.all([...selected].map(id => hrApi.updateTimesheet(id, { action: 'approve' })))
      load(); setSelected(new Set())
    } catch (e) { setErr(e.message) }
    finally { setActing(null) }
  }

  const toggleAll = () => {
    if (selected.size === timesheets.length) setSelected(new Set())
    else setSelected(new Set(timesheets.map(t => t.id)))
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={28} /></div>

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>
          Team Timesheets
          {timesheets.length > 0 && (
            <span style={{ fontSize: 13, color: T.muted, fontWeight: 400, marginLeft: 8 }}>
              {timesheets.length} pending
            </span>
          )}
        </div>
        {selected.size > 0 && (
          <PermissionGate module="hr_timesheets" action="approve">
            <Btn variant="primary" loading={acting === 'bulk'} onClick={bulkApprove}>
              Approve {selected.size} Selected
            </Btn>
          </PermissionGate>
        )}
      </div>

      <ErrMsg msg={err} />

      {timesheets.length === 0
        ? <EmptyState icon="✅" title="No pending timesheets" sub="All timesheets have been reviewed." />
        : (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafbfc', borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ width: 36, padding: '10px 14px' }}>
                    <input type="checkbox" checked={selected.size === timesheets.length && timesheets.length > 0}
                      onChange={toggleAll} />
                  </th>
                  {['Employee', 'Week', 'Total Hours', 'OT Hours', 'Submitted', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timesheets.map((ts, i) => (
                  <>
                    <tr
                      key={ts.id}
                      style={{
                        borderBottom: expanded === ts.id ? 'none' : (i < timesheets.length - 1 ? `1px solid ${T.border}` : 'none'),
                        background: selected.has(ts.id) ? '#fff8f5' : '#fff',
                      }}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <input type="checkbox" checked={selected.has(ts.id)}
                          onChange={() => setSelected(s => {
                            const n = new Set(s)
                            n.has(ts.id) ? n.delete(ts.id) : n.add(ts.id)
                            return n
                          })} />
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={ts.employee_name} size={28} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>{ts.employee_name}</div>
                            <div style={{ fontSize: 11, color: T.muted }}>{ts.department}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}>Week of {fmtDate(ts.week_start)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{fmtHours(ts.total_hours)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: ts.overtime_hours > 0 ? T.red : T.muted }}>
                        {fmtHours(ts.overtime_hours)}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: T.muted }}>{fmtDate(ts.submitted_at)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <PermissionGate module="hr_timesheets" action="approve">
                            <Btn variant="primary" style={{ fontSize: 11, padding: '4px 10px' }}
                              loading={acting === ts.id} onClick={() => act(ts.id, 'approve')}>
                              Approve
                            </Btn>
                            <Btn variant="danger" style={{ fontSize: 11, padding: '4px 10px' }}
                              loading={acting === ts.id} onClick={() => act(ts.id, 'reject')}>
                              Reject
                            </Btn>
                          </PermissionGate>
                          <button
                            onClick={() => setExpanded(expanded === ts.id ? null : ts.id)}
                            style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 12 }}
                          >
                            {expanded === ts.id ? '▲' : '▼'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === ts.id && (
                      <tr key={`${ts.id}-exp`}>
                        <td colSpan={7} style={{ padding: '0 14px 14px', borderBottom: i < timesheets.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                          {ts.entries?.length > 0
                            ? (
                              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
                                <thead>
                                  <tr>
                                    {['Date', 'Clock In', 'Clock Out', 'Hours', 'Notes'].map(h => (
                                      <th key={h} style={{ textAlign: 'left', padding: '4px 8px', fontSize: 11, color: T.muted }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {ts.entries.map((e, j) => (
                                    <tr key={j}>
                                      <td style={{ padding: '4px 8px', fontSize: 12 }}>{fmtDate(e.date)}</td>
                                      <td style={{ padding: '4px 8px', fontSize: 12 }}>{e.clock_in?.slice(11, 16) || '—'}</td>
                                      <td style={{ padding: '4px 8px', fontSize: 12 }}>{e.clock_out?.slice(11, 16) || '—'}</td>
                                      <td style={{ padding: '4px 8px', fontSize: 12, fontWeight: 500 }}>{fmtHours(e.hours)}</td>
                                      <td style={{ padding: '4px 8px', fontSize: 12, color: T.muted }}>{e.notes || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )
                            : <div style={{ fontSize: 12, color: T.muted, padding: '8px' }}>No entries recorded.</div>
                          }
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}
