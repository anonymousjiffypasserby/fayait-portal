import { useState, useEffect, useCallback } from 'react'
import { T, hrApi, fmtDate, fmtDateShort, fmtHours, Avatar, Spinner, EmptyState, LeaveStatusBadge, Btn, ErrMsg } from './shared'

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = T.navy, accent, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, minWidth: 140,
        background: '#fff', borderRadius: 12,
        border: `1px solid ${T.border}`,
        padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: hov && onClick ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.15s, transform 0.1s',
        transform: hov && onClick ? 'translateY(-1px)' : 'none',
        borderTop: accent ? `3px solid ${accent}` : `1px solid ${T.border}`,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: T.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, action, children, minHeight }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`,
      overflow: 'hidden', minHeight,
    }}>
      <div style={{
        padding: '14px 18px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{title}</div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  )
}

// ── Dept bar ──────────────────────────────────────────────────────────────────
function DeptBar({ name, count, max }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <div style={{ width: 130, fontSize: 12, color: T.navy, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: T.orange, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
      <div style={{ width: 28, fontSize: 12, fontWeight: 600, color: T.navy, textAlign: 'right', flexShrink: 0 }}>{count}</div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function HRPanel({ onNavigate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [acting, setActing] = useState(null)
  const [denyModal, setDenyModal] = useState(null)
  const [denyReason, setDenyReason] = useState('')

  const load = useCallback(() => {
    setLoading(prev => prev === true ? true : false)
    hrApi.getDashboard()
      .then(setData)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const approveLeave = async (id) => {
    setActing(id); setErr(null)
    try { await hrApi.approveLeaveRequest(id); load() }
    catch (e) { setErr(e.message) } finally { setActing(null) }
  }

  const denyLeave = async () => {
    if (!denyModal) return
    setActing(denyModal.id); setErr(null)
    try {
      await hrApi.denyLeaveRequest(denyModal.id, denyReason)
      setDenyModal(null); setDenyReason(''); load()
    } catch (e) { setErr(e.message) } finally { setActing(null) }
  }

  const approveTs = async (id) => {
    setActing(id); setErr(null)
    try { await hrApi.approveTimesheet(id); load() }
    catch (e) { setErr(e.message) } finally { setActing(null) }
  }

  if (loading && !data) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
      <Spinner size={28} />
    </div>
  )
  if (err) return <div style={{ padding: 32 }}><ErrMsg msg={err} /></div>
  if (!data) return null

  const { stats, clocked_in, on_leave_today, pending_leave, pending_timesheets, upcoming_leave, departments } = data
  const maxDept = departments[0]?.headcount || 1

  return (
    <div style={{ padding: 24, fontFamily: T.font }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.navy }}>HR Overview</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>Today's people snapshot</div>
        </div>
        <Btn variant="ghost" style={{ fontSize: 12 }} onClick={load}>↻ Refresh</Btn>
      </div>
      <ErrMsg msg={err} />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatCard label="Active Staff" value={stats.total_employees} sub="employees" accent={T.blue} />
        <StatCard label="Clocked In" value={clocked_in} sub="right now" accent={T.green} />
        <StatCard label="Out Today" value={stats.on_leave_today} sub="on approved leave"
          accent={stats.on_leave_today > 0 ? T.yellow : T.border}
          onClick={stats.on_leave_today > 0 ? () => onNavigate?.('leave_requests') : null}
        />
        <StatCard label="Pending Leave" value={stats.pending_leave} sub="awaiting review"
          accent={stats.pending_leave > 0 ? T.orange : T.border}
          color={stats.pending_leave > 0 ? T.orange : T.navy}
          onClick={stats.pending_leave > 0 ? () => onNavigate?.('leave_requests') : null}
        />
        <StatCard label="Timesheets" value={stats.pending_timesheets} sub="awaiting approval"
          accent={stats.pending_timesheets > 0 ? T.purple : T.border}
          color={stats.pending_timesheets > 0 ? T.purple : T.navy}
          onClick={stats.pending_timesheets > 0 ? () => onNavigate?.('team_timesheets') : null}
        />
        <StatCard label="New Hires" value={stats.new_hires_this_month} sub="this month" accent="#06b6d4" />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Pending leave approvals */}
        <Section
          title={`Leave Requests${pending_leave.length > 0 ? ` (${pending_leave.length})` : ''}`}
          action={pending_leave.length > 0 && (
            <button onClick={() => onNavigate?.('leave_requests')}
              style={{ fontSize: 11, color: T.orange, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.font, fontWeight: 600 }}>
              View all →
            </button>
          )}
        >
          {pending_leave.length === 0
            ? <div style={{ padding: '24px 18px', textAlign: 'center', color: T.muted, fontSize: 13 }}>✓ No pending requests</div>
            : pending_leave.map((r, i) => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                borderBottom: i < pending_leave.length - 1 ? `1px solid ${T.border}` : 'none',
              }}>
                <Avatar name={r.employee_name} url={r.avatar_url} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.employee_name}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                    <span style={{
                      display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: 10,
                      background: r.leave_color ? `${r.leave_color}22` : '#f3f4f6',
                      color: r.leave_color || T.muted, fontWeight: 600, marginRight: 5,
                    }}>{r.leave_type_name || 'Leave'}</span>
                    {fmtDateShort(r.start_date)} – {fmtDateShort(r.end_date)} · {r.days}d
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <Btn variant="primary" style={{ fontSize: 11, padding: '4px 10px' }}
                    loading={acting === r.id} onClick={() => approveLeave(r.id)}>
                    ✓
                  </Btn>
                  <Btn variant="danger" style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => { setDenyModal(r); setDenyReason('') }}>
                    ✕
                  </Btn>
                </div>
              </div>
            ))
          }
        </Section>

        {/* Timesheets to review */}
        <Section
          title={`Timesheets to Review${pending_timesheets.length > 0 ? ` (${pending_timesheets.length})` : ''}`}
          action={pending_timesheets.length > 0 && (
            <button onClick={() => onNavigate?.('team_timesheets')}
              style={{ fontSize: 11, color: T.orange, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.font, fontWeight: 600 }}>
              View all →
            </button>
          )}
        >
          {pending_timesheets.length === 0
            ? <div style={{ padding: '24px 18px', textAlign: 'center', color: T.muted, fontSize: 13 }}>✓ All timesheets reviewed</div>
            : pending_timesheets.map((ts, i) => (
              <div key={ts.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                borderBottom: i < pending_timesheets.length - 1 ? `1px solid ${T.border}` : 'none',
              }}>
                <Avatar name={ts.employee_name} url={ts.avatar_url} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ts.employee_name}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                    Week of {fmtDateShort(ts.week_start)} · {fmtHours(ts.total_hours)}
                    {ts.overtime_hours > 0 && (
                      <span style={{ color: T.red, marginLeft: 4 }}>+{fmtHours(ts.overtime_hours)} OT</span>
                    )}
                  </div>
                </div>
                <Btn variant="primary" style={{ fontSize: 11, padding: '4px 10px' }}
                  loading={acting === ts.id} onClick={() => approveTs(ts.id)}>
                  Approve
                </Btn>
              </div>
            ))
          }
        </Section>

        {/* Who's out today */}
        <Section title={`Out Today${on_leave_today.length > 0 ? ` (${on_leave_today.length})` : ''}`}>
          {on_leave_today.length === 0
            ? <div style={{ padding: '24px 18px', textAlign: 'center', color: T.muted, fontSize: 13 }}>Everyone's in today</div>
            : on_leave_today.map((r, i) => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px',
                borderBottom: i < on_leave_today.length - 1 ? `1px solid ${T.border}` : 'none',
              }}>
                <Avatar name={r.employee_name} url={r.avatar_url} size={30} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>{r.employee_name}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                    <span style={{
                      display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: 10,
                      background: r.leave_color ? `${r.leave_color}22` : '#f3f4f6',
                      color: r.leave_color || T.muted, fontWeight: 600, marginRight: 4,
                    }}>{r.leave_type_name || 'Leave'}</span>
                    back {fmtDateShort(r.end_date)}
                  </div>
                </div>
              </div>
            ))
          }
        </Section>

        {/* Upcoming leave (14 days) */}
        <Section title="Upcoming Leave (14 days)">
          {upcoming_leave.length === 0
            ? <div style={{ padding: '24px 18px', textAlign: 'center', color: T.muted, fontSize: 13 }}>No upcoming approved leave</div>
            : upcoming_leave.map((r, i) => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px',
                borderBottom: i < upcoming_leave.length - 1 ? `1px solid ${T.border}` : 'none',
              }}>
                <div style={{
                  width: 36, flexShrink: 0, textAlign: 'center',
                  background: '#f8fafc', borderRadius: 8, padding: '4px 0',
                }}>
                  <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {new Date(r.start_date + 'T00:00:00Z').toLocaleDateString('en', { month: 'short' })}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, lineHeight: 1.2 }}>
                    {new Date(r.start_date + 'T00:00:00Z').getUTCDate()}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>{r.employee_name}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                    <span style={{
                      display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: 10,
                      background: r.leave_color ? `${r.leave_color}22` : '#f3f4f6',
                      color: r.leave_color || T.muted, fontWeight: 600, marginRight: 4,
                    }}>{r.leave_type_name || 'Leave'}</span>
                    {r.days}d · until {fmtDateShort(r.end_date)}
                  </div>
                </div>
              </div>
            ))
          }
        </Section>
      </div>

      {/* Department headcount */}
      {departments.length > 0 && (
        <Section title="Headcount by Department">
          <div style={{ padding: '12px 20px' }}>
            {departments.map(d => (
              <DeptBar key={d.department} name={d.department} count={d.headcount} max={maxDept} />
            ))}
          </div>
        </Section>
      )}

      {/* Deny modal */}
      {denyModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setDenyModal(null)}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 24, width: 380, maxWidth: '90vw',
            boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 6 }}>Deny Leave Request</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
              {denyModal.employee_name} — {denyModal.leave_type_name} · {fmtDateShort(denyModal.start_date)} – {fmtDateShort(denyModal.end_date)}
            </div>
            <textarea
              value={denyReason}
              onChange={e => setDenyReason(e.target.value)}
              placeholder="Reason for denial (optional)"
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
                fontSize: 13, fontFamily: T.font, resize: 'vertical', boxSizing: 'border-box', marginBottom: 12, outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setDenyModal(null)}>Cancel</Btn>
              <Btn variant="danger" loading={acting === denyModal.id} onClick={denyLeave}>Deny Request</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
