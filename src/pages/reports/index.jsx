import { useState } from 'react'
import { T } from './shared'
import AssetReports from './AssetReports'
import FinancialReports from './FinancialReports'
import MonitoringReports from './MonitoringReports'
import CustomReport from './CustomReport'

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
    section: 'Custom',
    items: [
      { key: 'custom', label: 'Custom Report Builder' },
    ],
  },
]

const ASSET_VIEWS     = new Set(['inventory','by-status','by-location','by-department','by-category','warranty-expiring','audit-due','checkout-history','never-checked-in','age'])
const FINANCIAL_VIEWS = new Set(['depreciation','purchase-cost','maintenance-costs'])
const MONITORING_VIEWS= new Set(['alert-history','offline-history','software-inventory','pending-updates'])

export default function Reports() {
  const [view, setView] = useState('inventory')

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: T.font }}>
      {/* ── Left sub-nav ── */}
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

      {/* ── Right content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {ASSET_VIEWS.has(view)      && <AssetReports view={view} />}
        {FINANCIAL_VIEWS.has(view)  && <FinancialReports view={view} />}
        {MONITORING_VIEWS.has(view) && <MonitoringReports view={view} />}
        {view === 'custom'          && <CustomReport />}
      </div>
    </div>
  )
}
