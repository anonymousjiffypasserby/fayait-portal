import { useState, useEffect } from 'react'
import { T } from './shared'
import AssetReports from './AssetReports'
import FinancialReports from './FinancialReports'
import MonitoringReports from './MonitoringReports'
import CustomReport from './CustomReport'
import ProjectReports from './ProjectReports'
import HRReports from './HRReports'

const NAV = [
  {
    section: 'Assets',
    items: [
      { key: 'inventory',        label: 'Inventory' },
      { key: 'by-status',        label: 'By Status' },
      { key: 'by-location',      label: 'By Location' },
      { key: 'by-department',    label: 'By Department' },
      { key: 'by-category',      label: 'By Category' },
      { key: 'warranty-expiring',label: 'Warranty Expiring' },
      { key: 'audit-due',        label: 'Audit Due' },
      { key: 'checkout-history', label: 'Checkout History' },
      { key: 'never-checked-in', label: 'Never Checked In' },
      { key: 'age',              label: 'Age Report' },
    ],
  },
  {
    section: 'Financial',
    items: [
      { key: 'depreciation',    label: 'Depreciation' },
      { key: 'purchase-cost',   label: 'Purchase Cost' },
      { key: 'maintenance-costs',label: 'Maintenance Costs' },
    ],
  },
  {
    section: 'Monitoring',
    items: [
      { key: 'alert-history',      label: 'Alert History' },
      { key: 'offline-history',    label: 'Offline History' },
      { key: 'software-inventory', label: 'Software Inventory' },
      { key: 'pending-updates',    label: 'Pending Updates' },
    ],
  },
  {
    section: 'Projects',
    items: [
      { key: 'proj-overview', label: 'Overview' },
      { key: 'proj-by-dept',  label: 'By Department' },
      { key: 'proj-by-user',  label: 'By User' },
      { key: 'proj-overdue',  label: 'Overdue' },
      { key: 'proj-activity', label: 'Activity' },
    ],
  },
  {
    section: 'HR',
    items: [
      { key: 'hr-payroll',   label: 'Payroll Summary' },
      { key: 'hr-hours',     label: 'Hours Worked' },
      { key: 'hr-leave-bal', label: 'Leave Balances' },
      { key: 'hr-leave-use', label: 'Leave Usage' },
      { key: 'hr-overtime',  label: 'Overtime' },
      { key: 'hr-headcount', label: 'Headcount' },
      { key: 'hr-schedule',  label: 'Schedule Coverage' },
    ],
  },
  {
    section: 'Custom',
    items: [
      { key: 'custom', label: 'Custom Report Builder' },
    ],
  },
]

const ASSET_VIEWS     = new Set(['inventory','by-status','by-location','by-department','by-category','warranty-expiring','audit-due','checkout-history','never-checked-in','age'])
const FINANCIAL_VIEWS = new Set(['depreciation','purchase-cost','maintenance-costs'])
const MONITORING_VIEWS= new Set(['alert-history','offline-history','software-inventory','pending-updates'])
const PROJECTS_VIEWS  = new Set(['proj-overview','proj-by-dept','proj-by-user','proj-overdue','proj-activity'])
const HR_VIEWS        = new Set(['hr-payroll','hr-hours','hr-leave-bal','hr-leave-use','hr-overtime','hr-headcount','hr-schedule'])

export default function Reports() {
  const [view, setView] = useState('inventory')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 640)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const allItems = NAV.flatMap(({ items }) => items)

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', overflow: 'hidden', fontFamily: T.font }}>
      {/* ── Left sub-nav (desktop) / select dropdown (mobile) ── */}
      {isMobile ? (
        <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <select
            value={view}
            onChange={e => setView(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: `1px solid ${T.border}`, fontSize: 13, color: T.text,
              background: '#fff', fontFamily: T.font,
            }}
          >
            {allItems.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </div>
      ) : (
        <aside style={{
          width: 200, flexShrink: 0,
          background: '#fff',
          borderRight: `1px solid ${T.border}`,
          overflowY: 'auto',
          padding: '16px 0',
        }}>
          <div style={{ padding: '0 16px 12px', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: T.muted }}>
            Reports
          </div>
          {NAV.map(({ section, items }) => (
            <div key={section} style={{ marginBottom: 8 }}>
              <div style={{
                padding: '6px 16px 4px',
                fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
                textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)',
              }}>
                {section}
              </div>
              {items.map(item => (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '7px 16px',
                    border: 'none',
                    background: view === item.key ? 'rgba(37,99,235,0.08)' : 'transparent',
                    borderLeft: view === item.key ? `2px solid ${T.blue}` : '2px solid transparent',
                    color: view === item.key ? T.blue : T.text,
                    fontSize: 13, cursor: 'pointer', fontFamily: T.font,
                    fontWeight: view === item.key ? 600 : 400,
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </aside>
      )}

      {/* ── Right content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {ASSET_VIEWS.has(view)      && <AssetReports view={view} />}
        {FINANCIAL_VIEWS.has(view)  && <FinancialReports view={view} />}
        {MONITORING_VIEWS.has(view) && <MonitoringReports view={view} />}
        {PROJECTS_VIEWS.has(view)   && <ProjectReports view={view} />}
        {HR_VIEWS.has(view)         && <HRReports view={view} />}
        {view === 'custom'          && <CustomReport />}
      </div>
    </div>
  )
}
