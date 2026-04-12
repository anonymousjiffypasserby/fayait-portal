import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAssets } from './useAssets'
import { useAssetSSE } from './useAssetSSE'
import AssetTable from './AssetTable'
import AssetCard from './AssetCard'
import DetailPanel from './DetailPanel'
import BulkBar from './BulkBar'
import {
  ConnectModal, RenameModal, NewAssetModal, EditAssetModal,
  CheckOutModal, AuditModal, ConfirmRetireModal,
  BulkAssignModal, BulkLocationModal,
} from './modals'
import { T, isOnline } from './shared'
import api from '../../services/api'

const ADMIN_ROLES = ['superadmin', 'admin']

export default function Assets() {
  const { user } = useAuth()
  const isAdmin = ADMIN_ROLES.includes(user?.role)

  const { assets, setAssets, loading, error, load, createAsset, updateAsset, retireAsset, checkoutAsset, checkinAsset, cloneAsset, auditAsset } = useAssets()

  useAssetSSE(setAssets)

  // Selections
  const [selected, setSelected] = useState(new Set())
  const [view, setView] = useState('table') // 'table' | 'card'
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showRetired, setShowRetired] = useState(false)

  // Panel / modals
  const [openAsset, setOpenAsset] = useState(null)
  const [modal, setModal] = useState(null) // 'connect' | 'rename' | 'new' | 'edit' | 'checkout' | 'audit' | 'retire' | 'bulkAssign' | 'bulkLocation'

  useEffect(() => { load(showRetired) }, [load, showRetired])

  // Close panel if asset updated
  useEffect(() => {
    if (openAsset) {
      const updated = assets.find(a => a.id === openAsset.id)
      if (updated) setOpenAsset(updated)
    }
  }, [assets])

  // Filter
  const filtered = assets.filter(a => {
    if (search) {
      const q = search.toLowerCase()
      if (!(
        a.hostname?.toLowerCase().includes(q) ||
        a.assigned_user?.toLowerCase().includes(q) ||
        a.department?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q) ||
        a.ip_address?.includes(q) ||
        a.mac_address?.toLowerCase().includes(q) ||
        a.asset_tag?.toLowerCase().includes(q) ||
        a.model?.toLowerCase().includes(q)
      )) return false
    }
    if (filterType && a.asset_type !== filterType) return false
    if (filterStatus === 'online' && !isOnline(a)) return false
    if (filterStatus === 'offline' && isOnline(a)) return false
    return true
  })

  // Selection helpers
  const toggleSelect = (id, checked) => {
    setSelected(s => { const n = new Set(s); checked ? n.add(id) : n.delete(id); return n })
  }
  const selectAll = (checked) => {
    setSelected(checked ? new Set(filtered.map(a => a.id)) : new Set())
  }
  const clearSelected = () => setSelected(new Set())

  // Actions
  const handleRename = async (id, name, sendToAgent) => {
    await updateAsset(id, { hostname: name })
    if (sendToAgent) {
      await api.sendAssetCommand(id, 'rename_pc', { new_name: name })
    }
  }

  const handleBulkAssign = async (user) => {
    await Promise.all([...selected].map(id => updateAsset(id, { assigned_user: user })))
    clearSelected()
  }

  const handleBulkLocation = async (location) => {
    await Promise.all([...selected].map(id => updateAsset(id, { location })))
    clearSelected()
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Retire ${selected.size} asset(s)?`)) return
    await Promise.all([...selected].map(id => retireAsset(id)))
    clearSelected()
  }

  const handleBulkAudit = async () => {
    await Promise.all([...selected].map(id => auditAsset(id, {})))
    clearSelected()
  }

  const handleExport = () => {
    const rows = filtered.filter(a => selected.size === 0 || selected.has(a.id))
    const header = 'Hostname,Asset Tag,Type,Assigned To,Department,Location,OS,Serial,IP,Online'
    const csv = [header, ...rows.map(a =>
      [a.hostname, a.asset_tag, a.asset_type, a.assigned_user, a.department, a.location, a.os, a.serial, a.ip_address, isOnline(a) ? 'Yes' : 'No'].map(v => `"${v || ''}"`).join(',')
    )].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'assets.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // Counts
  const onlineCount = assets.filter(isOnline).length

  const types = [...new Set(assets.map(a => a.asset_type).filter(Boolean))]

  return (
    <div style={{ fontFamily: T.font, padding: 24, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.navy }}>Assets</h1>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            {assets.length} total &nbsp;•&nbsp;
            <span style={{ color: T.green }}>{onlineCount} online</span> &nbsp;•&nbsp;
            <span style={{ color: T.red }}>{assets.length - onlineCount} offline</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
            {['table', 'card'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '7px 14px', fontSize: 12, border: 'none', cursor: 'pointer',
                background: view === v ? T.navy : T.card,
                color: view === v ? '#fff' : T.muted,
                fontWeight: view === v ? 700 : 400, fontFamily: T.font,
              }}>
                {v === 'table' ? '☰ Table' : '⊞ Cards'}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.text, fontWeight: 600 }}
          >
            Export CSV
          </button>
          {isAdmin && (
            <button
              onClick={() => setModal('new')}
              style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8, border: 'none', background: T.navy, color: '#fff', cursor: 'pointer', fontWeight: 700 }}
            >
              + Add Asset
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="Search hostname, user, IP, tag..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 220px', padding: '8px 12px', borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: 'none' }}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 13, background: T.card, fontFamily: T.font }}>
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 13, background: T.card, fontFamily: T.font }}>
          <option value="">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.muted, cursor: 'pointer', paddingLeft: 4 }}>
          <input type="checkbox" checked={showRetired} onChange={e => setShowRetired(e.target.checked)} />
          Show Retired
        </label>
      </div>

      {/* Error / loading */}
      {error && <div style={{ color: T.red, marginBottom: 14, fontSize: 13 }}>Error: {error}</div>}
      {loading && <div style={{ color: T.muted, fontSize: 13, padding: 20, textAlign: 'center' }}>Loading assets...</div>}

      {/* Content */}
      {!loading && (
        view === 'table' ? (
          <AssetTable
            assets={filtered}
            selected={selected}
            onSelect={toggleSelect}
            onSelectAll={selectAll}
            onOpen={asset => setOpenAsset(asset)}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {filtered.map(asset => (
              <AssetCard
                key={asset.id}
                asset={asset}
                selected={selected.has(asset.id)}
                onSelect={toggleSelect}
                onOpen={asset => setOpenAsset(asset)}
                onConnect={a => { setOpenAsset(a); setModal('connect') }}
                isAdmin={isAdmin}
              />
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: T.muted, padding: 40 }}>No assets found</div>
            )}
          </div>
        )
      )}

      {/* Detail panel */}
      {openAsset && (
        <DetailPanel
          asset={openAsset}
          isAdmin={isAdmin}
          onClose={() => setOpenAsset(null)}
          onEdit={() => setModal('edit')}
          onConnect={a => setModal('connect')}
          onRetire={() => setModal('retire')}
          onCheckout={() => setModal('checkout')}
          onCheckin={() => checkinAsset(openAsset.id)}
          onClone={() => cloneAsset(openAsset.id)}
          onAudit={() => setModal('audit')}
          onRename={() => setModal('rename')}
        />
      )}

      {/* Overlay click-outside area when panel open */}
      {openAsset && (
        <div
          onClick={() => setOpenAsset(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 490 }}
        />
      )}

      {/* Bulk action bar */}
      <BulkBar
        count={selected.size}
        onClear={clearSelected}
        onAssign={() => setModal('bulkAssign')}
        onLocation={() => setModal('bulkLocation')}
        onExport={handleExport}
        onDelete={handleBulkDelete}
        onAudit={handleBulkAudit}
      />

      {/* Modals */}
      {modal === 'connect' && openAsset && <ConnectModal asset={openAsset} onClose={() => setModal(null)} />}
      {modal === 'rename' && openAsset && (
        <RenameModal asset={openAsset} onClose={() => setModal(null)} onRename={handleRename} />
      )}
      {modal === 'new' && (
        <NewAssetModal onClose={() => setModal(null)} onCreate={createAsset} />
      )}
      {modal === 'edit' && openAsset && (
        <EditAssetModal asset={openAsset} onClose={() => setModal(null)} onSave={updateAsset} />
      )}
      {modal === 'checkout' && openAsset && (
        <CheckOutModal asset={openAsset} onClose={() => setModal(null)} onCheckout={checkoutAsset} />
      )}
      {modal === 'audit' && openAsset && (
        <AuditModal asset={openAsset} onClose={() => setModal(null)} onAudit={auditAsset} />
      )}
      {modal === 'retire' && openAsset && (
        <ConfirmRetireModal asset={openAsset} onClose={() => setModal(null)} onConfirm={(id) => { retireAsset(id); setOpenAsset(null) }} />
      )}
      {modal === 'bulkAssign' && (
        <BulkAssignModal count={selected.size} onClose={() => setModal(null)} onConfirm={handleBulkAssign} />
      )}
      {modal === 'bulkLocation' && (
        <BulkLocationModal count={selected.size} onClose={() => setModal(null)} onConfirm={handleBulkLocation} />
      )}
    </div>
  )
}
