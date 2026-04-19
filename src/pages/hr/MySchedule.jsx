import { useState, useEffect } from 'react'
import { T, hrApi, fmtTime, fmtDate, Spinner, EmptyState, Btn, Modal, Field, Textarea, isoMonday, addDays, weekDays } from './shared'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function MySchedule() {
  const today     = isoMonday(new Date().toISOString().slice(0, 10))
  const [week, setWeek] = useState(today)
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [swapShift, setSwapShift] = useState(null)
  const [swapNote, setSwapNote]   = useState('')
  const [swapSaving, setSwapSaving] = useState(false)
  const [swapErr, setSwapErr]     = useState(null)

  const load = () => {
    setLoading(true)
    hrApi.getMySchedule(`?week_start=${week}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [week])

  const days = weekDays(week)
  const shifts = data?.shifts || []
  const leaves = data?.leaves || []

  const shiftForDay = (date) => shifts.find(s => s.date === date)
  const leaveForDay = (date) => leaves.find(l => date >= l.start_date && date <= l.end_date)

  const handleSwap = async () => {
    setSwapSaving(true); setSwapErr(null)
    try {
      await hrApi.requestSwap({ shift_id: swapShift.id, notes: swapNote })
      setSwapShift(null); setSwapNote('')
    } catch (e) { setSwapErr(e.message) }
    finally { setSwapSaving(false) }
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>My Schedule</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
            Week of {fmtDate(week)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Btn variant="ghost" onClick={() => setWeek(addDays(week, -7))} style={{ padding: '6px 12px' }}>← Prev</Btn>
          <Btn variant="ghost" onClick={() => setWeek(today)} style={{ padding: '6px 12px' }}>Today</Btn>
          <Btn variant="ghost" onClick={() => setWeek(addDays(week, 7))} style={{ padding: '6px 12px' }}>Next →</Btn>
        </div>
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={28} /></div>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
            {days.map((date, i) => {
              const shift  = shiftForDay(date)
              const leave  = leaveForDay(date)
              const isToday = date === new Date().toISOString().slice(0, 10)

              return (
                <div key={date} style={{
                  background: '#fff', borderRadius: 10,
                  border: `1px solid ${isToday ? T.orange : T.border}`,
                  overflow: 'hidden',
                  boxShadow: isToday ? `0 0 0 2px ${T.orange}22` : 'none',
                }}>
                  {/* Day header */}
                  <div style={{
                    padding: '8px 10px', borderBottom: `1px solid ${T.border}`,
                    background: isToday ? '#fff8f5' : '#fafbfc',
                  }}>
                    <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>{DAY_LABELS[i]}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isToday ? T.orange : T.navy, marginTop: 1 }}>
                      {new Date(date + 'T00:00:00Z').getUTCDate()}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '10px 10px', minHeight: 90 }}>
                    {leave && (
                      <div style={{
                        background: '#fefce8', border: '1px solid #fde68a',
                        borderRadius: 6, padding: '6px 8px', marginBottom: 6,
                        fontSize: 11, color: '#92400e',
                      }}>
                        🌴 {leave.leave_type_name || 'Leave'}
                      </div>
                    )}

                    {shift && !leave && (
                      <div style={{
                        background: shift.template_color ? `${shift.template_color}18` : '#eff6ff',
                        borderLeft: `3px solid ${shift.template_color || T.blue}`,
                        borderRadius: 6, padding: '7px 9px',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.navy }}>
                          {fmtTime(shift.start_time)} – {fmtTime(shift.end_time)}
                        </div>
                        {shift.template_name && (
                          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{shift.template_name}</div>
                        )}
                        {shift.notes && (
                          <div style={{ fontSize: 11, color: T.muted, marginTop: 4, fontStyle: 'italic' }}>{shift.notes}</div>
                        )}
                        <button
                          onClick={() => setSwapShift(shift)}
                          style={{
                            marginTop: 6, fontSize: 10, color: T.blue,
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            fontFamily: T.font, textDecoration: 'underline',
                          }}
                        >
                          Request swap
                        </button>
                      </div>
                    )}

                    {!shift && !leave && (
                      <div style={{ fontSize: 11, color: T.muted, textAlign: 'center', paddingTop: 16 }}>Off</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      }

      {!loading && !data && (
        <EmptyState icon="📅" title="No schedule published" sub="Your schedule for this week hasn't been published yet." />
      )}

      {/* Swap modal */}
      {swapShift && (
        <Modal title="Request Shift Swap" onClose={() => { setSwapShift(null); setSwapNote('') }}>
          <p style={{ fontSize: 13, color: T.muted, marginTop: 0, marginBottom: 16 }}>
            Requesting a swap for your <strong>{fmtTime(swapShift.start_time)}–{fmtTime(swapShift.end_time)}</strong> shift
            on <strong>{fmtDate(swapShift.date)}</strong>.
          </p>
          {swapErr && <div style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>{swapErr}</div>}
          <Field label="Notes (optional)">
            <Textarea
              value={swapNote}
              onChange={e => setSwapNote(e.target.value)}
              placeholder="Any additional context for the swap request..."
            />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setSwapShift(null)}>Cancel</Btn>
            <Btn variant="primary" loading={swapSaving} onClick={handleSwap}>Submit Request</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
