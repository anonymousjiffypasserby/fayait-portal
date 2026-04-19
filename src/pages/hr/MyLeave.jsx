import { useState, useEffect, useCallback } from 'react'
import { T, hrApi, fmtDate, fmtDateShort, Spinner, EmptyState, LeaveStatusBadge, Btn, Modal, Field, Input, Select, Textarea, ErrMsg } from './shared'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function countWeekdays(start, end) {
  let count = 0
  const d = new Date(start + 'T00:00:00Z')
  const e = new Date(end + 'T00:00:00Z')
  while (d <= e) {
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) count++
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return count
}

export default function MyLeave() {
  const [balances, setBalances] = useState([])
  const [requests, setRequests] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [calendar, setCalendar]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [calYear, setCalYear]     = useState(new Date().getFullYear())
  const [calMonth, setCalMonth]   = useState(new Date().getMonth() + 1)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]   = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.allSettled([
      hrApi.getLeaveBalances(),
      hrApi.getLeaveRequests('?mine=true'),
      hrApi.getLeaveTypes(),
    ]).then(([b, r, lt]) => {
      if (b.status === 'fulfilled') setBalances(Array.isArray(b.value) ? b.value : (b.value?.rows || []))
      if (r.status === 'fulfilled') setRequests(Array.isArray(r.value) ? r.value : (r.value?.rows || []))
      if (lt.status === 'fulfilled') setLeaveTypes(Array.isArray(lt.value) ? lt.value : (lt.value?.rows || []))
    }).finally(() => setLoading(false))
  }, [])

  const loadCalendar = useCallback(() => {
    hrApi.getLeaveCalendar(`?year=${calYear}&month=${calMonth}&mine=true`)
      .then(setCalendar).catch(() => setCalendar([]))
  }, [calYear, calMonth])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadCalendar() }, [loadCalendar])

  const days = countWeekdays(form.start_date, form.end_date)

  const handleSubmit = async () => {
    if (!form.leave_type_id || !form.start_date || !form.end_date) {
      setFormErr('Please fill in all required fields.'); return
    }
    setSaving(true); setFormErr(null)
    try {
      await hrApi.createLeaveRequest({ ...form, days })
      setShowModal(false)
      setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
      load(); loadCalendar()
    } catch (e) { setFormErr(e.message) }
    finally { setSaving(false) }
  }

  const cancelRequest = async (id) => {
    try {
      await hrApi.updateLeaveRequest(id, { action: 'cancel' })
      load()
    } catch {}
  }

  // Build calendar grid
  const firstDay = new Date(Date.UTC(calYear, calMonth - 1, 1))
  const daysInMonth = new Date(Date.UTC(calYear, calMonth, 0)).getUTCDate()
  const startDow = firstDay.getUTCDay() // 0=Sun
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    const evt = calendar.find(c => date >= c.date && date <= c.end_date)
    return { date, day: i + 1, evt }
  })

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={28} /></div>
  )

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>My Leave</div>
        <Btn variant="primary" onClick={() => setShowModal(true)}>+ Request Leave</Btn>
      </div>

      {/* Balance cards */}
      {balances.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {balances.map(b => (
            <div key={b.id} style={{
              background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`,
              padding: '16px 18px',
            }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                {b.leave_type_name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <StatBox label="Allocated" val={b.allocated} />
                <StatBox label="Used" val={b.used} />
                <StatBox label="Remaining" val={b.remaining} highlight />
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: 4, height: 4, overflow: 'hidden', marginTop: 6 }}>
                <div style={{
                  width: `${b.allocated > 0 ? Math.min(100, (b.used / b.allocated) * 100) : 0}%`,
                  height: '100%', background: T.orange, borderRadius: 4,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.navy }}>
            {MONTH_NAMES[calMonth - 1]} {calYear}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => {
              const d = new Date(Date.UTC(calYear, calMonth - 2, 1))
              setCalYear(d.getUTCFullYear()); setCalMonth(d.getUTCMonth() + 1)
            }}>←</Btn>
            <Btn variant="ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => {
              const d = new Date(Date.UTC(calYear, calMonth, 1))
              setCalYear(d.getUTCFullYear()); setCalMonth(d.getUTCMonth() + 1)
            }}>→</Btn>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, color: T.muted, fontWeight: 600, paddingBottom: 6 }}>{d}</div>
          ))}
          {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}
          {calendarDays.map(({ date, day, evt }) => (
            <div key={date} style={{
              padding: '4px 2px', textAlign: 'center', borderRadius: 6, fontSize: 12,
              background: evt ? '#fef9c3' : 'transparent',
              color: evt ? '#854d0e' : '#374151',
              fontWeight: evt ? 600 : 400,
            }}
              title={evt ? `${evt.leave_type_name}` : undefined}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Requests list */}
      <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, marginBottom: 12 }}>My Requests</div>
      {requests.length === 0
        ? <EmptyState icon="🌴" title="No leave requests" sub="Your leave requests will appear here." />
        : (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            {requests.map((r, i) => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: i < requests.length - 1 ? `1px solid ${T.border}` : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>
                    {r.leave_type_name} · {r.days} day{r.days !== 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                    {fmtDateShort(r.start_date)} – {fmtDateShort(r.end_date)}
                    {r.reason && ` · ${r.reason}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <LeaveStatusBadge status={r.status} />
                  {r.status === 'pending' && (
                    <Btn variant="danger" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => cancelRequest(r.id)}>Cancel</Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }

      {/* Request modal */}
      {showModal && (
        <Modal title="Request Leave" onClose={() => { setShowModal(false); setFormErr(null) }}>
          <ErrMsg msg={formErr} />
          <Field label="Leave Type" required>
            <Select value={form.leave_type_id} onChange={e => setForm(f => ({ ...f, leave_type_id: e.target.value }))}>
              <option value="">Select type…</option>
              {leaveTypes.map(lt => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </Select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Start Date" required>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </Field>
            <Field label="End Date" required>
              <Input type="date" value={form.end_date} min={form.start_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </Field>
          </div>
          {form.start_date && form.end_date && (
            <div style={{ fontSize: 13, color: T.blue, fontWeight: 500, marginBottom: 12 }}>
              {days} working day{days !== 1 ? 's' : ''}
            </div>
          )}
          <Field label="Reason">
            <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Optional reason…" />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn variant="primary" loading={saving} onClick={handleSubmit}>Submit Request</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

function StatBox({ label, val, highlight }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: highlight ? T.green : T.navy }}>{val ?? '—'}</div>
      <div style={{ fontSize: 10, color: T.muted }}>{label}</div>
    </div>
  )
}
