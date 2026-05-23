import { useState } from 'react'
import { T, globalStyle } from './shared'
import FinanceDashboard from './FinanceDashboard'
import Invoices from './Invoices'
import Orders from './Orders'
import Customers from './Customers'
import Items from './Items'
import Accounting from './Accounting'
import Inventory from './Inventory'
import ERPReports from './ERPReports'

const NAV = [
  {
    section: 'Finance',
    items: [
      { key: 'dashboard',   label: 'Overview',       icon: '💰' },
      { key: 'invoices',    label: 'Invoices',        icon: '🧾' },
      { key: 'orders',      label: 'Orders',          icon: '📦' },
      { key: 'accounting',  label: 'Accounting',      icon: '📒' },
    ],
  },
  {
    section: 'Commerce',
    items: [
      { key: 'customers', label: 'Customers',  icon: '👥' },
      { key: 'items',     label: 'Items',      icon: '🏷️' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { key: 'inventory', label: 'Inventory',  icon: '🏭' },
      { key: 'reports',   label: 'Reports',    icon: '📊' },
    ],
  },
]

const VIEW_COMPONENTS = {
  dashboard:  FinanceDashboard,
  invoices:   Invoices,
  orders:     Orders,
  accounting: Accounting,
  customers:  Customers,
  items:      Items,
  inventory:  Inventory,
  reports:    ERPReports,
}

export default function ERP() {
  const [active, setActive] = useState('dashboard')
  const [hov,    setHov]    = useState(false)

  const ActiveView = VIEW_COMPONENTS[active] || FinanceDashboard

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ display: 'flex', height: '100%', fontFamily: T.font, background: T.bg, overflow: 'hidden' }}>
        {/* ERP sidebar */}
        <aside
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            width: hov ? 200 : 52,
            background: T.navy,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.18s ease',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* Brand strip */}
          <div style={{
            height: 52, display: 'flex', alignItems: 'center',
            padding: '0 14px', borderBottom: '1px solid rgba(255,255,255,0.08)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            <span style={{ fontSize: 18 }}>⚙️</span>
            {hov && <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 700, color: '#fff' }}>ERP</span>}
          </div>

          {/* Nav */}
          <nav className="erp-sidebar" style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {NAV.map(section => (
              <div key={section.section}>
                {hov && (
                  <div style={{
                    fontSize: 9, color: 'rgba(255,255,255,0.3)',
                    letterSpacing: 1.5, textTransform: 'uppercase',
                    padding: '10px 14px 4px', whiteSpace: 'nowrap',
                  }}>{section.section}</div>
                )}
                {section.items.map(item => {
                  const isActive = active === item.key
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActive(item.key)}
                      title={!hov ? item.label : undefined}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '9px 14px',
                        border: 'none', background: isActive ? 'rgba(232,93,36,0.18)' : 'transparent',
                        borderLeft: isActive ? `2px solid ${T.orange}` : '2px solid transparent',
                        color: isActive ? T.orange : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer', fontSize: 13, textAlign: 'left',
                        whiteSpace: 'nowrap', overflow: 'hidden',
                        transition: 'background 0.1s',
                      }}
                    >
                      <span style={{ fontSize: 16, flexShrink: 0, width: 22, textAlign: 'center' }}>{item.icon}</span>
                      {hov && <span style={{ fontWeight: isActive ? 600 : 400 }}>{item.label}</span>}
                    </button>
                  )
                })}
                {!hov && <div style={{ height: 6 }} />}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="erp-content" style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          <ActiveView />
        </div>
      </div>
    </>
  )
}
