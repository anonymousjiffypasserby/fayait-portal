import { useState, useEffect, useCallback } from 'react'
import { T, hrApi, fmtDate, fmtDateShort, Avatar, Spinner, EmptyState, LeaveStatusBadge, Btn, Modal, Field, Textarea, ErrMsg } from './shared'
import PermissionGate from '../../components/PermissionGate'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function LeaveRequests() {
  const [requests, setRequests] = useState([])
  const [calendar, setCalendar] = useState([])
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState('list')
  const [calYear, setCalYear]   = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1)
  const [denyModal, setDenyModal] = useState(null)
  const [denyReason, setDenyReason] = useState('')
  const [acting, setActing]     = useState(null)
  const [err, setErr]           = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    hrApi.getLeaveRequests('?status=pending')
      .then(d => setRequests(Array.isArray(d) ? d : (d?.rows || [])))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  const loadCalendar = useCallback(() => {
    hrApi.getLeaveCalendar(`?year=${calYear}&month=${calMonth}`)
      .then(setCalendar).catch(() => setCalendar([]))
  }, [calYear, calMonth])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadCalendar() }, [loadCalendar])

  const approve = async (id) => {
    setActing(id)
    try { await hrApi.updateLeaveRequest(id, { action: 'approve' }); load() }
    catch (e) { setErr(e.message) }
    finally { setActing(null) }
  }

  const deny = async () => {
    if (!denyModal) return
    setActing(denyModal.id)
    try {
      await hrApi.updateLeaveRequest(denyModal.id, { action: 'deny', reason: denyReason })
      setDenyModal(null); setDenyReason('')
      load()
    } catch (e) { setErr(e.message) }
    finally { setActing(null) }
  }

  // Calendar grid
  const firstDay = new Date(Date.UTC(calYear, calMonth - 1, 1))
  const daysInMonth = new Date(Date.UTC(calYear, calMonth, 0)).getUTCDate()
  const startDow = firstDay.getUTCDay()

  const daysGrid = Array.from({ length: daysInMonth }, (_, i) => {
    const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    const events = calendar.filter(c => dateStr >= c.date && dateStr <= c.end_date)
    return { day: i + 1, date: dateStr, events }
  })

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>
          Leave Requests
          {requests.length > 0 && (
            <span style={{ fontSize: 13, color: T.muted, fontWeight: 400, marginLeft: 8 }}>{requests.length} pending</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant={view === 'list' ? 'primary' : 'ghost'} style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setView('list')}>≡ List</Btn>
          <Btn variant={view === 'calendar' ? 'primary' : 'ghost'} style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setView('calendar')}>📅 Calendar</Btn>
        </div>
      </div>

      <ErrMsg msg={err} />

      {view === 'list' && (
        loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={28} /></div>
          : requests.length === 0
            ? <EmptyState icon="🌴" title="No pending requests" sub="All leave requests have been reviewed." />
            : (
              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
                {requests.map((r, i) => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                    borderBottom: i < requests.length - 1 ? `1px solid ${T.border}` : 'none',
                  }}>
                    <Avatar name={r.employee_name} url={r.avatar_url} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>{r.employee_name}</div>
                      <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                        <strong>{r.leave_type_name}</strong> · {r.days} day{r.days !== 1 ? 's' : ''} ·{' '}
                        {fmtDateShort(r.start_date)} – {fmtDateShort(r.end_date)}
                      </div>
                      {r.reason && (
                        <div style={{ fontSize: 12, color: T.muted, marginTop: 3, fontStyle: 'italic' }}>"{r.reason}"</div>
                      )}
                    </div>
                    <PermissionGate module="hr_leave" action="approve">
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <Btn variant="primary" style={{ fontSize: 12, padding: '5px 12px' }}
                          loading={acting === r.id} onClick={() => approve(r.id)}>
                          Approve
                        </Btn>
                        <Btn variant="danger" style={{ fontSize: 12, padding: '5px 12px' }}
                          loading={acting === r.id} onClick={() => setDenyModal(r)}>
                          Deny
                        </Btn>
                      </div>
                    </PermissionGate>
                  </div>
                ))}
              </div>
            )
      )}

      {view === 'calendar' && (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.navy }}>{MONTH_NAMES[calMonth - 1]} {calYear}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="ghost" style={{ padding: '4px 10px' }} onClick={() => {
                const d = new Date(Date.UTC(calYear, calMonth - 2, 1))
                setCalYear(d.getUTCFullYear()); setCalMonth(d.getUTCMonth() + 1)
              }}>←</Btn>
              <Btn variant="ghost" style={{ padding: '4px 10px' }} onClick={() => {
                const d = new Date(Date.UTC(calYear, calMonth, 1))
                setCalYear(d.getUTCFullYear()); setCalMonth(d.getUTCMonth() + 1)
              }}>→</Btn>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, color: T.muted, fontWeight: 600, paddingBottom: 8 }}>{d}</div>
            ))}
            {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}
            {daysGrid.map(({ day, date, events }) => (
              <div key={date} style={{
                minHeight: 64, border: `1px solid ${T.border}`, borderRadius: 6, padding: 4,
                background: events.length ? '#f0fdf4' : '#fff',
              }}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 3 }}>{day}</div>
                {events.slice(0, 2).map((ev, i) => (
                  <div key={i} style={{
                    fontSize: 9, background: '#bbf7d0', color: '#166534',
                    borderRadius: 3, padding: '1px 4px', marginBottom: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }} title={`${ev.employee_name} — ${ev.leave_type_name}`}>
                    {ev.employee_name?.split(' ')[0]}
                  </div>
                ))}
                {events.length > 2 && (
                  <div style={{ fontSize: 9, color: T.muted }}>+{events.length - 2} more</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deny modal */}
      {denyModal && (
        <Modal title="Deny Leave Request" onClose={() => { setDenyModal(null); setDenyReason('') }}>
          <p style={{ fontSize: 13, color: T.muted, marginTop: 0 }}>
            Denying <strong>{denyModal.employee_name}</strong>'s {denyModal.leave_type_name} request
            ({fmtDate(denyModal.start_date)} – {fmtDate(denyModal.end_date)}).
          </p>
          <Field label="Reason for denial (optional)">
            <Textarea value={denyReason} onChange={e => setDenyReason(e.target.value)} placeholder="Provide a reason…" />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setDenyModal(null)}>Cancel</Btn>
            <Btn variant="danger" loading={acting === denyModal.id} onClick={deny}>Deny Request</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
