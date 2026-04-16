import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LocationsTab from './LocationsTab'
import DepartmentsTab from './DepartmentsTab'
import ManufacturersTab from './ManufacturersTab'
import ModelsTab from './ModelsTab'
import SuppliersTab from './SuppliersTab'
import CategoriesTab from './CategoriesTab'

const TABS = [
  { key: 'locations',     label: 'Locations' },
  { key: 'departments',   label: 'Departments' },
  { key: 'manufacturers', label: 'Manufacturers' },
  { key: 'models',        label: 'Models' },
  { key: 'suppliers',     label: 'Suppliers' },
  { key: 'categories',    label: 'Categories' },
]

const TAB_COMPONENTS = {
  locations:     LocationsTab,
  departments:   DepartmentsTab,
  manufacturers: ManufacturersTab,
  models:        ModelsTab,
  suppliers:     SuppliersTab,
  categories:    CategoriesTab,
}

const ADMIN_ROLES = ['superadmin', 'admin']

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('locations')
  const [toast, setToast] = useState(null) // { message, type: 'success'|'error' }
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 640)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (!ADMIN_ROLES.includes(user?.role)) {
    return <Navigate to="/" replace />
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const ActiveTab = TAB_COMPONENTS[activeTab]

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          background: toast.type === 'error' ? '#c0392b' : '#27ae60',
          color: '#fff', padding: '10px 18px', borderRadius: 8,
          fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          maxWidth: 360,
        }}>
          {toast.message}
        </div>
      )}

      {/* Left sub-nav — hidden on mobile, replaced by select */}
      {isMobile ? (
        <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0, width: '100%' }}>
          <select
            value={activeTab}
            onChange={e => setActiveTab(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: '1px solid #e5e7eb', fontSize: 13, color: '#374151',
              background: '#fff', fontFamily: 'inherit',
            }}
          >
            {TABS.map(tab => <option key={tab.key} value={tab.key}>{tab.label}</option>)}
          </select>
        </div>
      ) : (
        <aside style={{
          width: 200, flexShrink: 0,
          background: '#fff',
          borderRight: '1px solid #e5e7eb',
          display: 'flex', flexDirection: 'column',
          paddingTop: 24,
        }}>
          <div style={{ padding: '0 20px 16px', fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase' }}>
            Settings
          </div>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 20px', border: 'none',
                background: activeTab === tab.key ? '#fff7f4' : 'transparent',
                borderLeft: activeTab === tab.key ? '3px solid #ff6b35' : '3px solid transparent',
                color: activeTab === tab.key ? '#ff6b35' : '#374151',
                fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </aside>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', background: '#f0f2f5' }}>
        <ActiveTab showToast={showToast} />
      </div>
    </div>
  )
}
