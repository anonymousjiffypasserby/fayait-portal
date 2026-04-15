import { useState, useEffect } from 'react'
import { T, ACC_STATUS_COLORS, isLowStock, availableQty, fmtDate } from './shared'
import api from '../../services/api'

const TABS = ['Overview', 'Checkouts', 'History']

const InfoRow = ({ label, value, children }) => {
  const display = children || value
  if (!display && display !== 0) return null
  return (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 11, color: T.muted, width: 150, flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.4, paddingTop: 1 }}>{label}</div>
      <div style={{ fontSize: 12, color: T.text, fontWeight: 500, flex: 1 }}>{children || value}</div>
    </div>
  )
}

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>{title}</div>
    {children}
  </div>
)

const StatusBadge = ({ status }) => {
  if (!status) return null
  const color = ACC_STATUS_COLORS[status] || T.muted
  return (
    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: color + '18', color, border: `1px solid ${color}30` }}>
      {status}
    </span>
  )
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────
function TabOverview({ acc }) {
  const avail = availableQty(acc)
  const low   = isLowStock(acc)
  const pctOut = acc.quantity > 0 ? Math.round((acc.qty_checked_out || 0) / acc.quantity * 100) : 0

  return (
    <div>
      {/* Stock summary cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Total',     value: acc.quantity || 0,          color: T.navy },
          { label: 'Available', value: avail,                       color: low ? T.yellow : T.green },
          { label: 'Checked Out',value: acc.qty_checked_out || 0,  color: T.blue },
        ].map(card => (
          <div key={card.label} style={{ flex: 1, background: '#f8f9fa', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Stock bar */}
      {acc.quantity > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: T.muted }}>
            <span>Stock utilisation</span>
            <span>{pctOut}% checked out</span>
          </div>
          <div style={{ height: 6, background: '#f0f2f5', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${pctOut}%`, height: '100%', background: pctOut > 80 ? T.red : T.blue, borderRadius: 3, transition: 'width 0.4s' }} />
          </div>
        </div>
      )}

      {low && (
        <div style={{ background: T.yellow + '15', border: `1px solid ${T.yellow}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: T.yellow, fontWeight: 600 }}>
          ⚠ Low stock — only {avail} remaining (minimum: {acc.min_quantity})
        </div>
      )}

      <div style={{ marginBottom: 12 }}><StatusBadge status={acc.status} /></div>

      <Section title="Identity">
        <InfoRow label="Name" value={acc.name} />
        <InfoRow label="Category" value={acc.category_name} />
        <InfoRow label="Manufacturer" value={acc.manufacturer_name} />
        <InfoRow label="Model Number" value={acc.model_number} />
        <InfoRow label="Serial" value={acc.serial} />
        <InfoRow label="Location" value={acc.location_name} />
        {acc.requestable && <InfoRow label="Requestable" value="Yes" />}
      </Section>

      <Section title="Purchase Info">
        <InfoRow label="Purchase Date" value={fmtDate(acc.purchase_date)} />
        <InfoRow label="Purchase Cost" value={acc.purchase_cost ? `$${acc.purchase_cost}` : null} />
        <InfoRow label="Supplier" value={acc.supplier_name} />
        <InfoRow label="Order Number" value={acc.order_number} />
        <InfoRow label="Warranty Expires" value={fmtDate(acc.warranty_expires)} />
      </Section>

      {acc.notes && (
        <Section title="Notes">
          <div style={{ fontSize: 12, color: T.text, background: '#f8f9fa', borderRadius: 8, padding: 12, lineHeight: 1.6 }}>{acc.notes}</div>
        </Section>
      )}
    </div>
  )
}

// ── Tab: Checkouts ────────────────────────────────────────────────────────────
function TabCheckouts({ acc }) {
  const [checkouts, setCheckouts] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    api.getAccessoryCheckouts(acc.id)
      .then(setCheckouts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [acc.id])

  if (loading) return <div style={{ padding: 20, color: T.muted, fontSize: 13 }}>Loading…</div>

  if (checkouts.length === 0) {
    return <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>No active checkouts</div>
  }

  return (
    <div>
      {checkouts.map(co => (
        <div key={co.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.blue + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👤</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{co.user_name || co.user_email || 'Unknown user'}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
              Qty: <strong>{co.quantity}</strong> · Out since: {co.checkout_date?.slice(0, 10)}
              {co.checked_out_by_name && ` · by ${co.checked_out_by_name}`}
            </div>
            {co.note && <div style={{ fontSize: 11, color: T.muted, marginTop: 2, fontStyle: 'italic' }}>{co.note}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Tab: History ──────────────────────────────────────────────────────────────
function TabHistory({ acc }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAccessoryHistory(acc.id)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [acc.id])

  const ACTION_ICONS = { created: '✦', updated: '✏', retired: '⊘', restored: '↩', checked_out: '↗', checked_in: '↙' }

  if (loading) return <div style={{ padding: 20, color: T.muted, fontSize: 13 }}>Loading…</div>
  if (history.length === 0) return <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>No history yet</div>

  return (
    <div>
      {history.map(h => (
        <div key={h.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 16, width: 24, flexShrink: 0, textAlign: 'center', marginTop: 1 }}>{ACTION_ICONS[h.action] || '•'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text, textTransform: 'capitalize' }}>{h.action.replace(/_/g, ' ')}</div>
            <div style={{ fontSize: 11, color: T.muted }}>{h.performed_by} · {new Date(h.created_at).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Panel shell ───────────────────────────────────────────────────────────────
export default function DetailPanel({ acc, isAdmin, onClose, onEdit, onCheckout, onCheckin, onRetire }) {
  const [tab, setTab] = useState('Overview')

  const TAB_CONTENT = { Overview: TabOverview, Checkouts: TabCheckouts, History: TabHistory }
  const TabContent = TAB_CONTENT[tab]

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 490 }}
      />
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
                <span style={{ fontSize: 20 }}>🔌</span>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.name}</h2>
              </div>
              <div style={{ fontSize: 11, color: T.muted }}>{acc.manufacturer_name}{acc.model_number ? ` · ${acc.model_number}` : ''}</div>
            </div>
            <button onClick={onClose} style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: T.muted, flexShrink: 0 }}>×</button>
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
              <ActionBtn label="Edit" onClick={onEdit} />
              <ActionBtn label="Check Out" onClick={onCheckout} color={T.blue} />
              <ActionBtn label="Check In" onClick={onCheckin} />
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
          <TabContent acc={acc} />
        </div>
      </div>
    </>
  )
}

const ActionBtn = ({ label, onClick, color }) => (
  <button onClick={onClick} style={{
    fontSize: 11, padding: '5px 12px', borderRadius: 7,
    border: `1px solid ${color ? color + '44' : T.border}`,
    background: color ? color + '12' : '#f8f9fa',
    color: color || T.text, cursor: 'pointer', fontWeight: 600, fontFamily: T.font,
  }}>{label}</button>
)
