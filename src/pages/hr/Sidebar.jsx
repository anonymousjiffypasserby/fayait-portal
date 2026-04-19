import { T, isAdmin } from './shared'

const MY_HR = [
  { key: 'my_profile',    label: 'My Profile',    icon: '👤' },
  { key: 'my_schedule',   label: 'My Schedule',   icon: '📅' },
  { key: 'my_timesheets', label: 'My Timesheets', icon: '⏱' },
  { key: 'my_leave',      label: 'My Leave',      icon: '🌴' },
  { key: 'my_payslips',   label: 'My Payslips',   icon: '💰' },
]

const TEAM = [
  { key: 'employees',       label: 'Employees',         icon: '👥' },
  { key: 'schedule_builder',label: 'Schedule Builder',  icon: '🗓' },
  { key: 'team_timesheets', label: 'Timesheets',        icon: '✅' },
  { key: 'leave_requests',  label: 'Leave Requests',    icon: '📋' },
]

const PAYROLL = [
  { key: 'payroll', label: 'Pay Periods & Runs', icon: '💳' },
]

const SETTINGS = [
  { key: 'job_functions',  label: 'Job Functions',  icon: '🏷' },
  { key: 'shift_templates',label: 'Shift Templates',icon: '🕐' },
  { key: 'leave_types',    label: 'Leave Types',    icon: '🗂' },
  { key: 'deductions',     label: 'Deductions',     icon: '📉' },
]

export default function HRSidebar({ activeView, onViewChange, user, counts = {} }) {
  const admin = isAdmin(user)

  const itemStyle = (active) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
    background: active ? T.navy : 'transparent',
    color: active ? '#fff' : '#374151',
    fontSize: 13, fontWeight: active ? 600 : 400,
    marginBottom: 1, transition: 'background 0.1s', userSelect: 'none',
  })
  const hover = (active) => ({
    onMouseEnter: e => { if (!active) e.currentTarget.style.background = '#eef0f3' },
    onMouseLeave: e => { if (!active) e.currentTarget.style.background = 'transparent' },
  })

  const NavItem = ({ view, active, badge }) => (
    <div onClick={() => onViewChange(view.key)} style={itemStyle(active)} {...hover(active)}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 14, width: 18, textAlign: 'center', opacity: 0.8 }}>{view.icon}</span>
        <span>{view.label}</span>
      </span>
      {badge > 0 && (
        <span style={{
          fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: 'center',
          background: active ? 'rgba(255,255,255,0.2)' : '#fee2e2',
          color: active ? '#fff' : T.red, padding: '1px 6px', borderRadius: 10,
        }}>{badge}</span>
      )}
    </div>
  )

  const Divider = ({ label }) => (
    <div style={{
      padding: '14px 10px 4px', fontSize: 9, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: 1.2, color: T.muted,
    }}>
      {label}
    </div>
  )

  return (
    <div className="hr-sidebar" style={{
      width: 210, flexShrink: 0,
      borderRight: `1px solid ${T.border}`,
      padding: '12px 8px 24px',
      background: '#fafbfc',
      minHeight: 'calc(100vh - 56px)',
      overflowY: 'auto', scrollbarWidth: 'none',
    }}>
      <Divider label="My HR" />
      {MY_HR.map(v => (
        <NavItem key={v.key} view={v} active={activeView === v.key} />
      ))}

      {admin && <>
        <Divider label="Team" />
        {TEAM.map(v => (
          <NavItem key={v.key} view={v} active={activeView === v.key}
            badge={v.key === 'leave_requests' ? counts.pendingLeave : v.key === 'team_timesheets' ? counts.pendingTimesheets : 0}
          />
        ))}
      </>}

      {admin && <>
        <Divider label="Payroll" />
        {PAYROLL.map(v => (
          <NavItem key={v.key} view={v} active={activeView === v.key} />
        ))}
      </>}

      {admin && <>
        <Divider label="Settings" />
        {SETTINGS.map(v => (
          <NavItem key={v.key} view={v} active={activeView === v.key} />
        ))}
      </>}
    </div>
  )
}
