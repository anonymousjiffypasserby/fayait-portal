import { useState, useEffect } from 'react'
import { T, COMP_STATUSES } from './shared'
import api from '../../services/api'

const Overlay = ({ children, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: '#fff', borderRadius: 14, padding: 24, width: 520,
      boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: T.font,
      maxHeight: '90vh', overflowY: 'auto',
    }}>
      {children}
    </div>
  </div>
)

const Header = ({ title, onClose }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>{title}</h3>
    <button onClick={onClose} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: T.muted }}>×</button>
  </div>
)

const Label = ({ text, required }) => (
  <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
    {text}{required && <span style={{ color: T.red }}> *</span>}
  </label>
)

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`,
  fontSize: 13, boxSizing: 'border-box', fontFamily: T.font, outline: 'none',
}
const selectStyle = { ...inputStyle, background: '#fff', cursor: 'pointer' }

const SaveBtn = ({ label, onClick, disabled, color }) => (
  <button onClick={onClick} disabled={disabled} style={{
    width: '100%', padding: 10, borderRadius: 9, border: 'none',
    background: color || T.navy, color: '#fff', fontWeight: 700, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
    fontFamily: T.font,
  }}>{label}</button>
)

const Section = ({ title }) => (
  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.muted, margin: '18px 0 10px', paddingBottom: 4, borderBottom: `1px solid ${T.border}` }}>
    {title}
  </div>
)

function useFetch(fn) {
  const [data, setData] = useState([])
  useEffect(() => { fn().then(d => setData(Array.isArray(d) ? d : [])).catch(() => {}) }, []) // eslint-disable-line
  return data
}

// ── Create / Edit modal ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', category_id: '', manufacturer_id: '', serial: '',
  location_id: '', status: 'Available', quantity: '1', min_quantity: '0',
  purchase_date: '', purchase_cost: '', supplier_id: '', order_number: '', notes: '',
  notify_low_stock: false,
}

export function ComponentFormModal({ component, onClose, onSave }) {
  const isEdit = !!component
  const [form, setForm] = useState(() => isEdit ? {
    name:            component.name || '',
    category_id:     component.category_id || '',
    manufacturer_id: component.manufacturer_id || '',
    serial:          component.serial || '',
    location_id:     component.location_id || '',
    status:          component.status || 'Available',
    quantity:        String(component.quantity ?? 1),
    min_quantity:    String(component.min_quantity ?? 0),
    purchase_date:   component.purchase_date?.slice(0, 10) || '',
    purchase_cost:   component.purchase_cost || '',
    supplier_id:     component.supplier_id || '',
    order_number:    component.order_number || '',
    notes:           component.notes || '',
    notify_low_stock: component.notify_low_stock || false,
  } : { ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  const categories    = useFetch(() => api.getCategories('component'))
  const manufacturers = useFetch(api.getManufacturers)
  const locations     = useFetch(api.getLocations)
  const suppliers     = useFetch(api.getSuppliers)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inp = (k) => ({ value: form[k], onChange: e => set(k, e.target.value) })
  const sel = (k) => ({ value: form[k], onChange: e => set(k, e.target.value), style: selectStyle })

  const submit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try { await onSave(form); onClose() }
    catch (e) { alert(e.message); setSaving(false) }
  }

  return (
    <Overlay onClose={onClose}>
      <Header title={isEdit ? `Edit ${component.name}` : 'Add Component'} onClose={onClose} />

      <Section title="Identity" />
      <div style={{ marginBottom: 14 }}>
        <Label text="Name" required />
        <input style={inputStyle} autoFocus {...inp('name')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div style={{ marginBottom: 14 }}>
          <Label text="Category" />
          <select {...sel('category_id')}>
            <option value="">— None —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label text="Status" />
          <select {...sel('status')}>
            {COMP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div style={{ marginBottom: 14 }}>
          <Label text="Manufacturer" />
          <select {...sel('manufacturer_id')}>
            <option value="">— None —</option>
            {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label text="Serial" />
          <input style={{ ...inputStyle, fontFamily: 'monospace' }} {...inp('serial')} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <Label text="Location" />
        <select {...sel('location_id')}>
          <option value="">— None —</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      <Section title="Stock" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div style={{ marginBottom: 14 }}>
          <Label text="Quantity" required />
          <input style={inputStyle} type="number" min="1" {...inp('quantity')} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label text="Min Quantity (alert)" />
          <input style={inputStyle} type="number" min="0" {...inp('min_quantity')} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.notify_low_stock} onChange={e => set('notify_low_stock', e.target.checked)} />
          Notify when stock falls below minimum
        </label>
      </div>

      <Section title="Purchase Info" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div style={{ marginBottom: 14 }}>
          <Label text="Purchase Date" />
          <input style={inputStyle} type="date" {...inp('purchase_date')} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label text="Purchase Cost ($)" />
          <input style={inputStyle} type="number" step="0.01" min="0" {...inp('purchase_cost')} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div style={{ marginBottom: 14 }}>
          <Label text="Supplier" />
          <select {...sel('supplier_id')}>
            <option value="">— None —</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label text="Order Number" />
          <input style={inputStyle} {...inp('order_number')} />
        </div>
      </div>

      <Section title="Notes" />
      <div style={{ marginBottom: 20 }}>
        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} {...inp('notes')} />
      </div>

      <SaveBtn label={saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Component'} onClick={submit} disabled={saving || !form.name.trim()} />
    </Overlay>
  )
}

// ── Install modal ─────────────────────────────────────────────────────────────
export function InstallModal({ component, onClose, onInstall }) {
  const [form, setForm] = useState({ asset_id: '', quantity: '1', note: '' })
  const [assets, setAssets] = useState([])
  const [saving, setSaving] = useState(false)

  const available = Math.max(0, (component.quantity || 0) - parseInt(component.qty_installed || 0))

  useEffect(() => {
    api.getAssets().then(d => {
      const rows = Array.isArray(d) ? d : (d?.rows || [])
      setAssets(rows.filter(a => !a.retired))
    }).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.asset_id || parseInt(form.quantity) < 1) return
    setSaving(true)
    try { await onInstall(component.id, form); onClose() }
    catch (e) { alert(e.message); setSaving(false) }
  }

  return (
    <Overlay onClose={onClose}>
      <Header title={`Install — ${component.name}`} onClose={onClose} />
      <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: T.muted }}>
        {available} of {component.quantity} available to install
      </div>
      <div style={{ marginBottom: 14 }}>
        <Label text="Install Into Asset" required />
        <select value={form.asset_id} onChange={e => set('asset_id', e.target.value)} style={selectStyle}>
          <option value="">Select asset…</option>
          {assets.map(a => (
            <option key={a.id} value={a.id}>
              {a.hostname}{a.asset_tag ? ` (${a.asset_tag})` : ''}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <Label text="Quantity" required />
        <input style={inputStyle} type="number" min="1" max={available}
          value={form.quantity} onChange={e => set('quantity', e.target.value)} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <Label text="Note" />
        <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2}
          value={form.note} onChange={e => set('note', e.target.value)} />
      </div>
      <SaveBtn
        label={saving ? 'Installing…' : 'Install'}
        onClick={submit}
        disabled={saving || !form.asset_id || parseInt(form.quantity) < 1}
        color={T.blue}
      />
    </Overlay>
  )
}

// ── Confirm retire modal ───────────────────────────────────────────────────────
export function ConfirmRetireModal({ component, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    setSaving(true)
    try { await onConfirm(component.id); onClose() }
    catch (e) { alert(e.message); setSaving(false) }
  }
  return (
    <Overlay onClose={onClose}>
      <Header title="Retire Component" onClose={onClose} />
      <p style={{ fontSize: 13, color: T.text, marginBottom: 20 }}>
        Retire <strong>{component?.name}</strong>? It will be moved to the Retired view and can be restored.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 9, border: `1px solid ${T.border}`, background: '#fff', cursor: 'pointer', fontFamily: T.font }}>Cancel</button>
        <SaveBtn label={saving ? 'Retiring…' : 'Retire'} onClick={submit} disabled={saving} color={T.red} />
      </div>
    </Overlay>
  )
}
