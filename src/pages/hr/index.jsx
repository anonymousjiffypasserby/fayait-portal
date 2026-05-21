import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { T, hrApi, isAdmin, globalStyle, ADMIN_ROLES } from './shared'
import HRSidebar from './Sidebar'
import HRPanel from './HRPanel'
import MyProfile from './MyProfile'
import MySchedule from './MySchedule'
import MyTimesheets from './MyTimesheets'
import MyLeave from './MyLeave'
import MyPayslips from './MyPayslips'
import Employees from './Employees'
import ScheduleBuilder from './ScheduleBuilder'
import TeamTimesheets from './TeamTimesheets'
import LeaveRequests from './LeaveRequests'
import PayrollRuns from './PayrollRuns'
import JobFunctions from './JobFunctions'
import ShiftTemplates from './ShiftTemplates'
import LeaveTypes from './LeaveTypes'
import Deductions from './Deductions'

const VIEW_COMPONENTS = {
  hr_panel:        HRPanel,
  my_profile:      MyProfile,
  my_schedule:     MySchedule,
  my_timesheets:   MyTimesheets,
  my_leave:        MyLeave,
  my_payslips:     MyPayslips,
  employees:       Employees,
  schedule_builder:ScheduleBuilder,
  team_timesheets: TeamTimesheets,
  leave_requests:  LeaveRequests,
  payroll:         PayrollRuns,
  job_functions:   JobFunctions,
  shift_templates: ShiftTemplates,
  leave_types:     LeaveTypes,
  deductions:      Deductions,
}

function getDefaultView() {
  try {
    const stored = localStorage.getItem('faya_user')
    if (stored) {
      const u = JSON.parse(stored)
      if (ADMIN_ROLES.includes(u?.role)) return 'hr_panel'
    }
  } catch {}
  return 'my_profile'
}

export default function HR() {
  const { user } = useAuth()
  const [activeView, setActiveView] = useState(getDefaultView)
  const [counts, setCounts] = useState({ pendingLeave: 0, pendingTimesheets: 0 })

  useEffect(() => {
    if (!isAdmin(user)) return
    Promise.allSettled([
      hrApi.getLeaveRequests('?status=pending'),
      hrApi.getTimesheets('?status=submitted'),
    ]).then(([lr, ts]) => {
      setCounts({
        pendingLeave: lr.status === 'fulfilled' ? (lr.value?.total || lr.value?.length || 0) : 0,
        pendingTimesheets: ts.status === 'fulfilled' ? (ts.value?.total || ts.value?.length || 0) : 0,
      })
    })
  }, [user])

  const ActiveView = VIEW_COMPONENTS[activeView] || MyProfile

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{
        display: 'flex', height: '100%', fontFamily: T.font,
        background: T.bg, overflow: 'hidden',
      }}>
        <HRSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          user={user}
          counts={counts}
        />
        <div className="hr-content" style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          <ActiveView user={user} onNavigate={setActiveView} />
        </div>
      </div>
    </>
  )
}
