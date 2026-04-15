import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { T, availableQty, isLowStock } from './shared'
import Sidebar from './Sidebar'
import ComponentTable from './ComponentTable'
import DetailPanel from './DetailPanel'
import { ComponentFormModal, InstallModal, ConfirmRetireModal } from './modals'
import api from '../../services/api'

const ADMIN_ROLES = ['superadmin', 'admin']

const VIEW_FILTER = {
  available: c => !c.retired && availableQty(c) > 0,
  installed: c => parseInt(c.qty_installed || 0) > 0,
  lowstock:  c => isLowStock(c),
  retired:   () => true,
}

const VIEW_TITLES = {
  all: 'All Components', available: 'Available', installed: 'Installed',
  lowstock: 'Low Stock', retired: 'Retired',
}

export default function Components() {
  const { user } = useAuth()
  const isAdmin = ADMIN_ROLES.includes(user?.role)
  const [searchParams, setSearchParams] = useSearchParams()

  const activeView = searchParams.get('view') || 'all'
  const search     = searchParams.get('q')    || ''

  const [components, setComponents] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const [openComp, setOpenComp] = useState(null)
  const [modal, setModal]       = useState(null)
  const [selected, setSelected] = useState(new Set())

  const showRetired = activeView === 'retired'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getComponents(showRetired)
      setComponents(Array.isArray(data) ? data : (data?.rows || []))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [showRetired])

  useEffect(() => { load() }, [load])

  const setParam = (key, value) => setSearchParams(prev => {
    const next = new URLSearchParams(prev)
    if (value) next.set(key, value); else next.delete(key)
    return next
  }, { replace: true })

  const setView = (view) => setSearchParams(prev => {
    const next = new URLSearchParams(prev)
    if (view === 'all') next.delete('view'); else next.set('view', view)
    next.delete('q')
    return next
  }, { replace: true })

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = components.filter(c => {
    const viewFn = VIEW_FILTER[activeView]
    if (viewFn && !viewFn(c)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(
        c.name?.toLowerCase().includes(q) ||
        c.serial?.toLowerCase().includes(q) ||
        c.location_name?.toLowerCase().includes(q) ||
        c.manufacturer_name?.toLowerCase().includes(q) ||
        c.category_name?.toLowerCase().includes(q)
      )) return false
    }
    return true
  })

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleSelect  = (id, checked) => setSelected(s => { const n = new Set(s); checked ? n.add(id) : n.delete(id); return n })
  const selectAll     = (checked)     => setSelected(checked ? new Set(filtered.map(c => c.id)) : new Set())
  const clearSelected = ()            => setSelected(new Set())

  // ── CRUD / install actions ────────────────────────────────────────────────
  const handleCreate = async (form) => {
    const created = await api.createComponent(form)
    setComponents(prev => [created, ...prev].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const handleUpdate = async (form) => {
    const updated = await api.updateComponent(openComp.id, form)
    setComponents(prev => prev.map(c => c.id === openComp.id ? updated : c))
    setOpenComp(updated)
  }

  const handleRetire = async (id) => {
    await api.retireComponent(id)
    setComponents(prev => prev.filter(c => c.id !== id))
    setOpenComp(null)
  }

  const handleRestore = async (id) => {
    await api.restoreComponent(id)
    setComponents(prev => prev.filter(c => c.id !== id))
  }

  const handleInstall = async (id, form) => {
    await api.installComponent(id, form)
    await load()
    setOpenComp(prev => prev?.id === id ? components.find(c => c.id === id) || prev : prev)
  }

  const handleUninstall = async (componentId, caId) => {
    await api.uninstallComponent(componentId, caId)
    await load()
  }

  const handleBulkRetire = async () => {
    if (!window.confirm(`Retire ${selected.size} component(s)?`)) return
    await Promise.all([...selected].map(id => api.retireComponent(id)))
    setComponents(prev => prev.filter(c => !selected.has(c.id)))
    clearSelected()
  }

  const handleExport = () => {
    const rows = filtered.filter(c => selected.size === 0 || selected.has(c.id))
    const header = 'Name,Category,Manufacturer,Serial,Location,Status,Quantity,Available,Installed'
    const csv = [header, ...rows.map(c =>
      [c.name, c.category_name, c.manufacturer_name, c.serial, c.location_name,
       c.status, c.quantity, availableQty(c), c.qty_installed || 0]
        .map(v => `"${(v || '').toString().replace(/"/g, '""')}"`)
        .join(',')
    )].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url
    el.download = `components-${activeView}-${new Date().toISOString().slice(0, 10)}.csv`
    el.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', fontFamily: T.font, minHeight: '100%' }}>
      <Sidebar activeView={activeView} onViewChange={setView} components={components} />

      <div style={{ flex: 1, padding: 24, paddingBottom: 80, minWidth: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.navy }}>
              {VIEW_TITLES[activeView] || 'Components'}
            </h1>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
              {filtered.length} {filtered.length === 1 ? 'component' : 'components'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={handleExport} style={{ fontSize: 12, padding: '7px 13px', borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff', cursor: 'pointer', color: T.text, fontWeight: 600 }}>
              Export CSV
            </button>
            {isAdmin && (
              <button onClick={() => setModal('create')} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: 'none', background: T.navy, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                + Add Component
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            placeholder="Search name, serial, location, manufacturer…"
            value={search}
            onChange={e => setParam('q', e.target.value)}
            style={{ width: '100%', maxWidth: 420, padding: '8px 12px', borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {error   && <div style={{ color: T.red, marginBottom: 14, fontSize: 13 }}>Error: {error}</div>}
        {loading && <div style={{ color: T.muted, fontSize: 13, padding: 20, textAlign: 'center' }}>Loading components…</div>}

        {!loading && (
          <ComponentTable
            components={filtered}
            selected={selected}
            onSelect={toggleSelect}
            onSelectAll={selectAll}
            onOpen={comp => setOpenComp(comp)}
            showRestore={activeView === 'retired'}
            onRestore={handleRestore}
          />
        )}
      </div>

      {/* Detail panel */}
      {openComp && modal == null && (
        <DetailPanel
          comp={openComp}
          isAdmin={isAdmin}
          onClose={() => setOpenComp(null)}
          onEdit={() => setModal('edit')}
          onInstall={() => setModal('install')}
          onRetire={() => setModal('retire')}
          onUninstall={handleUninstall}
        />
      )}

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: T.navy, color: '#fff', borderRadius: 14, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 1000, fontFamily: T.font,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{selected.size} selected</span>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)' }} />
          <button onClick={handleExport} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: `1px solid ${T.border}`, background: '#fff', color: T.text, cursor: 'pointer', fontWeight: 600 }}>Export</button>
          <button onClick={handleBulkRetire} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: `1px solid ${T.red}`, background: T.red, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Retire Selected</button>
          <button onClick={clearSelected} style={{ fontSize: 18, background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
      )}

      {/* Modals */}
      {modal === 'create' && (
        <ComponentFormModal onClose={() => setModal(null)} onSave={handleCreate} />
      )}
      {modal === 'edit' && openComp && (
        <ComponentFormModal component={openComp} onClose={() => setModal(null)} onSave={handleUpdate} />
      )}
      {modal === 'install' && openComp && (
        <InstallModal component={openComp} onClose={() => setModal(null)} onInstall={handleInstall} />
      )}
      {modal === 'retire' && openComp && (
        <ConfirmRetireModal component={openComp} onClose={() => setModal(null)} onConfirm={handleRetire} />
      )}
    </div>
  )
}
