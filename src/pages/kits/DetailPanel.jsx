import { useState, useEffect } from 'react'
import { T, ITEM_TYPE_ICONS, ITEM_TYPE_LABELS, fmtDate, isCheckedOut } from './shared'
import api from '../../services/api'

const TABS = ['Items', 'Checkouts']

export default function DetailPanel({ kit, onClose, onEdit, onCheckout, onCheckin, onDelete, isAdmin }) {
  const [tab, setTab]     = useState('Items')
  const [full, setFull]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!kit) return
    setLoading(true)
    api.getKit(kit.id)
      .then(d => setFull(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [kit?.id])

  if (!kit) return null

  const data = full || kit
  const items = full?.items || []
  const checkouts = full?.checkouts || []
  const checkedOut = isCheckedOut(data)

  const activeCheckout = checkouts.find(c => !c.checkin_date)

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 520,
      background: T.card, boxShadow: '-4px 0 30px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column', zIndex: 495, fontFamily: T.font,
    }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{ fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 0, flexShrink: 0 }}>×</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.name}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
            {data.item_count || items.length} items
            {data.checkout_count > 0 && ` · checked out ${data.checkout_count} time${data.checkout_count !== '1' ? 's' : ''}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {checkedOut && activeCheckout && (
            <button
              onClick={() => onCheckin(data, activeCheckout)}
              style={{ fontSize: 11, padding: '6px 12px', borderRadius: 7, border: 'none', background: T.navy, color: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: T.font }}
            >
              Check In
            </button>
          )}
          {!checkedOut && (
            <button
              onClick={() => onCheckout(data)}
              style={{ fontSize: 11, padding: '6px 12px', borderRadius: 7, border: 'none', background: T.green, color: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: T.font }}
            >
              Checkout
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => onEdit(data)}
              style={{ fontSize: 11, padding: '6px 12px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, color: T.text, cursor: 'pointer', fontFamily: T.font }}
            >
              Edit
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => onDelete(data)}
              style={{ fontSize: 11, padding: '6px 10px', borderRadius: 7, border: `1px solid ${T.red}30`, background: '#fdecea', color: T.red, cursor: 'pointer', fontFamily: T.font }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Status banner if checked out */}
      {checkedOut && activeCheckout && (
        <div style={{ background: T.orange + '15', borderBottom: `1px solid ${T.orange}30`, padding: '8px 18px', fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: T.orange }}>Currently checked out</span>
          {activeCheckout.user_name && <span style={{ color: T.text }}> to {activeCheckout.user_name}</span>}
          {activeCheckout.checkout_date && <span style={{ color: T.muted }}> since {fmtDate(activeCheckout.checkout_date)}</span>}
          {activeCheckout.expected_checkin_date && <span style={{ color: T.muted }}> · due {fmtDate(activeCheckout.expected_checkin_date)}</span>}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, padding: '0 18px' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 14px', fontSize: 12, fontWeight: tab === t ? 700 : 400,
            color: tab === t ? T.navy : T.muted, background: 'none', border: 'none',
            borderBottom: tab === t ? `2px solid ${T.navy}` : '2px solid transparent',
            cursor: 'pointer', fontFamily: T.font, marginBottom: -1,
          }}>
            {t}
            {t === 'Items' && items.length > 0 && (
              <span style={{ marginLeft: 5, fontSize: 10, background: '#e8eaed', padding: '1px 5px', borderRadius: 8, color: T.muted }}>
                {items.length}
              </span>
            )}
            {t === 'Checkouts' && checkouts.length > 0 && (
              <span style={{ marginLeft: 5, fontSize: 10, background: '#e8eaed', padding: '1px 5px', borderRadius: 8, color: T.muted }}>
                {checkouts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        {loading ? (
          <div style={{ color: T.muted, fontSize: 12 }}>Loading...</div>
        ) : tab === 'Items' ? (
          <TabItems items={items} kit={data} />
        ) : (
          <TabCheckouts checkouts={checkouts} />
        )}
      </div>
    </div>
  )
}

function TabItems({ items, kit }) {
  if (items.length === 0) {
    return (
      <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
        No items in this kit yet.
      </div>
    )
  }

  const byType = { asset: [], accessory: [], consumable: [] }
  items.forEach(item => { if (byType[item.item_type]) byType[item.item_type].push(item) })

  return (
    <div>
      {kit.notes && (
        <div style={{ fontSize: 12, color: T.text, background: '#f8f9fa', borderRadius: 8, padding: 12, lineHeight: 1.6, marginBottom: 18 }}>
          {kit.notes}
        </div>
      )}
      {['asset', 'accessory', 'consumable'].map(type => {
        const typeItems = byType[type]
        if (!typeItems.length) return null
        return (
          <div key={type} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>
              {ITEM_TYPE_LABELS[type]}s ({typeItems.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {typeItems.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', background: '#f8f9fa', borderRadius: 8, border: `1px solid ${T.border}`,
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{ITEM_TYPE_ICONS[item.item_type]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.item_name || `(ID: ${item.item_id})`}
                    </div>
                    {item.item_subtitle && (
                      <div style={{ fontSize: 10, color: T.muted }}>{item.item_subtitle}</div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: '#e8eaed', color: T.muted, flexShrink: 0,
                  }}>
                    ×{item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TabCheckouts({ checkouts }) {
  if (checkouts.length === 0) {
    return (
      <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
        No checkout history yet.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {checkouts.map(co => {
        const open = !co.checkin_date
        return (
          <div key={co.id} style={{
            padding: '10px 14px', background: '#f8f9fa', borderRadius: 8,
            borderLeft: `3px solid ${open ? T.orange : T.green}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{co.user_name || 'Unknown user'}</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                background: open ? T.orange + '18' : T.green + '18',
                color: open ? T.orange : T.green,
              }}>
                {open ? 'Out' : 'Returned'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: T.muted }}>
              Out: {fmtDate(co.checkout_date)}
              {co.expected_checkin_date && ` · Due: ${fmtDate(co.expected_checkin_date)}`}
              {co.checkin_date && ` · In: ${fmtDate(co.checkin_date)}`}
            </div>
            {co.note && <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{co.note}</div>}
            {co.checked_out_by_name && (
              <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>by {co.checked_out_by_name}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
