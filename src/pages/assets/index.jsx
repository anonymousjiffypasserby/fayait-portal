import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAssets } from './useAssets'
import { useAssetSSE } from './useAssetSSE'
import AssetTable from './AssetTable'
import AssetCard from './AssetCard'
import DetailPanel from './DetailPanel'
import BulkBar from './BulkBar'
import Sidebar from './Sidebar'
import AllMaintenance from './AllMaintenance'
import QuickScanCheckin from './QuickScanCheckin'
import BulkCheckout from './BulkCheckout'
import Import from './Import'
import Accessories from '../accessories'
import Consumables from '../consumables'
import Components from '../components'
import Kits from '../kits'
import Requests from '../requests'
import {
  ConnectModal, RenameModal, NewAssetModal, EditAssetModal,
  CheckOutModal, CheckInModal, AuditModal, ConfirmRetireModal,
  BulkAssignModal, BulkLocationModal, BulkStatusModal, QRModal,
} from './modals'
import { T, isOnline } from './shared'
import RequestModal from '../requests/RequestModal'
import api from '../../services/api'

const ADMIN_ROLES = ['superadmin', 'admin']

// Which activeView values require loading retired assets
const RETIRED_VIEWS = new Set(['deleted'])

// Status filter implied by the active sidebar view
const STATUS_FOR_VIEW = {
  deployed: 'Deployed',
  ready: 'Ready to Deploy',
  pending: 'Pending',
  maintenance: 'Maintenance',
  archived: 'Archived',
  undeployable: 'Un-deployable',
  lost_stolen: 'Lost/Stolen',
}

const VIEW_TITLES = {
  all: 'All Assets',
  deployed: 'Deployed',
  ready: 'Ready to Deploy',
  pending: 'Pending',
  maintenance: 'Maintenance',
  archived: 'Archived',
  undeployable: 'Un-deployable',
  lost_stolen: 'Lost / Stolen',
  requestable: 'Requestable Assets',
  due_audit: 'Due for Audit',
  due_checkin: 'Due for Checkin',
  deleted: 'Deleted',
  maintenances:  'Maintenances',
  quick_scan:    'Quick Scan Checkin',
  bulk_checkout: 'Bulk Checkout',
  bulk_audit:    'Bulk Audit',
  import:        'Import Assets',
}

export default function Assets() {
  const { user } = useAuth()
  const isAdmin = ADMIN_ROLES.includes(user?.role)
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    assets, setAssets, loading, error, load,
    createAsset, updateAsset, retireAsset, restoreAsset,
    checkoutAsset, checkinAsset, cloneAsset, auditAsset,
  } = useAssets()

  useAssetSSE(setAssets)

  // All state lives in URL params
  const activeView  = searchParams.get('view')    || 'all'
  const search      = searchParams.get('q')       || ''
  const filterType  = searchParams.get('type')    || ''
  const filterOnline= searchParams.get('online')  || ''
  const layout      = searchParams.get('layout')  || 'table'
  // new filters
  const filterStatus   = searchParams.get('status')   || ''
  const filterMfr      = searchParams.get('mfr')      || ''
  const filterModel    = searchParams.get('model')     || ''
  const filterLoc      = searchParams.get('loc')       || ''
  const filterDept     = searchParams.get('dept')      || ''
  const filterCompany  = searchParams.get('company')   || ''
  const filterWarranty = searchParams.get('warranty')  || ''
  const filterAudit    = searchParams.get('audit')     || ''
  const filterCheckedOut = searchParams.get('checkout')|| ''

  const setParam = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }

  const setView = (view) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (view === 'all') next.delete('view')
      else next.set('view', view)
      // Clear search/filters when changing views
      next.delete('q')
      next.delete('type')
      next.delete('online')
      next.delete('status')
      next.delete('mfr')
      next.delete('model')
      next.delete('loc')
      next.delete('dept')
      next.delete('company')
      next.delete('warranty')
      next.delete('audit')
      next.delete('checkout')
      return next
    }, { replace: true })
  }

  const clearFilters = () => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      ;['type','online','status','mfr','model','loc','dept','company','warranty','audit','checkout'].forEach(k => next.delete(k))
      return next
    }, { replace: true })
  }

  // ── Reference data for filter dropdowns ───────────────────────────────────
  const [fMfrs, setFMfrs]       = useState([])
  const [fModels, setFModels]   = useState([])
  const [fLocs, setFLocs]       = useState([])
  const [fDepts, setFDepts]     = useState([])
  const [fCompanies, setFCompanies] = useState([])
  const prevMfr = useRef(null)

  useEffect(() => {
    api.getManufacturers().then(d => setFMfrs(Array.isArray(d) ? d : [])).catch(() => {})
    api.getLocations().then(d => setFLocs(Array.isArray(d) ? d : [])).catch(() => {})
    api.getDepartments().then(d => setFDepts(Array.isArray(d) ? d : [])).catch(() => {})
    if (user?.role === 'superadmin') {
      api.getAdminCompanies().then(d => setFCompanies(Array.isArray(d) ? d : [])).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (prevMfr.current === filterMfr) return
    prevMfr.current = filterMfr
    if (filterMfr) {
      const mfr = fMfrs.find(m => m.name === filterMfr)
      if (mfr) {
        api.getModels(mfr.id).then(d => setFModels(Array.isArray(d) ? d : [])).catch(() => {})
      }
    } else {
      setFModels([])
      if (filterModel) setParam('model', '')
    }
  }, [filterMfr, fMfrs]) // eslint-disable-line react-hooks/exhaustive-deps

  const [selected, setSelected] = useState(new Set())
  const [openAsset,    setOpenAsset]    = useState(null)
  const [modal,        setModal]        = useState(null)
  const [requestAsset, setRequestAsset] = useState(null)

  const showRetired = RETIRED_VIEWS.has(activeView)

  useEffect(() => { load(showRetired) }, [load, showRetired])

  // Keep detail panel in sync with SSE updates
  useEffect(() => {
    if (openAsset) {
      const updated = assets.find(a => a.id === openAsset.id)
      if (updated) setOpenAsset(updated)
    }
  }, [assets])

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = assets.filter(a => {
    const viewStatus = STATUS_FOR_VIEW[activeView]

    if (activeView === 'requestable') {
      if (!a.requestable || a.retired) return false
    } else if (activeView === 'due_audit') {
      const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
      const overdue = !a.last_audited_at || new Date(a.last_audited_at).getTime() < oneYearAgo
      if (!overdue) return false
    } else if (activeView === 'due_checkin') {
      if (!a.expected_checkin_date || !a.checked_out_to || new Date(a.expected_checkin_date) >= new Date()) return false
    } else if (viewStatus) {
      if (a.status !== viewStatus) return false
    }

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
        a.model?.toLowerCase().includes(q) ||
        a.serial?.toLowerCase().includes(q) ||
        a.manufacturer?.toLowerCase().includes(q)
      )) return false
    }

    if (filterType    && a.asset_type    !== filterType)    return false
    if (filterStatus  && a.status        !== filterStatus)  return false
    if (filterMfr     && a.manufacturer  !== filterMfr)     return false
    if (filterModel   && a.model         !== filterModel)    return false
    if (filterLoc     && a.location      !== filterLoc)      return false
    if (filterDept    && a.department    !== filterDept)     return false
    if (filterCompany && a.company_id    !== filterCompany)  return false
    if (filterOnline === 'online'  && !isOnline(a)) return false
    if (filterOnline === 'offline' &&  isOnline(a)) return false

    if (filterWarranty) {
      if (!a.warranty_expires) return false
      const exp = new Date(a.warranty_expires)
      const soon = new Date(); soon.setDate(soon.getDate() + 30)
      if (exp > soon) return false
    }
    if (filterAudit) {
      const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
      const overdue = !a.last_audited_at || new Date(a.last_audited_at).getTime() < oneYearAgo
      if (!overdue) return false
    }
    if (filterCheckedOut && !a.checked_out_to) return false

    return true
  })

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelect = (id, checked) => {
    setSelected(s => { const n = new Set(s); checked ? n.add(id) : n.delete(id); return n })
  }
  const selectAll = (checked) => {
    setSelected(checked ? new Set(filtered.map(a => a.id)) : new Set())
  }
  const clearSelected = () => setSelected(new Set())

  // ── Bulk actions ───────────────────────────────────────────────────────────
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

  const handleBulkStatus = async (status) => {
    await Promise.all([...selected].map(id => updateAsset(id, { status })))
    clearSelected()
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.size} asset(s)? They can be restored from the Deleted view.`)) return
    await Promise.all([...selected].map(id => retireAsset(id)))
    clearSelected()
  }

  const handleBulkAudit = async () => {
    await Promise.all([...selected].map(id => auditAsset(id, {})))
    clearSelected()
  }

  const handleExport = () => {
    const rows = filtered.filter(a => selected.size === 0 || selected.has(a.id))
    const header = 'Hostname,Asset Tag,Status,Type,Assigned To,Department,Location,OS,Serial,IP,Online'
    const csv = [header, ...rows.map(a =>
      [a.hostname, a.asset_tag, a.status, a.asset_type, a.assigned_user, a.department, a.location, a.os, a.serial, a.ip_address, isOnline(a) ? 'Yes' : 'No']
        .map(v => `"${(v || '').toString().replace(/"/g, '""')}"`)
        .join(',')
    )].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `assets-${activeView}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onlineCount = assets.filter(isOnline).length
  const types = [...new Set(assets.map(a => a.asset_type).filter(Boolean))].sort()
  const locations = [...new Set(assets.map(a => a.location).filter(Boolean))].sort()

  const filterSelStyle = (active) => ({
    padding: '7px 10px', borderRadius: 9, fontSize: 13, fontFamily: T.font, cursor: 'pointer',
    border: `1px solid ${active ? T.navy : T.border}`,
    background: active ? '#eef1ff' : T.card,
    color: active ? T.navy : T.text,
    fontWeight: active ? 600 : 400,
  })

  // ── Module overrides (stay at /assets, render sub-module full-screen) ──────
  const activeModule = searchParams.get('module')
  if (activeModule === 'accessories') return <Accessories />
  if (activeModule === 'consumables') return <Consumables />
  if (activeModule === 'components')  return <Components />
  if (activeModule === 'kits')        return <Kits />
  if (activeModule === 'requests')    return <Requests />
  if (activeModule === 'licenses') return (
    <div style={{ display: 'flex', fontFamily: T.font, minHeight: '100%' }}>
      <Sidebar activeView={activeView} onViewChange={setView} assets={assets} />
      <div style={{ flex: 1, padding: 40 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: T.navy }}>Licenses</h2>
        <p style={{ fontSize: 13, color: T.muted }}>Coming soon.</p>
      </div>
    </div>
  )

  // ── Special views ──────────────────────────────────────────────────────────
  if (activeView === 'maintenances') {
    return (
      <div style={{ display: 'flex', fontFamily: T.font, minHeight: '100%' }}>
        <Sidebar activeView={activeView} onViewChange={setView} assets={assets} />
        <div style={{ flex: 1, padding: 24, minWidth: 0 }}>
          <AllMaintenance />
        </div>
      </div>
    )
  }

  if (activeView === 'quick_scan') {
    return (
      <div style={{ display: 'flex', fontFamily: T.font, minHeight: '100%' }}>
        <Sidebar activeView={activeView} onViewChange={setView} assets={assets} />
        <div style={{ flex: 1, padding: 24, minWidth: 0 }}>
          <QuickScanCheckin assets={assets} onCheckin={(id) => checkinAsset(id, {})} />
        </div>
      </div>
    )
  }

  if (activeView === 'bulk_checkout') {
    return (
      <div style={{ display: 'flex', fontFamily: T.font, minHeight: '100%' }}>
        <Sidebar activeView={activeView} onViewChange={setView} assets={assets} />
        <div style={{ flex: 1, padding: 24, minWidth: 0 }}>
          <BulkCheckout
            assets={assets}
            onCheckout={(id, user) => checkoutAsset(id, { checkout_type: 'user', assigned_to: user })}
          />
        </div>
      </div>
    )
  }

  if (activeView === 'import') {
    return (
      <div style={{ display: 'flex', fontFamily: T.font, minHeight: '100%' }}>
        <Sidebar activeView={activeView} onViewChange={setView} assets={assets} />
        <div style={{ flex: 1, padding: 24, minWidth: 0 }}>
          <Import />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', fontFamily: T.font, minHeight: '100%' }}>
      <Sidebar activeView={activeView} onViewChange={setView} assets={assets} />

      <div style={{ flex: 1, padding: 24, paddingBottom: 80, minWidth: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.navy }}>
              {VIEW_TITLES[activeView] || 'Assets'}
            </h1>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
              {filtered.length} {filtered.length === 1 ? 'asset' : 'assets'}
              {activeView === 'all' && (
                <>
                  &nbsp;•&nbsp;<span style={{ color: T.green }}>{onlineCount} online</span>
                  &nbsp;•&nbsp;<span style={{ color: T.red }}>{assets.length - onlineCount} offline</span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {[['table', '☰ Table'], ['card', '⊞ Cards']].map(([v, label]) => (
                <button key={v} onClick={() => setParam('layout', v === 'table' ? '' : v)} style={{
                  padding: '7px 13px', fontSize: 12, border: 'none', cursor: 'pointer',
                  background: layout === v ? T.navy : T.card,
                  color: layout === v ? '#fff' : T.muted,
                  fontWeight: layout === v ? 700 : 400, fontFamily: T.font,
                }}>
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={handleExport}
              style={{ fontSize: 12, padding: '7px 13px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.text, fontWeight: 600 }}
            >
              Export CSV
            </button>
            {isAdmin && (
              <button
                onClick={() => setModal('new')}
                style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: 'none', background: T.navy, color: '#fff', cursor: 'pointer', fontWeight: 700 }}
              >
                + Add Asset
              </button>
            )}
          </div>
        </div>

        {/* Filters — row 1: search + type + online */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Search hostname, tag, serial, user, IP, manufacturer..."
            value={search}
            onChange={e => setParam('q', e.target.value)}
            style={{ flex: '1 1 260px', padding: '8px 12px', borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: 'none' }}
          />
          <select value={filterType} onChange={e => setParam('type', e.target.value)}
            style={filterSelStyle(!!filterType)}>
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterOnline} onChange={e => setParam('online', e.target.value)}
            style={filterSelStyle(!!filterOnline)}>
            <option value="">All Connectivity</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        {/* Filters — row 2: reference dropdowns + toggles */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filterStatus} onChange={e => setParam('status', e.target.value)}
            style={filterSelStyle(!!filterStatus)}>
            <option value="">All Statuses</option>
            {['Ready to Deploy','Deployed','Pending','Maintenance','Un-deployable','Archived','Lost/Stolen'].map(s =>
              <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterMfr} onChange={e => { setParam('mfr', e.target.value); if (!e.target.value) setParam('model', '') }}
            style={filterSelStyle(!!filterMfr)}>
            <option value="">All Manufacturers</option>
            {fMfrs.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
          <select value={filterModel} onChange={e => setParam('model', e.target.value)}
            style={filterSelStyle(!!filterModel)} disabled={!filterMfr}>
            <option value="">{filterMfr ? 'All Models' : 'Select manufacturer first'}</option>
            {fModels.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
          <select value={filterLoc} onChange={e => setParam('loc', e.target.value)}
            style={filterSelStyle(!!filterLoc)}>
            <option value="">All Locations</option>
            {fLocs.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
          </select>
          <select value={filterDept} onChange={e => setParam('dept', e.target.value)}
            style={filterSelStyle(!!filterDept)}>
            <option value="">All Departments</option>
            {fDepts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          {user?.role === 'superadmin' && (
            <select value={filterCompany} onChange={e => setParam('company', e.target.value)}
              style={filterSelStyle(!!filterCompany)}>
              <option value="">All Companies</option>
              {fCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {/* Toggle pills */}
          {[
            ['warranty', '⚠ Warranty expiring'],
            ['audit',    '✎ Due for audit'],
            ['checkout', '↗ Checked out'],
          ].map(([key, label]) => {
            const active = !!searchParams.get(key)
            return (
              <button key={key} onClick={() => setParam(key, active ? '' : '1')}
                style={{ padding: '7px 12px', borderRadius: 9, border: `1px solid ${active ? T.navy : T.border}`, fontSize: 12, background: active ? T.navy : T.card, color: active ? '#fff' : T.text, cursor: 'pointer', fontFamily: T.font, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>
                {label}
              </button>
            )
          })}
          {/* Clear all */}
          {(filterType||filterOnline||filterStatus||filterMfr||filterModel||filterLoc||filterDept||filterCompany||filterWarranty||filterAudit||filterCheckedOut) && (
            <button onClick={clearFilters}
              style={{ padding: '7px 12px', borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 12, background: 'transparent', color: T.muted, cursor: 'pointer', fontFamily: T.font }}>
              × Clear filters
            </button>
          )}
        </div>

        {/* Error / loading */}
        {error && <div style={{ color: T.red, marginBottom: 14, fontSize: 13 }}>Error: {error}</div>}
        {loading && <div style={{ color: T.muted, fontSize: 13, padding: 20, textAlign: 'center' }}>Loading assets...</div>}

        {/* Content */}
        {!loading && (
          layout === 'table' ? (
            <AssetTable
              assets={filtered}
              selected={selected}
              onSelect={toggleSelect}
              onSelectAll={selectAll}
              onOpen={asset => setOpenAsset(asset)}
              showRestore={activeView === 'deleted'}
              onRestore={restoreAsset}
              onRequest={(!isAdmin && activeView === 'requestable') ? setRequestAsset : null}
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
      </div>

      {/* Detail panel */}
      {openAsset && (
        <DetailPanel
          asset={openAsset}
          isAdmin={isAdmin}
          onAssetUpdate={updateAsset}
          onClose={() => setOpenAsset(null)}
          onEdit={() => setModal('edit')}
          onConnect={() => setModal('connect')}
          onRetire={() => setModal('retire')}
          onCheckout={() => setModal('checkout')}
          onCheckin={() => setModal('checkin')}
          onClone={() => cloneAsset(openAsset.id)}
          onAudit={() => setModal('audit')}
          onRename={() => setModal('rename')}
          onQR={() => setModal('qr')}
        />
      )}

      {/* Click-outside overlay (doesn't cover sidebar) */}
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
        onStatus={() => setModal('bulkStatus')}
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
        <CheckOutModal asset={openAsset} onClose={() => setModal(null)} onCheckout={checkoutAsset} locations={locations} />
      )}
      {modal === 'checkin' && openAsset && (
        <CheckInModal asset={openAsset} onClose={() => setModal(null)} onCheckin={checkinAsset} locations={locations} />
      )}
      {modal === 'audit' && openAsset && (
        <AuditModal asset={openAsset} onClose={() => setModal(null)} onAudit={auditAsset} />
      )}
      {modal === 'retire' && openAsset && (
        <ConfirmRetireModal
          asset={openAsset}
          onClose={() => setModal(null)}
          onConfirm={(id) => { retireAsset(id); setOpenAsset(null); setModal(null) }}
        />
      )}
      {modal === 'qr' && openAsset && (
        <QRModal asset={openAsset} onClose={() => setModal(null)} />
      )}
      {modal === 'bulkAssign' && (
        <BulkAssignModal count={selected.size} onClose={() => setModal(null)} onConfirm={handleBulkAssign} />
      )}
      {modal === 'bulkLocation' && (
        <BulkLocationModal count={selected.size} onClose={() => setModal(null)} onConfirm={handleBulkLocation} />
      )}
      {modal === 'bulkStatus' && (
        <BulkStatusModal count={selected.size} onClose={() => setModal(null)} onConfirm={handleBulkStatus} />
      )}
      {requestAsset && (
        <RequestModal
          item={requestAsset}
          itemType="asset"
          onClose={() => setRequestAsset(null)}
          onSubmit={async (data) => { await api.submitRequest(data); setRequestAsset(null) }}
        />
      )}
    </div>
  )
}
