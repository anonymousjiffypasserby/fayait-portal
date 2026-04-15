import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { T, isCheckedOut } from './shared'
import Sidebar from './Sidebar'
import KitTable from './KitTable'
import DetailPanel from './DetailPanel'
import { KitFormModal, CheckoutKitModal, ConfirmCheckinModal, ConfirmDeleteModal } from './modals'
import api from '../../services/api'

const ADMIN_ROLES = ['superadmin', 'admin']

const VIEW_FILTER = {
  checkedout: k => isCheckedOut(k),
  available:  k => !isCheckedOut(k),
}

export default function Kits() {
  const { user } = useAuth()
  const isAdmin  = ADMIN_ROLES.includes(user?.role)
  const [searchParams, setSearchParams] = useSearchParams()

  const activeView = searchParams.get('view') || 'all'
  const search     = searchParams.get('q')    || ''

  const [kits,    setKits]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const [openKit,          setOpenKit]          = useState(null)
  const [modal,            setModal]            = useState(null)
  const [checkinCheckout,  setCheckinCheckout]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getKits()
      setKits(Array.isArray(data) ? data : (data?.rows || []))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Keep openKit in sync with latest list data
  useEffect(() => {
    if (!openKit) return
    const updated = kits.find(k => k.id === openKit.id)
    if (updated) setOpenKit(prev => ({ ...prev, ...updated }))
  }, [kits]) // eslint-disable-line react-hooks/exhaustive-deps

  const setView = (view) => setSearchParams(prev => {
    const next = new URLSearchParams(prev)
    if (view === 'all') next.delete('view'); else next.set('view', view)
    next.delete('q')
    return next
  }, { replace: true })

  const setParam = (key, value) => setSearchParams(prev => {
    const next = new URLSearchParams(prev)
    if (value) next.set(key, value); else next.delete(key)
    return next
  }, { replace: true })

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = kits.filter(k => {
    const viewFn = VIEW_FILTER[activeView]
    if (viewFn && !viewFn(k)) return false
    if (search) {
      const q = search.toLowerCase()
      return k.name?.toLowerCase().includes(q) || k.notes?.toLowerCase().includes(q)
    }
    return true
  })

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCreate = async (data) => {
    const kit = await api.createKit(data)
    setKits(prev => [...prev, {
      ...kit,
      item_count:       String(kit.items?.length || 0),
      checkout_count:   '0',
      active_checkouts: '0',
    }])
  }

  const handleEdit = async (data) => {
    const kit = await api.updateKit(openKit.id, data)
    const patch = {
      ...kit,
      item_count: String(kit.items?.length || 0),
    }
    setKits(prev => prev.map(k => k.id === kit.id ? { ...k, ...patch } : k))
    setOpenKit(prev => ({ ...prev, ...patch }))
  }

  const handleDelete = async () => {
    await api.deleteKit(openKit.id)
    setKits(prev => prev.filter(k => k.id !== openKit.id))
    setOpenKit(null)
  }

  const handleCheckout = async (data) => {
    const kit = await api.checkoutKit(openKit.id, data)
    const patch = {
      active_checkouts: '1',
      checkout_count: String(parseInt(openKit.checkout_count || 0) + 1),
      last_checkout_date: new Date().toISOString(),
    }
    setKits(prev => prev.map(k => k.id === kit.id ? { ...k, ...patch } : k))
    setOpenKit(prev => ({ ...prev, ...patch }))
  }

  const handleCheckin = async () => {
    const data = checkinCheckout?.id ? { checkout_id: checkinCheckout.id } : {}
    const kit = await api.checkinKit(openKit.id, data)
    const patch = { active_checkouts: '0' }
    setKits(prev => prev.map(k => k.id === kit.id ? { ...k, ...patch } : k))
    setOpenKit(prev => ({ ...prev, ...patch }))
  }

  const openCheckout = (kit) => {
    setOpenKit(kit)
    setModal('checkout')
  }

  const openCheckin = (_kit, checkout) => {
    setCheckinCheckout(checkout || null)
    setModal('checkin')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: T.bg, fontFamily: T.font }}>
      <Sidebar activeView={activeView} onViewChange={setView} kits={kits} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        marginRight: openKit ? 520 : 0, transition: 'margin-right 0.2s',
      }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: T.card, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <input
            value={search}
            onChange={e => setParam('q', e.target.value)}
            placeholder="Search kits..."
            style={{ flex: 1, maxWidth: 340, padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: 'none' }}
          />
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: T.muted }}>{filtered.length} kit{filtered.length !== 1 ? 's' : ''}</span>
          {isAdmin && (
            <button
              onClick={() => setModal('create')}
              style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: T.navy, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}
            >
              + New Kit
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>Loading kits…</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: T.red }}>{error}</div>
          ) : (
            <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <KitTable
                kits={filtered}
                onOpen={setOpenKit}
                onCheckout={openCheckout}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {openKit && (
        <DetailPanel
          kit={openKit}
          isAdmin={isAdmin}
          onClose={() => setOpenKit(null)}
          onEdit={() => setModal('edit')}
          onCheckout={() => setModal('checkout')}
          onCheckin={openCheckin}
          onDelete={() => setModal('delete')}
        />
      )}

      {/* Click-outside overlay */}
      {openKit && (
        <div onClick={() => setOpenKit(null)} style={{ position: 'fixed', inset: 0, zIndex: 490 }} />
      )}

      {/* Modals */}
      {modal === 'create' && (
        <KitFormModal
          onClose={() => setModal(null)}
          onSave={handleCreate}
        />
      )}
      {modal === 'edit' && openKit && (
        <KitFormModal
          kitId={openKit.id}
          onClose={() => setModal(null)}
          onSave={handleEdit}
        />
      )}
      {modal === 'checkout' && openKit && (
        <CheckoutKitModal
          kitId={openKit.id}
          kitName={openKit.name}
          onClose={() => setModal(null)}
          onCheckout={handleCheckout}
        />
      )}
      {modal === 'checkin' && openKit && (
        <ConfirmCheckinModal
          kit={openKit}
          onClose={() => setModal(null)}
          onConfirm={handleCheckin}
        />
      )}
      {modal === 'delete' && openKit && (
        <ConfirmDeleteModal
          kit={openKit}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
