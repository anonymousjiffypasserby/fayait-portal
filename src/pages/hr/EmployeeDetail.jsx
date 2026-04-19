import { useState, useEffect, useRef } from 'react'
import { T, hrApi, fmtDate, fmtTime, fmtHours, Avatar, Spinner, EmptyState,
         EmpStatusBadge, ContractBadge, LeaveStatusBadge, TsBadge, GoalStatusBadge,
         Modal, Field, Input, Select, Textarea, Btn, ErrMsg, isAdmin } from './shared'

const TABS = ['Profile', 'Documents', 'Leave', 'Timesheets', 'Goals', 'Reviews']

// ── Stars display ─────────────────────────────────────────────────────────────
const Stars = ({ rating }) => (
  <span style={{ color: T.yellow, fontSize: 14, letterSpacing: 1 }}>
    {Array.from({ length: 5 }, (_, i) => i < rating ? '★' : '☆').join('')}
  </span>
)

// ── Goal progress bar ─────────────────────────────────────────────────────────
const ProgressBar = ({ value }) => (
  <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
    <div style={{
      height: '100%', borderRadius: 3,
      width: `${value || 0}%`,
      background: value >= 100 ? T.green : T.orange,
      transition: 'width 0.3s',
    }} />
  </div>
)

// ── Add Goal modal ────────────────────────────────────────────────────────────
function AddGoalModal({ employeeId, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', due_date: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const save = async () => {
    if (!form.title.trim()) return setErr('Title is required')
    setSaving(true); setErr(null)
    try {
      await hrApi.createGoal({ ...form, employee_id: employeeId })
      onSaved()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Add Goal" onClose={onClose} width={440}>
      <ErrMsg msg={err} />
      <Field label="Title" required>
        <Input value={form.title} onChange={f('title')} placeholder="Goal title" />
      </Field>
      <Field label="Description">
        <Textarea value={form.description} onChange={f('description')} placeholder="Details…" />
      </Field>
      <Field label="Due Date">
        <Input type="date" value={form.due_date} onChange={f('due_date')} />
      </Field>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" loading={saving} onClick={save}>Save</Btn>
      </div>
    </Modal>
  )
}

// ── Inline goal editor ────────────────────────────────────────────────────────
function GoalEditor({ goal, onClose, onSaved }) {
  const [form, setForm] = useState({ progress: goal.progress ?? 0, status: goal.status || 'active', description: goal.description || '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const save = async () => {
    setSaving(true); setErr(null)
    try {
      await hrApi.updateGoal(goal.id, form)
      onSaved()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ marginTop: 10, padding: 12, background: '#f8f9fa', borderRadius: 8, border: `1px solid ${T.border}` }}>
      <ErrMsg msg={err} />
      <Field label={`Progress: ${form.progress}%`}>
        <input type="range" min={0} max={100} step={5}
          value={form.progress}
          onChange={e => setForm(p => ({ ...p, progress: parseInt(e.target.value) }))}
          style={{ width: '100%', accentColor: T.orange }}
        />
      </Field>
      <Field label="Status">
        <Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </Field>
      <Field label="Description">
        <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
      </Field>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" style={{ fontSize: 12 }} onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" style={{ fontSize: 12 }} loading={saving} onClick={save}>Save</Btn>
      </div>
    </div>
  )
}

// ── Start Review modal ────────────────────────────────────────────────────────
function StartReviewModal({ employeeId, onClose, onSaved }) {
  const [form, setForm] = useState({ period: '', rating: '3', strengths: '', improvements: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const save = async () => {
    if (!form.period.trim()) return setErr('Period is required')
    setSaving(true); setErr(null)
    try {
      await hrApi.createReview({ ...form, employee_id: employeeId, rating: parseInt(form.rating) })
      onSaved()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Start Review" onClose={onClose} width={480}>
      <ErrMsg msg={err} />
      <Field label="Period" required>
        <Input value={form.period} onChange={f('period')} placeholder="e.g. Q1 2026, H1 2026" />
      </Field>
      <Field label="Rating (1–5)" required>
        <Select value={form.rating} onChange={f('rating')}>
          {[1, 2, 3, 4, 5].map(n => (
            <option key={n} value={n}>{n} — {'★'.repeat(n)}{'☆'.repeat(5 - n)}</option>
          ))}
        </Select>
      </Field>
      <Field label="Strengths">
        <Textarea value={form.strengths} onChange={f('strengths')} placeholder="What the employee does well…" />
      </Field>
      <Field label="Areas for Improvement">
        <Textarea value={form.improvements} onChange={f('improvements')} placeholder="Where to grow…" />
      </Field>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={f('notes')} placeholder="Additional notes…" />
      </Field>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" loading={saving} onClick={save}>Submit Review</Btn>
      </div>
    </Modal>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EmployeeDetail({ employee, user, onClose, onUpdated }) {
  const [tab, setTab]     = useState('Profile')
  const [data, setData]   = useState(null)
  const [docs, setDocs]   = useState([])
  const [leave, setLeave] = useState([])
  const [ts, setTs]       = useState([])
  const [jfs, setJfs]     = useState([])
  const [goals, setGoals] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm]   = useState({})
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [expandedGoal, setExpandedGoal] = useState(null)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [showStartReview, setShowStartReview] = useState(false)
  const fileRef = useRef()

  const load = () => {
    setLoading(true)
    hrApi.getEmployee(employee.id)
      .then(e => { setData(e); setForm(profileFields(e)) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [employee.id])

  useEffect(() => {
    if (tab === 'Documents')  hrApi.getDocs(employee.id).then(setDocs).catch(() => {})
    if (tab === 'Leave')      hrApi.getLeaveRequests(`?employee_id=${employee.id}`).then(d => setLeave(Array.isArray(d) ? d : (d?.rows || []))).catch(() => {})
    if (tab === 'Timesheets') hrApi.getTimesheets(`?employee_id=${employee.id}&limit=10`).then(d => setTs(Array.isArray(d) ? d : (d?.rows || []))).catch(() => {})
    if (tab === 'Goals')      hrApi.getGoals(`?employee_id=${employee.id}`).then(d => setGoals(Array.isArray(d) ? d : (d?.rows || []))).catch(() => {})
    if (tab === 'Reviews')    hrApi.getReviews(`?employee_id=${employee.id}`).then(d => setReviews(Array.isArray(d) ? d : (d?.rows || []))).catch(() => {})
  }, [tab, employee.id])

  useEffect(() => {
    hrApi.getJobFunctions().then(d => setJfs(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const profileFields = (e) => ({
    job_title: e.job_title || '',
    job_function_id: e.job_function_id || '',
    phone: e.phone || '',
    employee_number: e.employee_number || '',
    contract_type: e.contract_type || '',
    employment_status: e.employment_status || 'active',
    start_date: e.start_date?.slice(0, 10) || '',
    end_date: e.end_date?.slice(0, 10) || '',
  })

  const saveProfile = async () => {
    setSaving(true); setFormErr(null)
    try {
      await hrApi.updateEmployee(employee.id, form)
      load(); onUpdated?.()
      setEditing(false)
    } catch (e) { setFormErr(e.message) }
    finally { setSaving(false) }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('document_type', 'General')
    try { await hrApi.uploadDoc(employee.id, fd); hrApi.getDocs(employee.id).then(setDocs) }
    catch {}
    finally { setUploading(false); fileRef.current.value = '' }
  }

  const deleteDoc = async (docId) => {
    try { await hrApi.deleteDoc(employee.id, docId); hrApi.getDocs(employee.id).then(setDocs) }
    catch {}
  }

  const reloadGoals = () => {
    hrApi.getGoals(`?employee_id=${employee.id}`).then(d => setGoals(Array.isArray(d) ? d : (d?.rows || []))).catch(() => {})
  }

  const reloadReviews = () => {
    hrApi.getReviews(`?employee_id=${employee.id}`).then(d => setReviews(Array.isArray(d) ? d : (d?.rows || []))).catch(() => {})
  }

  const tabStyle = (t) => ({
    padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: tab === t ? 600 : 400,
    color: tab === t ? T.navy : T.muted,
    borderBottom: tab === t ? `2px solid ${T.orange}` : '2px solid transparent',
    background: 'none', border: 'none', fontFamily: T.font, whiteSpace: 'nowrap',
  })

  const canEdit = isAdmin(user) || employee.manager_id === user?.id
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div style={{
      width: 400, flexShrink: 0, background: '#fff',
      borderLeft: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: T.muted, cursor: 'pointer' }}>✕</button>
        </div>
        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size={24} /></div>
          : (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Avatar name={data?.name || employee.name} url={data?.avatar_url} size={56} />
              <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginTop: 10 }}>{data?.name}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
                {data?.job_title || data?.job_function_name || '—'}
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
                <EmpStatusBadge status={data?.employment_status || 'active'} />
                <ContractBadge type={data?.contract_type} />
              </div>
              {canEdit && !editing && (
                <Btn variant="ghost" style={{ marginTop: 12, fontSize: 12 }} onClick={() => setEditing(true)}>
                  Edit HR Fields
                </Btn>
              )}
            </div>
          )
        }

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: `1px solid ${T.border}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(t => <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>{t}</button>)}
        </div>
      </div>

      {/* Tab body */}
      <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
        {tab === 'Profile' && data && (
          editing
            ? (
              <div>
                <ErrMsg msg={formErr} />
                <Field label="Job Title">
                  <Input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
                </Field>
                <Field label="Job Function">
                  <Select value={form.job_function_id} onChange={e => setForm(f => ({ ...f, job_function_id: e.target.value }))}>
                    <option value="">None</option>
                    {jfs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </Select>
                </Field>
                <Field label="Phone">
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </Field>
                <Field label="Employee Number">
                  <Input value={form.employee_number} onChange={e => setForm(f => ({ ...f, employee_number: e.target.value }))} />
                </Field>
                <Field label="Contract Type">
                  <Select value={form.contract_type} onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))}>
                    <option value="">Select…</option>
                    {['full_time','part_time','contractor','intern'].map(c => (
                      <option key={c} value={c}>{c.replace('_', ' ')}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Employment Status">
                  <Select value={form.employment_status} onChange={e => setForm(f => ({ ...f, employment_status: e.target.value }))}>
                    {['active','inactive','on_leave','terminated'].map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </Select>
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Start Date">
                    <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                  </Field>
                  <Field label="End Date">
                    <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                  </Field>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  <Btn variant="ghost" onClick={() => { setEditing(false); setFormErr(null) }}>Cancel</Btn>
                  <Btn variant="primary" loading={saving} onClick={saveProfile}>Save</Btn>
                </div>
              </div>
            )
            : (
              <dl style={{ margin: 0 }}>
                {[
                  ['Email', data.email],
                  ['Phone', data.phone],
                  ['Employee #', data.employee_number],
                  ['Job Function', data.job_function_name],
                  ['Department', data.department_name || data.department],
                  ['Manager', data.manager_name],
                  ['Start Date', fmtDate(data.start_date)],
                  ['End Date', fmtDate(data.end_date)],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                    <dt style={{ fontSize: 12, color: T.muted }}>{label}</dt>
                    <dd style={{ fontSize: 12, color: T.navy, fontWeight: 500, margin: 0 }}>{val || '—'}</dd>
                  </div>
                ))}
              </dl>
            )
        )}

        {tab === 'Documents' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
              <Btn variant="ghost" style={{ fontSize: 12 }} loading={uploading} onClick={() => fileRef.current?.click()}>
                Upload Document
              </Btn>
            </div>
            {docs.length === 0
              ? <EmptyState icon="📄" title="No documents" sub="No documents uploaded." />
              : docs.map(doc => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: `1px solid ${T.border}`,
                }}>
                  <div>
                    <div style={{ fontSize: 13, color: T.navy }}>📄 {doc.name}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{doc.document_type} · {fmtDate(doc.created_at)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a href={hrApi.docDownloadUrl(employee.id, doc.id)} target="_blank" rel="noreferrer">
                      <Btn variant="ghost" style={{ fontSize: 11, padding: '3px 8px' }}>↓</Btn>
                    </a>
                    {canEdit && (
                      <Btn variant="danger" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => deleteDoc(doc.id)}>✕</Btn>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {tab === 'Leave' && (
          leave.length === 0
            ? <EmptyState icon="🌴" title="No leave requests" />
            : leave.map(r => (
              <div key={r.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.leave_type_name} · {r.days}d</div>
                  <LeaveStatusBadge status={r.status} />
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
                  {fmtDate(r.start_date)} – {fmtDate(r.end_date)}
                </div>
              </div>
            ))
        )}

        {tab === 'Timesheets' && (
          ts.length === 0
            ? <EmptyState icon="⏱" title="No timesheets" />
            : ts.map(t => (
              <div key={t.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Week of {fmtDate(t.week_start)}</div>
                  <TsBadge status={t.status} />
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
                  {fmtHours(t.total_hours)} total · {fmtHours(t.overtime_hours)} OT
                </div>
              </div>
            ))
        )}

        {tab === 'Goals' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              {canEdit && (
                <Btn variant="ghost" style={{ fontSize: 12 }} onClick={() => setShowAddGoal(true)}>
                  + Add Goal
                </Btn>
              )}
            </div>
            {goals.length === 0
              ? <EmptyState icon="🎯" title="No goals" sub="No goals set for this employee." />
              : goals.map(g => {
                const overdue = g.due_date && g.due_date.slice(0, 10) < today && g.status === 'active'
                const expanded = expandedGoal === g.id
                return (
                  <div key={g.id} style={{ padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
                    <div
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpandedGoal(expanded ? null : g.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: T.navy, flex: 1 }}>{g.title}</div>
                        <GoalStatusBadge status={g.status} />
                      </div>
                      <ProgressBar value={g.progress} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                        <span style={{ fontSize: 11, color: T.muted }}>{g.progress ?? 0}% complete</span>
                        {g.due_date && (
                          <span style={{ fontSize: 11, color: overdue ? T.red : T.muted, fontWeight: overdue ? 600 : 400 }}>
                            {overdue ? 'Overdue · ' : 'Due '}{fmtDate(g.due_date)}
                          </span>
                        )}
                      </div>
                      {g.description && (
                        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{g.description}</div>
                      )}
                    </div>
                    {expanded && (
                      <GoalEditor
                        goal={g}
                        onClose={() => setExpandedGoal(null)}
                        onSaved={() => { setExpandedGoal(null); reloadGoals() }}
                      />
                    )}
                  </div>
                )
              })
            }
          </div>
        )}

        {tab === 'Reviews' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              {canEdit && (
                <Btn variant="ghost" style={{ fontSize: 12 }} onClick={() => setShowStartReview(true)}>
                  + Start Review
                </Btn>
              )}
            </div>
            {reviews.length === 0
              ? <EmptyState icon="📋" title="No reviews" sub="No performance reviews yet." />
              : reviews.map(r => (
                <div key={r.id} style={{ padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>{r.period}</div>
                    <Stars rating={r.rating} />
                  </div>
                  {r.strengths && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: T.green, marginBottom: 2 }}>Strengths</div>
                      <div style={{ fontSize: 12, color: '#374151' }}>{r.strengths}</div>
                    </div>
                  )}
                  {r.improvements && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: T.orange, marginBottom: 2 }}>Areas for Improvement</div>
                      <div style={{ fontSize: 12, color: '#374151' }}>{r.improvements}</div>
                    </div>
                  )}
                  {r.notes && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 2 }}>Notes</div>
                      <div style={{ fontSize: 12, color: '#374151' }}>{r.notes}</div>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
                    {fmtDate(r.created_at)}{r.reviewer_name ? ` · by ${r.reviewer_name}` : ''}
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {showAddGoal && (
        <AddGoalModal
          employeeId={employee.id}
          onClose={() => setShowAddGoal(false)}
          onSaved={() => { setShowAddGoal(false); reloadGoals() }}
        />
      )}

      {showStartReview && (
        <StartReviewModal
          employeeId={employee.id}
          onClose={() => setShowStartReview(false)}
          onSaved={() => { setShowStartReview(false); reloadReviews() }}
        />
      )}
    </div>
  )
}
