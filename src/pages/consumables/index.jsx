import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { T, isLowStock, isOutOfStock } from './shared'
import Sidebar from './Sidebar'
import ConsumableTable from './ConsumableTable'
import DetailPanel from './DetailPanel'
import { ConsumableFormModal, UseModal, ConfirmRetireModal } from './modals'
import RequestModal from '../requests/RequestModal'
import api from '../../services/api'

const ADMIN_ROLES = ['superadmin', 'admin']

const VIEW_FILTER = {
  available:   c => !c.retired && (c.quantity || 0) > 0,
  outofstock:  c => isOutOfStock(c),
  lowstock:    c => isLowStock(c),
  requestable: c => c.requestable && !c.retired,
  retired:     () => true,
}

const VIEW_TITLES = {
  all: 'All Consumables', available: 'Available', outofstock: 'Out of Stock',
  lowstock: 'Low Stock', requestable: 'Requestable', retired: 'Retired',
}

export default function Consumables({ hideSidebar = false }) {
  const { user } = useAuth()
  const isAdmin = ADMIN_ROLES.includes(user?.role)
  const [searchParams, setSearchParams] = useSearchParams()

  const activeView = searchParams.get('view') || 'all'
  const search     = searchParams.get('q')    || ''

  const [consumables, setConsumables] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const [openCon,     setOpenCon]     = useState(null)
  const [modal,       setModal]       = useState(null)
  const [selected,    setSelected]    = useState(new Set())
  const [requestItem, setRequestItem] = useState(null)

  const showRetired = activeView === 'retired'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getConsumables(showRetired)
      setConsumables(Array.isArray(data) ? data : (data?.rows || []))
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
  const filtered = consumables.filter(c => {
    const viewFn = VIEW_FILTER[activeView]
    if (viewFn && !viewFn(c)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(
        c.name?.toLowerCase().includes(q) ||
        c.model_number?.toLowerCase().includes(q) ||
        c.item_no?.toLowerCase().includes(q) ||
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

  // ── CRUD actions ──────────────────────────────────────────────────────────
  const handleCreate = async (form) => {
    const created = await api.createConsumable(form)
    setConsumables(prev => [created, ...prev].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const handleUpdate = async (form) => {
    const updated = await api.updateConsumable(openCon.id, form)
    setConsumables(prev => prev.map(c => c.id === openCon.id ? updated : c))
    setOpenCon(updated)
  }

  const handleRetire = async (id) => {
    await api.retireConsumable(id)
    setConsumables(prev => prev.filter(c => c.id !== id))
    setOpenCon(null)
  }

  const handleRestore = async (id) => {
    await api.restoreConsumable(id)
    setConsumables(prev => prev.filter(c => c.id !== id))
  }

  const handleUse = async (id, form) => {
    const updated = await api.useConsumable(id, form)
    setConsumables(prev => prev.map(c => c.id === id ? { ...c, quantity: updated.quantity, status: updated.status } : c))
    setOpenCon(prev => prev?.id === id ? { ...prev, quantity: updated.quantity, status: updated.status } : prev)
  }

  const handleBulkRetire = async () => {
    if (!window.confirm(`Retire ${selected.size} consumable(s)?`)) return
    await Promise.all([...selected].map(id => api.retireConsumable(id)))
    setConsumables(prev => prev.filter(c => !selected.has(c.id)))
    clearSelected()
  }

  const handleExport = () => {
    const rows = filtered.filter(c => selected.size === 0 || selected.has(c.id))
    const header = 'Name,Category,Manufacturer,Model,Item No,Location,Status,Quantity,Min Quantity'
    const csv = [header, ...rows.map(c =>
      [c.name, c.category_name, c.manufacturer_name, c.model_number, c.item_no,
       c.location_name, c.status, c.quantity, c.min_quantity]
        .map(v => `"${(v || '').toString().replace(/"/g, '""')}"`)
        .join(',')
    )].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url
    el.download = `consumables-${activeView}-${new Date().toISOString().slice(0, 10)}.csv`
    el.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', fontFamily: T.font, minHeight: '100%' }}>
      {!hideSidebar && <Sidebar activeView={activeView} onViewChange={setView} consumables={consumables} />}

      <div style={{ flex: 1, padding: 24, paddingBottom: 80, minWidth: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.navy }}>
              {VIEW_TITLES[activeView] || 'Consumables'}
            </h1>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
              {filtered.length} {filtered.length === 1 ? 'consumable' : 'consumables'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={handleExport} style={{ fontSize: 12, padding: '7px 13px', borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff', cursor: 'pointer', color: T.text, fontWeight: 600 }}>
              Export CSV
            </button>
            {isAdmin && (
              <button onClick={() => setModal('create')} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: 'none', background: T.navy, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                + Add Consumable
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            placeholder="Search name, model, item no, location, manufacturer…"
            value={search}
            onChange={e => setParam('q', e.target.value)}
            style={{ width: '100%', maxWidth: 420, padding: '8px 12px', borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {error   && <div style={{ color: T.red, marginBottom: 14, fontSize: 13 }}>Error: {error}</div>}
        {loading && <div style={{ color: T.muted, fontSize: 13, padding: 20, textAlign: 'center' }}>Loading consumables…</div>}

        {!loading && (
          <ConsumableTable
            consumables={filtered}
            selected={selected}
            onSelect={toggleSelect}
            onSelectAll={selectAll}
            onOpen={con => setOpenCon(con)}
            showRestore={activeView === 'retired'}
            onRestore={handleRestore}
            onRequest={(!isAdmin && activeView === 'requestable') ? setRequestItem : null}
          />
        )}
      </div>

      {/* Detail panel */}
      {openCon && modal == null && (
        <DetailPanel
          con={openCon}
          isAdmin={isAdmin}
          onClose={() => setOpenCon(null)}
          onEdit={() => setModal('edit')}
          onUse={() => setModal('use')}
          onRetire={() => setModal('retire')}
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
        <ConsumableFormModal onClose={() => setModal(null)} onSave={handleCreate} />
      )}
      {modal === 'edit' && openCon && (
        <ConsumableFormModal consumable={openCon} onClose={() => setModal(null)} onSave={handleUpdate} />
      )}
      {modal === 'use' && openCon && (
        <UseModal consumable={openCon} onClose={() => setModal(null)} onUse={handleUse} />
      )}
      {modal === 'retire' && openCon && (
        <ConfirmRetireModal consumable={openCon} onClose={() => setModal(null)} onConfirm={handleRetire} />
      )}
      {requestItem && (
        <RequestModal
          item={requestItem}
          itemType="consumable"
          onClose={() => setRequestItem(null)}
          onSubmit={async (data) => { await api.submitRequest(data); setRequestItem(null) }}
        />
      )}
    </div>
  )
}
