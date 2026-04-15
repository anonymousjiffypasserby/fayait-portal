import { useState } from 'react'
import { T, ITEM_TYPE_ICONS } from './shared'

const Overlay = ({ children, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: T.card, borderRadius: 14, padding: 24, width: 460,
      boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: T.font,
    }}>
      {children}
    </div>
  </div>
)

/**
 * RequestModal
 * Props:
 *   item       — the item object (asset/accessory/consumable)
 *   itemType   — 'asset' | 'accessory' | 'consumable'
 *   onClose    — fn
 *   onSubmit   — async fn({ reason, quantity })
 */
export default function RequestModal({ item, itemType, onClose, onSubmit }) {
  const [reason,   setReason]   = useState('')
  const [quantity, setQuantity] = useState('1')
  const [saving,   setSaving]   = useState(false)

  const itemName = itemType === 'asset' ? item?.hostname : item?.name
  const showQty  = itemType !== 'asset'

  // For accessories, cap at available qty
  const maxQty = itemType === 'accessory'
    ? Math.max(1, (item?.quantity || 1) - (item?.qty_checked_out || 0))
    : 99

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await onSubmit({
        item_type: itemType,
        item_id:   item.id,
        quantity:  parseInt(quantity) || 1,
        reason:    reason.trim() || null,
      })
      onClose()
    } catch (e) {
      alert(e.message)
      setSaving(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>Request Item</h3>
        <button onClick={onClose} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: T.muted }}>×</button>
      </div>

      {/* Item preview */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', background: '#f8f9fa', borderRadius: 10,
        border: `1px solid ${T.border}`, marginBottom: 18,
      }}>
        <span style={{ fontSize: 24 }}>{ITEM_TYPE_ICONS[itemType]}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{itemName}</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2, textTransform: 'capitalize' }}>
            {itemType}
            {itemType === 'accessory' && item?.quantity !== undefined && (
              <span style={{ marginLeft: 8 }}>
                {Math.max(0, (item.quantity || 0) - (item.qty_checked_out || 0))} available
              </span>
            )}
            {itemType === 'consumable' && item?.quantity !== undefined && (
              <span style={{ marginLeft: 8 }}>{item.quantity} in stock</span>
            )}
          </div>
        </div>
      </div>

      {/* Quantity (accessories + consumables) */}
      {showQty && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Quantity
          </label>
          <input
            type="number"
            min="1"
            max={maxQty}
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            style={{ width: 100, padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      )}

      {/* Reason */}
      <div style={{ marginBottom: 22 }}>
        <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Reason <span style={{ color: T.muted, fontWeight: 400, textTransform: 'none' }}>(optional)</span>
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="Why do you need this item?"
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.font, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 9, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', fontSize: 14, fontFamily: T.font }}>
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{ flex: 2, padding: 10, borderRadius: 9, border: 'none', background: T.navy, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, fontFamily: T.font, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Submitting…' : 'Submit Request'}
        </button>
      </div>
    </Overlay>
  )
}
