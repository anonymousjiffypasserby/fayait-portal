import { useState, useEffect } from 'react'
import { T, CON_STATUS_COLORS, isLowStock, isOutOfStock, fmtDate } from './shared'
import api from '../../services/api'

const TABS = ['Overview', 'Usage History']

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

const StatusBadge = ({ con }) => {
  if (isOutOfStock(con)) {
    return (
      <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: T.red + '18', color: T.red, border: `1px solid ${T.red}30` }}>
        Out of Stock
      </span>
    )
  }
  const status = con?.status
  if (!status) return null
  const color = CON_STATUS_COLORS[status] || T.muted
  return (
    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: color + '18', color, border: `1px solid ${color}30` }}>
      {status}
    </span>
  )
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────
function TabOverview({ con }) {
  const low = isLowStock(con)
  const out = isOutOfStock(con)

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'In Stock', value: con.quantity || 0, color: out ? T.red : low ? T.yellow : T.navy },
          { label: 'Min Stock', value: con.min_quantity || 0, color: T.muted },
        ].map(card => (
          <div key={card.label} style={{ flex: 1, background: '#f8f9fa', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {out && (
        <div style={{ background: T.red + '12', border: `1px solid ${T.red}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: T.red, fontWeight: 600 }}>
          ⊘ Out of stock — needs restocking
        </div>
      )}
      {!out && low && (
        <div style={{ background: T.yellow + '15', border: `1px solid ${T.yellow}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: T.yellow, fontWeight: 600 }}>
          ⚠ Low stock — only {con.quantity} remaining (minimum: {con.min_quantity})
        </div>
      )}

      <div style={{ marginBottom: 12 }}><StatusBadge con={con} /></div>

      <Section title="Identity">
        <InfoRow label="Name" value={con.name} />
        <InfoRow label="Category" value={con.category_name} />
        <InfoRow label="Manufacturer" value={con.manufacturer_name} />
        <InfoRow label="Model Number" value={con.model_number} />
        <InfoRow label="Item No." value={con.item_no} />
        <InfoRow label="Location" value={con.location_name} />
        {con.requestable && <InfoRow label="Requestable" value="Yes" />}
      </Section>

      <Section title="Purchase Info">
        <InfoRow label="Purchase Date" value={fmtDate(con.purchase_date)} />
        <InfoRow label="Purchase Cost" value={con.purchase_cost ? `$${con.purchase_cost}` : null} />
        <InfoRow label="Supplier" value={con.supplier_name} />
        <InfoRow label="Order Number" value={con.order_number} />
      </Section>

      {con.notes && (
        <Section title="Notes">
          <div style={{ fontSize: 12, color: T.text, background: '#f8f9fa', borderRadius: 8, padding: 12, lineHeight: 1.6 }}>{con.notes}</div>
        </Section>
      )}
    </div>
  )
}

// ── Tab: Usage History ────────────────────────────────────────────────────────
function TabUsageHistory({ con }) {
  const [uses, setUses]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getConsumableUses(con.id)
      .then(d => setUses(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [con.id])

  if (loading) return <div style={{ padding: 20, color: T.muted, fontSize: 13 }}>Loading…</div>
  if (uses.length === 0) return <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>No usage recorded yet</div>

  return (
    <div>
      {uses.map(u => (
        <div key={u.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.blue + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👤</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{u.user_name || u.user_email || 'Unknown user'}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
              Qty used: <strong>{u.quantity}</strong>
              {u.used_by_name && ` · recorded by ${u.used_by_name}`}
              {' · '}{new Date(u.created_at).toLocaleString()}
            </div>
            {u.note && <div style={{ fontSize: 11, color: T.muted, marginTop: 2, fontStyle: 'italic' }}>{u.note}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Panel shell ───────────────────────────────────────────────────────────────
export default function DetailPanel({ con, isAdmin, onClose, onEdit, onUse, onRetire }) {
  const [tab, setTab] = useState('Overview')

  const TAB_CONTENT = { Overview: TabOverview, 'Usage History': TabUsageHistory }
  const TabContent = TAB_CONTENT[tab]

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
                <span style={{ fontSize: 20 }}>📦</span>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{con.name}</h2>
              </div>
              <div style={{ fontSize: 11, color: T.muted }}>{con.manufacturer_name}{con.model_number ? ` · ${con.model_number}` : ''}</div>
            </div>
            <button onClick={onClose} style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: T.muted, flexShrink: 0 }}>×</button>
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
              <ActionBtn label="Edit" onClick={onEdit} />
              <ActionBtn label="Use" onClick={onUse} color={T.blue} disabled={(con.quantity || 0) === 0} />
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
          <TabContent con={con} />
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
