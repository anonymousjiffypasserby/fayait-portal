import { useState, useEffect, useCallback } from 'react'
import { T, hrApi, fmtDate, fmtTime, fmtHours, Avatar, Spinner, EmptyState, Btn,
         Modal, Field, Input, Select, Textarea, ErrMsg, isoMonday, addDays, weekDays } from './shared'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#6366f1']

export default function ScheduleBuilder() {
  const today   = isoMonday(new Date().toISOString().slice(0, 10))
  const [week, setWeek]       = useState(today)
  const [deptId, setDeptId]   = useState('')
  const [depts, setDepts]     = useState([])
  const [employees, setEmps]  = useState([])
  const [schedule, setSchedule] = useState(null)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Modal state
  const [assignModal, setAssignModal] = useState(null) // { employeeId, date }
  const [editModal, setEditModal]     = useState(null) // existing shift
  const [form, setForm] = useState({ shift_template_id: '', start_time: '', end_time: '', break_minutes: '30', notes: '' })
  const [saving, setSaving]   = useState(false)
  const [formErr, setFormErr] = useState(null)

  useEffect(() => {
    hrApi.getEmployees().then(d => {
      const rows = Array.isArray(d) ? d : (d?.rows || [])
      const deptSet = [...new Map(rows.map(e => [e.department_name || e.department, { name: e.department_name || e.department }]))]
        .map(([, v]) => v).filter(v => v.name)
      setDepts(deptSet)
    }).catch(() => {})
    hrApi.getSettings().then(s => setTemplates(s.shift_templates || [])).catch(() => {})
  }, [])

  const loadSchedule = useCallback(() => {
    setLoading(true)
    const q = `?week_start=${week}${deptId ? `&department=${encodeURIComponent(deptId)}` : ''}`
    hrApi.getSchedule(q)
      .then(s => {
        setSchedule(s)
        // Get employees list
        const empQ = deptId ? `?department=${encodeURIComponent(deptId)}` : ''
        return hrApi.getEmployees(empQ)
      })
      .then(d => setEmps(Array.isArray(d) ? d : (d?.rows || [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [week, deptId])

  useEffect(() => { loadSchedule() }, [loadSchedule])

  const days = weekDays(week)

  const shiftsFor = (employeeId, date) => {
    if (!schedule?.by_employee) return []
    const emp = schedule.by_employee.find(e => e.employee_id === employeeId)
    return emp?.shifts?.filter(s => s.date === date) || []
  }

  const leaveFor = (employeeId, date) => {
    if (!schedule?.leaves) return null
    return schedule.leaves?.find(l => l.employee_id === employeeId && date >= l.start_date && date <= l.end_date)
  }

  const openAssign = (employeeId, date) => {
    setForm({ shift_template_id: '', start_time: '', end_time: '', break_minutes: '30', notes: '' })
    setFormErr(null)
    setAssignModal({ employeeId, date })
  }

  const openEdit = (shift) => {
    setForm({
      shift_template_id: shift.shift_template_id || '',
      start_time: shift.start_time?.slice(0, 5) || '',
      end_time: shift.end_time?.slice(0, 5) || '',
      break_minutes: String(shift.break_minutes || 30),
      notes: shift.notes || '',
    })
    setFormErr(null)
    setEditModal(shift)
  }

  const applyTemplate = (tplId) => {
    const tpl = templates.find(t => t.id === tplId)
    if (tpl) setForm(f => ({
      ...f,
      shift_template_id: tplId,
      start_time: tpl.start_time?.slice(0, 5) || f.start_time,
      end_time: tpl.end_time?.slice(0, 5) || f.end_time,
      break_minutes: String(tpl.break_minutes ?? f.break_minutes),
    }))
    else setForm(f => ({ ...f, shift_template_id: tplId }))
  }

  const saveShift = async () => {
    if (!form.start_time || !form.end_time) { setFormErr('Start and end time required'); return }
    setSaving(true); setFormErr(null)
    try {
      const needSchedule = !schedule?.id
      let scheduleId = schedule?.id

      if (needSchedule) {
        const s = await hrApi.createSchedule({
          week_start: week,
          department: deptId || null,
        })
        scheduleId = s.id
      }

      await hrApi.createShift({
        schedule_id: scheduleId,
        employee_id: assignModal.employeeId,
        date: assignModal.date,
        start_time: form.start_time,
        end_time: form.end_time,
        break_minutes: parseInt(form.break_minutes) || 0,
        shift_template_id: form.shift_template_id || null,
        notes: form.notes || null,
      })
      setAssignModal(null)
      loadSchedule()
    } catch (e) { setFormErr(e.message) }
    finally { setSaving(false) }
  }

  const updateShift = async () => {
    if (!form.start_time || !form.end_time) { setFormErr('Start and end time required'); return }
    setSaving(true); setFormErr(null)
    try {
      await hrApi.updateShift(editModal.id, {
        start_time: form.start_time,
        end_time: form.end_time,
        break_minutes: parseInt(form.break_minutes) || 0,
        shift_template_id: form.shift_template_id || null,
        notes: form.notes || null,
      })
      setEditModal(null)
      loadSchedule()
    } catch (e) { setFormErr(e.message) }
    finally { setSaving(false) }
  }

  const deleteShift = async (shiftId) => {
    try { await hrApi.deleteShift(shiftId); loadSchedule() } catch {}
  }

  const copyFromLastWeek = async () => {
    if (!schedule?.id) return
    setCopying(true)
    try { await hrApi.copySchedule(schedule.id); loadSchedule() }
    catch {}
    finally { setCopying(false) }
  }

  const publish = async () => {
    if (!schedule?.id) return
    setPublishing(true)
    try { await hrApi.publishSchedule(schedule.id); loadSchedule() }
    catch {}
    finally { setPublishing(false) }
  }

  // Week summary per employee
  const summary = schedule?.by_employee || []

  return (
    <div style={{ padding: 24 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.navy, marginRight: 8 }}>Schedule Builder</div>

        <Btn variant="ghost" onClick={() => setWeek(addDays(week, -7))} style={{ padding: '6px 10px' }}>← Prev</Btn>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, minWidth: 160, textAlign: 'center' }}>
          {fmtDate(week)} – {fmtDate(addDays(week, 6))}
        </div>
        <Btn variant="ghost" onClick={() => setWeek(addDays(week, 7))} style={{ padding: '6px 10px' }}>Next →</Btn>

        <select
          value={deptId}
          onChange={e => setDeptId(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.14)', fontSize: 13, fontFamily: T.font }}
        >
          <option value="">All Departments</option>
          {depts.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {schedule?.id && (
            <Btn variant="ghost" loading={copying} onClick={copyFromLastWeek} style={{ fontSize: 12 }}>
              Copy Last Week
            </Btn>
          )}
          {schedule?.published && (
            <span style={{ fontSize: 12, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: 6 }}>
              ✓ Published
            </span>
          )}
          {schedule?.id && !schedule?.published && (
            <Btn variant="primary" loading={publishing} onClick={publish} style={{ fontSize: 12 }}>
              Publish Schedule
            </Btn>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Main grid */}
        <div style={{ flex: 1, overflowX: 'auto', minWidth: 0 }}>
          {loading
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={28} /></div>
            : employees.length === 0
              ? <EmptyState icon="👥" title="No employees" sub="Select a department or add employees first." />
              : (
                <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                    <thead>
                      <tr style={{ background: '#fafbfc', borderBottom: `1px solid ${T.border}` }}>
                        <th style={{ width: 160, padding: '10px 14px', textAlign: 'left', fontSize: 11, color: T.muted, fontWeight: 600 }}>Employee</th>
                        {days.map((date, i) => {
                          const isToday = date === new Date().toISOString().slice(0, 10)
                          return (
                            <th key={date} style={{
                              padding: '8px 6px', fontSize: 11, color: isToday ? T.orange : T.muted,
                              fontWeight: 600, textAlign: 'center', minWidth: 90,
                            }}>
                              <div>{DAY_LABELS[i]}</div>
                              <div style={{ fontSize: 12, color: isToday ? T.orange : T.navy, fontWeight: 700, marginTop: 1 }}>
                                {new Date(date + 'T00:00:00Z').getUTCDate()}
                              </div>
                            </th>
                          )
                        })}
                        <th style={{ width: 60, padding: '10px 8px', fontSize: 11, color: T.muted, fontWeight: 600, textAlign: 'center' }}>Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp, ei) => {
                        const empSummary = summary.find(s => s.employee_id === emp.id)
                        const totalHrs   = empSummary?.total_hours_week || 0
                        const isOT       = totalHrs > 40

                        return (
                          <tr key={emp.id} style={{ borderBottom: ei < employees.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                            <td style={{ padding: '8px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Avatar name={emp.name} url={emp.avatar_url} size={26} />
                                <div style={{ fontSize: 12, fontWeight: 500, color: T.navy, lineHeight: 1.3 }}>
                                  {emp.name.split(' ')[0]}
                                </div>
                              </div>
                            </td>
                            {days.map(date => {
                              const shifts = shiftsFor(emp.id, date)
                              const leave  = leaveFor(emp.id, date)

                              return (
                                <td key={date} style={{ padding: '6px 4px', verticalAlign: 'top' }}>
                                  {leave
                                    ? (
                                      <div
                                        title={`${emp.name} on ${leave.leave_type_name} leave`}
                                        style={{
                                          background: '#f3f4f6', borderRadius: 5, padding: '5px 7px',
                                          fontSize: 10, color: '#9ca3af', textAlign: 'center', cursor: 'default',
                                        }}
                                      >
                                        🌴 Leave
                                      </div>
                                    )
                                    : shifts.length > 0
                                      ? shifts.map(sh => (
                                        <div
                                          key={sh.id}
                                          onClick={() => openEdit(sh)}
                                          style={{
                                            background: sh.template_color ? `${sh.template_color}22` : '#eff6ff',
                                            borderLeft: `3px solid ${sh.template_color || T.blue}`,
                                            borderRadius: 5, padding: '5px 7px',
                                            cursor: 'pointer', marginBottom: 2,
                                          }}
                                        >
                                          <div style={{ fontSize: 11, fontWeight: 600, color: T.navy }}>
                                            {fmtTime(sh.start_time)}
                                          </div>
                                          <div style={{ fontSize: 10, color: T.muted }}>
                                            {fmtTime(sh.end_time)}
                                          </div>
                                        </div>
                                      ))
                                      : (
                                        <div
                                          onClick={() => openAssign(emp.id, date)}
                                          style={{
                                            border: `1px dashed ${T.border}`, borderRadius: 5,
                                            padding: '8px 4px', textAlign: 'center', cursor: 'pointer',
                                            color: '#d1d5db', fontSize: 16, minHeight: 44,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          }}
                                          onMouseEnter={e => { e.currentTarget.style.borderColor = T.orange; e.currentTarget.style.color = T.orange }}
                                          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = '#d1d5db' }}
                                        >
                                          +
                                        </div>
                                      )
                                  }
                                </td>
                              )
                            })}
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <span style={{
                                fontSize: 12, fontWeight: 600,
                                color: isOT ? T.red : T.navy,
                                background: isOT ? '#fef2f2' : 'transparent',
                                padding: isOT ? '2px 6px' : undefined, borderRadius: 4,
                              }}>
                                {fmtHours(totalHrs)}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
          }
        </div>

        {/* Right panel */}
        <div style={{ width: 200, flexShrink: 0 }}>
          {/* Shift templates */}
          {templates.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, letterSpacing: 0.5, marginBottom: 10 }}>Templates</div>
              {templates.map(tpl => (
                <div key={tpl.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                  borderBottom: `1px solid ${T.border}`, fontSize: 12,
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: tpl.color || COLORS[0], flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 500, color: T.navy }}>{tpl.name}</div>
                    <div style={{ color: T.muted, fontSize: 11 }}>{fmtTime(tpl.start_time)}–{fmtTime(tpl.end_time)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Coverage summary */}
          {summary.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, letterSpacing: 0.5, marginBottom: 10 }}>Week Summary</div>
              {summary.map(emp => (
                <div key={emp.employee_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                  <span style={{ color: T.navy, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {emp.employee_name?.split(' ')[0]}
                  </span>
                  <span style={{
                    fontWeight: 600,
                    color: emp.total_hours_week > 40 ? T.red : T.green,
                  }}>
                    {fmtHours(emp.total_hours_week)}
                    {emp.total_hours_week > 40 && ' ⚠'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign shift modal */}
      {assignModal && (
        <Modal title={`Add Shift — ${fmtDate(assignModal.date)}`} onClose={() => setAssignModal(null)}>
          <ErrMsg msg={formErr} />
          <Field label="Shift Template">
            <Select value={form.shift_template_id} onChange={e => applyTemplate(e.target.value)}>
              <option value="">Manual…</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Start Time" required>
              <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value, shift_template_id: '' }))} />
            </Field>
            <Field label="End Time" required>
              <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value, shift_template_id: '' }))} />
            </Field>
          </div>
          <Field label="Break (minutes)">
            <Input type="number" min="0" value={form.break_minutes} onChange={e => setForm(f => ({ ...f, break_minutes: e.target.value }))} />
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setAssignModal(null)}>Cancel</Btn>
            <Btn variant="primary" loading={saving} onClick={saveShift}>Add Shift</Btn>
          </div>
        </Modal>
      )}

      {/* Edit shift modal */}
      {editModal && (
        <Modal title="Edit Shift" onClose={() => setEditModal(null)}>
          <ErrMsg msg={formErr} />
          <Field label="Shift Template">
            <Select value={form.shift_template_id} onChange={e => applyTemplate(e.target.value)}>
              <option value="">Manual…</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Start Time" required>
              <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </Field>
            <Field label="End Time" required>
              <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </Field>
          </div>
          <Field label="Break (minutes)">
            <Input type="number" min="0" value={form.break_minutes} onChange={e => setForm(f => ({ ...f, break_minutes: e.target.value }))} />
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="danger" onClick={() => { deleteShift(editModal.id); setEditModal(null) }}>Delete Shift</Btn>
            <div style={{ flex: 1 }} />
            <Btn variant="ghost" onClick={() => setEditModal(null)}>Cancel</Btn>
            <Btn variant="primary" loading={saving} onClick={updateShift}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
