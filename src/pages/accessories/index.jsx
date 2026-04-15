import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { T, ACC_STATUS_COLORS, isLowStock, availableQty } from './shared'
import Sidebar from './Sidebar'
import AccessoryTable from './AccessoryTable'
import DetailPanel from './DetailPanel'
import { AccessoryFormModal, CheckoutModal, CheckinModal, ConfirmRetireModal } from './modals'
import RequestModal from '../requests/RequestModal'
import api from '../../services/api'

const ADMIN_ROLES = ['superadmin', 'admin']

const VIEW_FILTER = {
  available:   a => availableQty(a) > 0 && !a.retired,
  checkedout:  a => (a.qty_checked_out || 0) > 0,
  requestable: a => a.requestable && !a.retired,
  lowstock:    a => isLowStock(a),
  retired:     () => true, // fetched separately with ?retired=true
}

export default function Accessories({ hideSidebar = false }) {
  const { user } = useAuth()
  const isAdmin = ADMIN_ROLES.includes(user?.role)
  const [searchParams, setSearchParams] = useSearchParams()

  const activeView = searchParams.get('view') || 'all'
  const search     = searchParams.get('q')    || ''
  const layout     = searchParams.get('layout') || 'table'

  const [accessories, setAccessories] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const [openAcc,       setOpenAcc]       = useState(null)
  const [modal,         setModal]         = useState(null)
  const [selected,      setSelected]      = useState(new Set())
  const [requestItem,   setRequestItem]   = useState(null)
  const [checkouts, setCheckouts] = useState([])  // for checkin modal

  const showRetired = activeView === 'retired'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getAccessories(showRetired)
      setAccessories(Array.isArray(data) ? data : (data?.rows || []))
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

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = accessories.filter(a => {
    const viewFn = VIEW_FILTER[activeView]
    if (viewFn && !viewFn(a)) return false

    if (search) {
      const q = search.toLowerCase()
      if (!(
        a.name?.toLowerCase().includes(q) ||
        a.model_number?.toLowerCase().includes(q) ||
        a.serial?.toLowerCase().includes(q) ||
        a.location_name?.toLowerCase().includes(q) ||
        a.manufacturer_name?.toLowerCase().includes(q) ||
        a.category_name?.toLowerCase().includes(q)
      )) return false
    }
    return true
  })

  // ── Selection ────────────────────────────────────────────────────────────────
  const toggleSelect = (id, checked) => setSelected(s => { const n = new Set(s); checked ? n.add(id) : n.delete(id); return n })
  const selectAll    = (checked)     => setSelected(checked ? new Set(filtered.map(a => a.id)) : new Set())
  const clearSelected = ()           => setSelected(new Set())

  // ── CRUD actions ─────────────────────────────────────────────────────────────
  const handleCreate = async (form) => {
    const created = await api.createAccessory(form)
    setAccessories(prev => [created, ...prev].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const handleUpdate = async (form) => {
    const updated = await api.updateAccessory(openAcc.id, form)
    setAccessories(prev => prev.map(a => a.id === openAcc.id ? updated : a))
    setOpenAcc(updated)
  }

  const handleRetire = async (id) => {
    await api.retireAccessory(id)
    setAccessories(prev => prev.filter(a => a.id !== id))
    setOpenAcc(null)
  }

  const handleRestore = async (id) => {
    await api.restoreAccessory(id)
    setAccessories(prev => prev.filter(a => a.id !== id))
  }

  const handleCheckout = async (id, form) => {
    await api.checkoutAccessory(id, form)
    await load()
    setOpenAcc(prev => accessories.find(a => a.id === id) || prev)
  }

  const handleCheckin = async (id, form) => {
    await api.checkinAccessory(id, form)
    await load()
  }

  const handleBulkRetire = async () => {
    if (!window.confirm(`Retire ${selected.size} accessory(ies)?`)) return
    await Promise.all([...selected].map(id => api.retireAccessory(id)))
    setAccessories(prev => prev.filter(a => !selected.has(a.id)))
    clearSelected()
  }

  const handleExport = () => {
    const rows = filtered.filter(a => selected.size === 0 || selected.has(a.id))
    const header = 'Name,Category,Manufacturer,Model,Serial,Location,Status,Qty Total,Qty Available,Qty Out'
    const csv = [header, ...rows.map(a =>
      [a.name, a.category_name, a.manufacturer_name, a.model_number, a.serial, a.location_name,
       a.status, a.quantity, availableQty(a), a.qty_checked_out || 0]
        .map(v => `"${(v || '').toString().replace(/"/g, '""')}"`)
        .join(',')
    )].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url
    el.download = `accessories-${activeView}-${new Date().toISOString().slice(0, 10)}.csv`
    el.click()
    URL.revokeObjectURL(url)
  }

  const openCheckin = async (acc) => {
    const cos = await api.getAccessoryCheckouts(acc.id).catch(() => [])
    setCheckouts(Array.isArray(cos) ? cos : [])
    setOpenAcc(acc)
    setModal('checkin')
  }

  const VIEW_TITLES = {
    all: 'All Accessories', available: 'Available', checkedout: 'Checked Out',
    requestable: 'Requestable', lowstock: 'Low Stock', retired: 'Retired',
  }

  return (
    <div style={{ display: 'flex', fontFamily: T.font, minHeight: '100%' }}>
      {!hideSidebar && <Sidebar activeView={activeView} onViewChange={setView} accessories={accessories} />}

      <div style={{ flex: 1, padding: 24, paddingBottom: 80, minWidth: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.navy }}>
              {VIEW_TITLES[activeView] || 'Accessories'}
            </h1>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
              {filtered.length} {filtered.length === 1 ? 'accessory' : 'accessories'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={handleExport} style={{ fontSize: 12, padding: '7px 13px', borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff', cursor: 'pointer', color: T.text, fontWeight: 600 }}>
              Export CSV
            </button>
            {isAdmin && (
              <button onClick={() => setModal('create')} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: 'none', background: T.navy, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                + Add Accessory
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            placeholder="Search name, model, serial, location, manufacturer…"
            value={search}
            onChange={e => setParam('q', e.target.value)}
            style={{ width: '100%', maxWidth: 420, padding: '8px 12px', borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {error  && <div style={{ color: T.red, marginBottom: 14, fontSize: 13 }}>Error: {error}</div>}
        {loading && <div style={{ color: T.muted, fontSize: 13, padding: 20, textAlign: 'center' }}>Loading accessories…</div>}

        {!loading && (
          <AccessoryTable
            accessories={filtered}
            selected={selected}
            onSelect={toggleSelect}
            onSelectAll={selectAll}
            onOpen={acc => setOpenAcc(acc)}
            showRestore={activeView === 'retired'}
            onRestore={handleRestore}
            onRequest={(!isAdmin && activeView === 'requestable') ? setRequestItem : null}
          />
        )}
      </div>

      {/* Detail panel */}
      {openAcc && modal == null && (
        <DetailPanel
          acc={openAcc}
          isAdmin={isAdmin}
          onClose={() => setOpenAcc(null)}
          onEdit={() => setModal('edit')}
          onCheckout={() => setModal('checkout')}
          onCheckin={() => openCheckin(openAcc)}
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
        <AccessoryFormModal onClose={() => setModal(null)} onSave={handleCreate} />
      )}
      {modal === 'edit' && openAcc && (
        <AccessoryFormModal accessory={openAcc} onClose={() => setModal(null)} onSave={handleUpdate} />
      )}
      {modal === 'checkout' && openAcc && (
        <CheckoutModal accessory={openAcc} onClose={() => setModal(null)} onCheckout={handleCheckout} />
      )}
      {modal === 'checkin' && openAcc && (
        <CheckinModal accessory={openAcc} checkouts={checkouts} onClose={() => setModal(null)} onCheckin={handleCheckin} />
      )}
      {modal === 'retire' && openAcc && (
        <ConfirmRetireModal accessory={openAcc} onClose={() => setModal(null)} onConfirm={handleRetire} />
      )}
      {requestItem && (
        <RequestModal
          item={requestItem}
          itemType="accessory"
          onClose={() => setRequestItem(null)}
          onSubmit={async (data) => { await api.submitRequest(data); setRequestItem(null) }}
        />
      )}
    </div>
  )
}
