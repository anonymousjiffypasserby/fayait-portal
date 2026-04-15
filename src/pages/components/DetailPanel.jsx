import { useState, useEffect } from 'react'
import { T, COMP_STATUS_COLORS, availableQty, isLowStock, fmtDate } from './shared'
import api from '../../services/api'

const TABS = ['Overview', 'Installed In']

const InfoRow = ({ label, value, children, mono }) => {
  const display = children || value
  if (!display && display !== 0) return null
  return (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 11, color: T.muted, width: 150, flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.4, paddingTop: 1 }}>{label}</div>
      <div style={{ fontSize: 12, color: T.text, fontWeight: 500, flex: 1, fontFamily: mono ? 'monospace' : undefined }}>{children || value}</div>
    </div>
  )
}

const Sect = ({ title, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>{title}</div>
    {children}
  </div>
)

// ── Tab: Overview ─────────────────────────────────────────────────────────────
function TabOverview({ comp }) {
  const avail = availableQty(comp)
  const low   = isLowStock(comp)
  const installed = parseInt(comp.qty_installed || 0)
  const pctInstalled = comp.quantity > 0 ? Math.round(installed / comp.quantity * 100) : 0

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Total',     value: comp.quantity || 0,  color: T.navy },
          { label: 'Available', value: avail,                color: low ? T.yellow : T.green },
          { label: 'Installed', value: installed,            color: T.blue },
        ].map(card => (
          <div key={card.label} style={{ flex: 1, background: '#f8f9fa', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {comp.quantity > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: T.muted }}>
            <span>Installation rate</span>
            <span>{pctInstalled}% installed</span>
          </div>
          <div style={{ height: 6, background: '#f0f2f5', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${pctInstalled}%`, height: '100%', background: T.blue, borderRadius: 3, transition: 'width 0.4s' }} />
          </div>
        </div>
      )}

      {low && (
        <div style={{ background: T.yellow + '15', border: `1px solid ${T.yellow}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: T.yellow, fontWeight: 600 }}>
          ⚠ Low stock — only {avail} available (minimum: {comp.min_quantity})
        </div>
      )}

      {comp.status && (
        <div style={{ marginBottom: 12 }}>
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px',
            borderRadius: 20,
            background: (COMP_STATUS_COLORS[comp.status] || T.muted) + '18',
            color: COMP_STATUS_COLORS[comp.status] || T.muted,
            border: `1px solid ${(COMP_STATUS_COLORS[comp.status] || T.muted)}30`,
          }}>{comp.status}</span>
        </div>
      )}

      <Sect title="Identity">
        <InfoRow label="Name" value={comp.name} />
        <InfoRow label="Category" value={comp.category_name} />
        <InfoRow label="Manufacturer" value={comp.manufacturer_name} />
        <InfoRow label="Serial" value={comp.serial} mono />
        <InfoRow label="Location" value={comp.location_name} />
      </Sect>

      <Sect title="Purchase Info">
        <InfoRow label="Purchase Date" value={fmtDate(comp.purchase_date)} />
        <InfoRow label="Purchase Cost" value={comp.purchase_cost ? `$${comp.purchase_cost}` : null} />
        <InfoRow label="Supplier" value={comp.supplier_name} />
        <InfoRow label="Order Number" value={comp.order_number} />
      </Sect>

      {comp.notes && (
        <Sect title="Notes">
          <div style={{ fontSize: 12, color: T.text, background: '#f8f9fa', borderRadius: 8, padding: 12, lineHeight: 1.6 }}>{comp.notes}</div>
        </Sect>
      )}
    </div>
  )
}

// ── Tab: Installed In ─────────────────────────────────────────────────────────
function TabInstalledIn({ comp, isAdmin, onUninstall }) {
  const [installs, setInstalls] = useState([])
  const [loading, setLoading]   = useState(true)

  const reload = () => {
    setLoading(true)
    return api.getComponentAssets(comp.id)
      .then(d => setInstalls(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [comp.id]) // eslint-disable-line

  const handleUninstall = async (caId) => {
    if (!window.confirm('Remove this component from the asset?')) return
    try {
      await onUninstall(comp.id, caId)
      setInstalls(prev => prev.filter(i => i.id !== caId))
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return <div style={{ padding: 20, color: T.muted, fontSize: 13 }}>Loading…</div>
  if (installs.length === 0) return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>
      Not installed in any assets
    </div>
  )

  return (
    <div>
      {installs.map(i => (
        <div key={i.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.blue + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>💻</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{i.hostname || 'Unknown asset'}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
              {i.asset_tag && <span>{i.asset_tag} · </span>}
              Qty: <strong>{i.quantity}</strong>
              {i.installed_by_name && ` · by ${i.installed_by_name}`}
              {' · '}{new Date(i.installed_at).toLocaleDateString()}
            </div>
            {i.note && <div style={{ fontSize: 11, color: T.muted, marginTop: 2, fontStyle: 'italic' }}>{i.note}</div>}
          </div>
          {isAdmin && (
            <button
              onClick={() => handleUninstall(i.id)}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.red}30`, background: '#fdecea', color: T.red, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
            >
              Uninstall
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Panel shell ───────────────────────────────────────────────────────────────
export default function DetailPanel({ comp, isAdmin, onClose, onEdit, onInstall, onRetire, onUninstall }) {
  const [tab, setTab] = useState('Overview')

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 490 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 440,
        background: '#fff', boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column', zIndex: 500,
        fontFamily: T.font,
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>🔩</span>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comp.name}</h2>
              </div>
              <div style={{ fontSize: 11, color: T.muted }}>
                {comp.manufacturer_name}{comp.serial ? ` · ${comp.serial}` : ''}
              </div>
            </div>
            <button onClick={onClose} style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: T.muted, flexShrink: 0 }}>×</button>
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
              <ActionBtn label="Edit" onClick={onEdit} />
              <ActionBtn label="Install" onClick={onInstall} color={T.blue} disabled={availableQty(comp) === 0} />
              <ActionBtn label="Retire" onClick={onRetire} color={T.red} />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: tab === t ? 700 : 400,
              color: tab === t ? T.navy : T.muted,
              borderBottom: tab === t ? `2px solid ${T.navy}` : '2px solid transparent',
              fontFamily: T.font,
            }}>{t}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {tab === 'Overview'     && <TabOverview comp={comp} />}
          {tab === 'Installed In' && <TabInstalledIn comp={comp} isAdmin={isAdmin} onUninstall={onUninstall} />}
        </div>
      </div>
    </>
  )
}

const ActionBtn = ({ label, onClick, color, disabled }) => (
  <button onClick={disabled ? undefined : onClick} style={{
    fontSize: 11, padding: '5px 12px', borderRadius: 7,
    border: `1px solid ${color ? color + '44' : T.border}`,
    background: color ? color + '12' : '#f8f9fa',
    color: color || T.text,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600, fontFamily: T.font,
    opacity: disabled ? 0.4 : 1,
  }}>{label}</button>
)
