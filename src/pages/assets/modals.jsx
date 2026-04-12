import { useState } from 'react'
import { T } from './shared'

const Overlay = ({ children, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: T.card, borderRadius: 14, padding: 24, width: 440,
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

const Field = ({ label, name, type = 'text', value, onChange, options, required, placeholder }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}{required && ' *'}</label>
    {options ? (
      <select value={value} onChange={e => onChange(name, e.target.value)}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, background: T.card, boxSizing: 'border-box' }}>
        <option value="">Select...</option>
        {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(name, e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, boxSizing: 'border-box' }} />
    )}
  </div>
)

const SaveBtn = ({ label, onClick, disabled, color }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ width: '100%', padding: '10px', borderRadius: 9, border: 'none', background: color || T.navy, color: '#fff', fontWeight: 700, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, fontFamily: T.font }}>
    {label}
  </button>
)

// ── Connect modal ─────────────────────────────────────────────────────────────
export function ConnectModal({ asset, onClose }) {
  if (!asset?.rustdesk_id) return null
  const uri = `rustdesk://remote_desktop/${asset.rustdesk_id}?password=${encodeURIComponent(asset.rustdesk_password || '')}`
  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`Connect to ${asset.hostname}`} onClose={onClose} />
      <div style={{ marginBottom: 16, fontSize: 13, color: T.muted }}>
        Launch RustDesk and connect to this device.
      </div>
      <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', marginBottom: 16, color: T.text }}>
        ID: {asset.rustdesk_id}<br />
        {asset.rustdesk_password && <>Password: {asset.rustdesk_password}</>}
      </div>
      <SaveBtn label="Open RustDesk" onClick={() => { window.location.href = uri; onClose() }} color={T.navy} />
    </Overlay>
  )
}

// ── Rename modal ──────────────────────────────────────────────────────────────
export function RenameModal({ asset, onClose, onRename }) {
  const [softName, setSoftName] = useState(asset?.hostname || '')
  const [sendToAgent, setSendToAgent] = useState(false)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await onRename(asset.id, softName, sendToAgent)
      onClose()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`Rename ${asset?.hostname}`} onClose={onClose} />
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>New Hostname</label>
        <input value={softName} onChange={e => setSoftName(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, boxSizing: 'border-box' }} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.text, marginBottom: 20, cursor: 'pointer' }}>
        <input type="checkbox" checked={sendToAgent} onChange={e => setSendToAgent(e.target.checked)} />
        Also rename the Windows PC (requires agent restart)
      </label>
      <SaveBtn label={saving ? 'Saving...' : 'Rename'} onClick={submit} disabled={saving || !softName} />
    </Overlay>
  )
}

// ── New asset modal ───────────────────────────────────────────────────────────
export function NewAssetModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    hostname: '', asset_type: 'Desktop', manufacturer: '', model: '', serial: '',
    mac_address: '', ip_address: '', os: '', assigned_user: '', department: '', location: '',
    purchase_date: '', purchase_cost: '', warranty_expires: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.hostname) return
    setSaving(true)
    try {
      await onCreate(form)
      onClose()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Add Asset" onClose={onClose} />
      <Field label="Hostname" name="hostname" value={form.hostname} onChange={set} required />
      <Field label="Type" name="asset_type" value={form.asset_type} onChange={set} options={['Desktop', 'Laptop', 'Server', 'Other']} />
      <Field label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={set} />
      <Field label="Model" name="model" value={form.model} onChange={set} />
      <Field label="Serial" name="serial" value={form.serial} onChange={set} />
      <Field label="MAC Address" name="mac_address" value={form.mac_address} onChange={set} placeholder="AA:BB:CC:DD:EE:FF" />
      <Field label="IP Address" name="ip_address" value={form.ip_address} onChange={set} />
      <Field label="OS" name="os" value={form.os} onChange={set} />
      <Field label="Assigned To" name="assigned_user" value={form.assigned_user} onChange={set} />
      <Field label="Department" name="department" value={form.department} onChange={set} />
      <Field label="Location" name="location" value={form.location} onChange={set} />
      <Field label="Purchase Date" name="purchase_date" type="date" value={form.purchase_date} onChange={set} />
      <Field label="Purchase Cost ($)" name="purchase_cost" type="number" value={form.purchase_cost} onChange={set} />
      <Field label="Warranty Expires" name="warranty_expires" type="date" value={form.warranty_expires} onChange={set} />
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
      </div>
      <SaveBtn label={saving ? 'Creating...' : 'Create Asset'} onClick={submit} disabled={saving || !form.hostname} />
    </Overlay>
  )
}

// ── Edit asset modal ──────────────────────────────────────────────────────────
export function EditAssetModal({ asset, onClose, onSave }) {
  const [form, setForm] = useState({
    hostname: asset?.hostname || '',
    asset_type: asset?.asset_type || 'Desktop',
    manufacturer: asset?.manufacturer || '',
    model: asset?.model || '',
    serial: asset?.serial || '',
    ip_address: asset?.ip_address || '',
    os: asset?.os || '',
    assigned_user: asset?.assigned_user || '',
    department: asset?.department || '',
    location: asset?.location || '',
    purchase_date: asset?.purchase_date?.slice(0, 10) || '',
    purchase_cost: asset?.purchase_cost || '',
    warranty_expires: asset?.warranty_expires?.slice(0, 10) || '',
    notes: asset?.notes || '',
    rustdesk_id: asset?.rustdesk_id || '',
    rustdesk_password: asset?.rustdesk_password || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setSaving(true)
    try {
      await onSave(asset.id, form)
      onClose()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`Edit ${asset?.hostname}`} onClose={onClose} />
      <Field label="Hostname" name="hostname" value={form.hostname} onChange={set} required />
      <Field label="Type" name="asset_type" value={form.asset_type} onChange={set} options={['Desktop', 'Laptop', 'Server', 'Other']} />
      <Field label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={set} />
      <Field label="Model" name="model" value={form.model} onChange={set} />
      <Field label="Serial" name="serial" value={form.serial} onChange={set} />
      <Field label="IP Address" name="ip_address" value={form.ip_address} onChange={set} />
      <Field label="OS" name="os" value={form.os} onChange={set} />
      <Field label="Assigned To" name="assigned_user" value={form.assigned_user} onChange={set} />
      <Field label="Department" name="department" value={form.department} onChange={set} />
      <Field label="Location" name="location" value={form.location} onChange={set} />
      <Field label="Purchase Date" name="purchase_date" type="date" value={form.purchase_date} onChange={set} />
      <Field label="Purchase Cost ($)" name="purchase_cost" type="number" value={form.purchase_cost} onChange={set} />
      <Field label="Warranty Expires" name="warranty_expires" type="date" value={form.warranty_expires} onChange={set} />
      <Field label="RustDesk ID" name="rustdesk_id" value={form.rustdesk_id} onChange={set} />
      <Field label="RustDesk Password" name="rustdesk_password" value={form.rustdesk_password} onChange={set} />
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
      </div>
      <SaveBtn label={saving ? 'Saving...' : 'Save Changes'} onClick={submit} disabled={saving || !form.hostname} />
    </Overlay>
  )
}

// ── Checkout modal ────────────────────────────────────────────────────────────
export function CheckOutModal({ asset, onClose, onCheckout }) {
  const [form, setForm] = useState({ assigned_to: asset?.assigned_user || '', checkout_date: new Date().toISOString().slice(0, 10), note: '' })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.assigned_to) return
    setSaving(true)
    try {
      await onCheckout(asset.id, form)
      onClose()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`Check Out ${asset?.hostname}`} onClose={onClose} />
      <Field label="Assign To" name="assigned_to" value={form.assigned_to} onChange={set} required />
      <Field label="Checkout Date" name="checkout_date" type="date" value={form.checkout_date} onChange={set} />
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Note</label>
        <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
      </div>
      <SaveBtn label={saving ? 'Checking Out...' : 'Check Out'} onClick={submit} disabled={saving || !form.assigned_to} color={T.blue} />
    </Overlay>
  )
}

// ── Audit modal ───────────────────────────────────────────────────────────────
export function AuditModal({ asset, onClose, onAudit }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await onAudit(asset.id, { note })
      onClose()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`Audit ${asset?.hostname}`} onClose={onClose} />
      <p style={{ fontSize: 13, color: T.muted, marginBottom: 14 }}>Record that you have physically verified this asset.</p>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Note (optional)</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
      </div>
      <SaveBtn label={saving ? 'Saving...' : 'Confirm Audit'} onClick={submit} disabled={saving} color={T.green} />
    </Overlay>
  )
}

// ── Confirm delete modal ──────────────────────────────────────────────────────
export function ConfirmRetireModal({ asset, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    setSaving(true)
    try { await onConfirm(asset.id); onClose() }
    catch (e) { alert(e.message); setSaving(false) }
  }
  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Delete Asset" onClose={onClose} />
      <p style={{ fontSize: 13, color: T.text, marginBottom: 20 }}>
        Are you sure you want to retire <strong>{asset?.hostname}</strong>? This will mark it as retired.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 9, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', fontFamily: T.font }}>Cancel</button>
        <SaveBtn label={saving ? 'Deleting...' : 'Retire Asset'} onClick={submit} disabled={saving} color={T.red} />
      </div>
    </Overlay>
  )
}

// ── Bulk assign modal ─────────────────────────────────────────────────────────
export function BulkAssignModal({ count, onClose, onConfirm }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!value) return
    setSaving(true)
    try { await onConfirm(value); onClose() }
    catch (e) { alert(e.message); setSaving(false) }
  }
  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`Assign ${count} assets`} onClose={onClose} />
      <Field label="Assign To" name="user" value={value} onChange={(_, v) => setValue(v)} required />
      <SaveBtn label={saving ? 'Saving...' : 'Assign'} onClick={submit} disabled={saving || !value} color={T.blue} />
    </Overlay>
  )
}

// ── Bulk location modal ───────────────────────────────────────────────────────
export function BulkLocationModal({ count, onClose, onConfirm }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!value) return
    setSaving(true)
    try { await onConfirm(value); onClose() }
    catch (e) { alert(e.message); setSaving(false) }
  }
  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`Update location for ${count} assets`} onClose={onClose} />
      <Field label="Location" name="location" value={value} onChange={(_, v) => setValue(v)} required />
      <SaveBtn label={saving ? 'Saving...' : 'Update'} onClick={submit} disabled={saving || !value} color={T.blue} />
    </Overlay>
  )
}
