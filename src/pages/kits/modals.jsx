import { useState, useEffect } from 'react'
import { T, ITEM_TYPE_ICONS, ITEM_TYPE_LABELS, fmtDate } from './shared'
import api from '../../services/api'

const Overlay = ({ children, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: T.card, borderRadius: 14, padding: 24, width: 560,
      boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: T.font,
      maxHeight: '90vh', overflowY: 'auto',
    }}>
      {children}
    </div>
  </div>
)

const ModalHeader = ({ title, onClose }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>{title}</h3>
    <button onClick={onClose} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: T.muted }}>×</button>
  </div>
)

const Label = ({ text, required }) => (
  <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
    {text}{required && ' *'}
  </label>
)

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`,
  fontSize: 13, boxSizing: 'border-box', fontFamily: T.font, outline: 'none',
}

const SaveBtn = ({ label, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ width: '100%', padding: 10, borderRadius: 9, border: 'none', background: T.navy, color: '#fff', fontWeight: 700, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, fontFamily: T.font }}>
    {label}
  </button>
)

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.muted, margin: '18px 0 10px', paddingBottom: 4, borderBottom: `1px solid ${T.border}` }}>
    {children}
  </div>
)

// ── Item catalog loader ───────────────────────────────────────────────────────
function useItemCatalog() {
  const [assets,      setAssets]      = useState([])
  const [accessories, setAccessories] = useState([])
  const [consumables, setConsumables] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getAssets().catch(() => []),
      api.getAccessories().catch(() => ({ rows: [] })),
      api.getConsumables().catch(() => ({ rows: [] })),
    ]).then(([a, acc, con]) => {
      setAssets(Array.isArray(a) ? a : (a?.rows || []))
      setAccessories(Array.isArray(acc) ? acc : (acc?.rows || []))
      setConsumables(Array.isArray(con) ? con : (con?.rows || []))
    }).finally(() => setLoading(false))
  }, [])

  return { assets, accessories, consumables, loading }
}

// ── Kit Form Modal (create + edit) ────────────────────────────────────────────
// kitId: pass when editing; form will load the full kit to get existing items
export function KitFormModal({ kitId, onClose, onSave }) {
  const isEdit = !!kitId
  const [name,    setName]    = useState('')
  const [notes,   setNotes]   = useState('')
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving,  setSaving]  = useState(false)

  // Load full kit for edit mode
  useEffect(() => {
    if (!kitId) return
    api.getKit(kitId)
      .then(kit => {
        setName(kit.name || '')
        setNotes(kit.notes || '')
        setItems((kit.items || []).map(i => ({
          item_type:  i.item_type,
          item_id:    String(i.item_id),
          item_name:  i.item_name || i.item_id,
          quantity:   i.quantity,
        })))
      })
      .catch(e => alert(e.message))
      .finally(() => setLoading(false))
  }, [kitId])

  // Item builder state
  const [addType,     setAddType]     = useState('asset')
  const [addSearch,   setAddSearch]   = useState('')
  const [addQty,      setAddQty]      = useState('1')
  const [addItemId,   setAddItemId]   = useState('')
  const [addItemName, setAddItemName] = useState('')

  const { assets, accessories, consumables, loading: catalogLoading } = useItemCatalog()

  const catalog = addType === 'asset' ? assets
    : addType === 'accessory' ? accessories
    : consumables

  const filteredCatalog = addSearch.trim() && !addItemId
    ? catalog.filter(i => {
        const label = addType === 'asset' ? i.hostname : i.name
        return label?.toLowerCase().includes(addSearch.toLowerCase())
      })
    : []

  const handleSelectItem = (item) => {
    const name = addType === 'asset' ? item.hostname : item.name
    setAddItemId(String(item.id))
    setAddItemName(name)
    setAddSearch(name)
  }

  const handleAdd = () => {
    if (!addItemId) return
    const qty = parseInt(addQty) || 1
    const exists = items.find(i => i.item_type === addType && i.item_id === addItemId)
    if (exists) {
      setItems(prev => prev.map(i =>
        i.item_type === addType && i.item_id === addItemId
          ? { ...i, quantity: i.quantity + qty }
          : i
      ))
    } else {
      setItems(prev => [...prev, { item_type: addType, item_id: addItemId, item_name: addItemName, quantity: qty }])
    }
    setAddSearch(''); setAddItemId(''); setAddItemName(''); setAddQty('1')
  }

  const handleRemove = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        notes: notes || null,
        items: items.map(i => ({ item_type: i.item_type, item_id: i.item_id, quantity: i.quantity })),
      })
      onClose()
    } catch (e) {
      alert(e.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Overlay onClose={onClose}>
        <ModalHeader title="Edit Kit" onClose={onClose} />
        <div style={{ color: T.muted, fontSize: 13, padding: '20px 0' }}>Loading kit…</div>
      </Overlay>
    )
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={isEdit ? 'Edit Kit' : 'New Kit'} onClose={onClose} />

      <div style={{ marginBottom: 14 }}>
        <Label text="Kit Name" required />
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="e.g. New Employee Kit" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <Label text="Notes" />
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          style={{ ...inputStyle, resize: 'vertical' }} placeholder="Optional description…" />
      </div>

      <SectionTitle>Kit Items</SectionTitle>

      {/* Item builder */}
      <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 14, border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 100px' }}>
            <Label text="Type" />
            <select value={addType} onChange={e => { setAddType(e.target.value); setAddSearch(''); setAddItemId(''); setAddItemName('') }}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="asset">Asset</option>
              <option value="accessory">Accessory</option>
              <option value="consumable">Consumable</option>
            </select>
          </div>
          <div style={{ flex: '3 1 200px', position: 'relative' }}>
            <Label text="Search item" />
            <input
              value={addSearch}
              onChange={e => { setAddSearch(e.target.value); setAddItemId(''); setAddItemName('') }}
              style={inputStyle}
              placeholder={`Search ${addType}s…`}
              disabled={catalogLoading}
            />
            {filteredCatalog.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 180, overflowY: 'auto',
              }}>
                {filteredCatalog.slice(0, 20).map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: `1px solid ${T.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = T.card}
                  >
                    <span style={{ marginRight: 6 }}>{ITEM_TYPE_ICONS[addType]}</span>
                    <strong>{addType === 'asset' ? item.hostname : item.name}</strong>
                    {addType === 'asset' && item.model && <span style={{ color: T.muted, marginLeft: 6, fontSize: 11 }}>{item.model}</span>}
                    {addType !== 'asset' && item.quantity !== undefined && (
                      <span style={{ color: T.muted, marginLeft: 6, fontSize: 11 }}>({item.quantity} in stock)</span>
                    )}
                  </div>
                ))}
                {filteredCatalog.length > 20 && (
                  <div style={{ padding: '6px 12px', fontSize: 11, color: T.muted, textAlign: 'center' }}>
                    {filteredCatalog.length - 20} more — refine search
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ flex: '0 0 70px' }}>
            <Label text="Qty" />
            <input type="number" min="1" value={addQty} onChange={e => setAddQty(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!addItemId}
          style={{ fontSize: 12, padding: '7px 16px', borderRadius: 7, border: 'none', background: T.navy, color: '#fff', cursor: addItemId ? 'pointer' : 'not-allowed', opacity: addItemId ? 1 : 0.5, fontWeight: 600, fontFamily: T.font }}
        >
          + Add to Kit
        </button>
      </div>

      {/* Items list */}
      {items.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
          {items.map((item, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, border: `1px solid ${T.border}`,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{ITEM_TYPE_ICONS[item.item_type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{item.item_name}</div>
                <div style={{ fontSize: 10, color: T.muted }}>{ITEM_TYPE_LABELS[item.item_type]}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.text, flexShrink: 0 }}>×{item.quantity}</span>
              <button
                onClick={() => handleRemove(idx)}
                style={{ fontSize: 12, padding: '2px 8px', borderRadius: 5, border: `1px solid ${T.red}30`, background: '#fdecea', color: T.red, cursor: 'pointer', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: T.muted, textAlign: 'center', padding: '12px 0', marginBottom: 18 }}>
          No items added yet. Use the builder above to add assets, accessories, and consumables.
        </div>
      )}

      <SaveBtn
        label={saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Kit'}
        onClick={handleSave}
        disabled={saving || !name.trim()}
      />
    </Overlay>
  )
}

// ── Checkout Modal ────────────────────────────────────────────────────────────
export function CheckoutKitModal({ kitId, kitName, onClose, onCheckout }) {
  const [userId,      setUserId]      = useState('')
  const [dueDate,     setDueDate]     = useState('')
  const [note,        setNote]        = useState('')
  const [saving,      setSaving]      = useState(false)
  const [users,       setUsers]       = useState([])
  const [items,       setItems]       = useState([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getUsers().catch(() => []),
      kitId ? api.getKit(kitId).catch(() => null) : Promise.resolve(null),
    ]).then(([u, kit]) => {
      setUsers(Array.isArray(u) ? u : (u?.users || u?.rows || []))
      setItems(kit?.items || [])
    }).finally(() => setLoadingData(false))
  }, [kitId])

  const handleSubmit = async () => {
    if (!userId) return
    setSaving(true)
    try {
      await onCheckout({ user_id: userId, expected_checkin_date: dueDate || null, note: note || null })
      onClose()
    } catch (e) {
      alert(e.message)
      setSaving(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`Check Out: ${kitName}`} onClose={onClose} />

      {/* Items preview */}
      {!loadingData && items.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700, marginBottom: 8 }}>
            Items in this kit ({items.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto', background: '#f8f9fa', borderRadius: 8, padding: 10 }}>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{ITEM_TYPE_ICONS[item.item_type]}</span>
                <span style={{ fontSize: 12, flex: 1, color: T.text }}>{item.item_name || item.item_id}</span>
                <span style={{ fontSize: 11, color: T.muted }}>×{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <Label text="Check Out To" required />
        <select value={userId} onChange={e => setUserId(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }} disabled={loadingData}>
          <option value="">{loadingData ? 'Loading…' : 'Select user…'}</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <Label text="Expected Return Date" />
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <Label text="Note" />
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
          style={{ ...inputStyle, resize: 'vertical' }} placeholder="Optional note…" />
      </div>

      <SaveBtn
        label={saving ? 'Checking out…' : 'Confirm Checkout'}
        onClick={handleSubmit}
        disabled={saving || !userId || loadingData}
      />
    </Overlay>
  )
}

// ── Confirm Checkin Modal ─────────────────────────────────────────────────────
export function ConfirmCheckinModal({ kit, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      alert(e.message)
      setLoading(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Check In Kit" onClose={onClose} />
      <p style={{ fontSize: 13, color: T.text, marginBottom: 8 }}>
        Check in <strong>{kit?.name}</strong>?
      </p>
      <p style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>
        All assets will be marked "Ready to Deploy", accessory checkouts will be closed, and the kit will become available again.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 9, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', fontSize: 14, fontFamily: T.font }}>
          Cancel
        </button>
        <button onClick={handleConfirm} disabled={loading} style={{ flex: 1, padding: 10, borderRadius: 9, border: 'none', background: T.green, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: T.font, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Checking in…' : 'Confirm Check In'}
        </button>
      </div>
    </Overlay>
  )
}

// ── Confirm Delete Modal ──────────────────────────────────────────────────────
export function ConfirmDeleteModal({ kit, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      alert(e.message)
      setLoading(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Delete Kit" onClose={onClose} />
      <p style={{ fontSize: 13, color: T.text, marginBottom: 8 }}>
        Delete <strong>{kit?.name}</strong>?
      </p>
      <p style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>
        The kit and all its items will be permanently removed. Checkout history is preserved.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 9, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', fontSize: 14, fontFamily: T.font }}>
          Cancel
        </button>
        <button onClick={handleConfirm} disabled={loading} style={{ flex: 1, padding: 10, borderRadius: 9, border: 'none', background: T.red, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: T.font, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Deleting…' : 'Delete Kit'}
        </button>
      </div>
    </Overlay>
  )
}
