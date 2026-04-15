import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { T, STATUS_OPTIONS, DEPRECIATION_METHODS } from './shared'
import api from '../../services/api'

const Overlay = ({ children, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: T.card, borderRadius: 14, padding: 24, width: 480,
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

const selectStyle = {
  ...inputStyle, background: T.card, cursor: 'pointer',
}

const Field = ({ label, name, type = 'text', value, onChange, options, required, placeholder, mono }) => (
  <div style={{ marginBottom: 14 }}>
    <Label text={label} required={required} />
    {options ? (
      <select value={value} onChange={e => onChange(name, e.target.value)} style={selectStyle}>
        <option value="">Select...</option>
        {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
      </select>
    ) : (
      <input
        type={type}
        value={value}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, fontFamily: mono ? 'monospace' : T.font }}
      />
    )}
  </div>
)

const SaveBtn = ({ label, onClick, disabled, color }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ width: '100%', padding: '10px', borderRadius: 9, border: 'none', background: color || T.navy, color: '#fff', fontWeight: 700, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, fontFamily: T.font }}>
    {label}
  </button>
)

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.muted, margin: '18px 0 10px', paddingBottom: 4, borderBottom: `1px solid ${T.border}` }}>
    {children}
  </div>
)

const ASSET_STATUSES = ['Ready to Deploy', 'Deployed', 'Pending', 'Un-deployable', 'Archived', 'Lost/Stolen']
const ASSET_TYPES = ['Laptop', 'Desktop', 'Server', 'Other']

function useFetch(fn, deps = []) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  useEffect(() => {
    setLoading(true)
    setError(null)
    fn().then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
       .catch(e => { setError(e.message); setLoading(false) })
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return { data, loading, error }
}

function DropdownField({ label, value, onChange, options, loading, error, required, placeholder = 'Select...' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Label text={label} required={required} />
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{ ...selectStyle, color: value ? T.text : T.muted }}
        disabled={loading}
      >
        <option value="">{loading ? 'Loading...' : error ? 'Error loading' : placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ── Asset form fields (shared between New + Edit) ─────────────────────────────
function AssetFormFields({ form, set, isEdit }) {
  const { data: manufacturers, loading: mfgLoading, error: mfgError } = useFetch(() => api.getManufacturers())
  const { data: users, loading: usersLoading, error: usersError } = useFetch(() => api.getUsers())
  const { data: departments, loading: deptLoading, error: deptError } = useFetch(() => api.getDepartments())
  const { data: locations, loading: locLoading, error: locError } = useFetch(() => api.getLocations())

  // Track selected manufacturer's UUID for model filtering
  const [manufacturerId, setManufacturerId] = useState(null)
  const [models, setModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const modelsInitialized = useRef(false)

  // On edit: resolve initial manufacturer name → ID so models load correctly
  useEffect(() => {
    if (modelsInitialized.current) return
    if (!manufacturers.length) return
    const initial = form.manufacturer
    if (initial) {
      const match = manufacturers.find(m => m.name === initial)
      if (match) {
        setManufacturerId(match.id)
        setModelsLoading(true)
        api.getModels(match.id).then(d => { setModels(Array.isArray(d) ? d : []); setModelsLoading(false) }).catch(() => setModelsLoading(false))
      }
    }
    modelsInitialized.current = true
  }, [manufacturers]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleManufacturerChange = (name) => {
    set('manufacturer', name)
    set('model', '')
    const match = manufacturers.find(m => m.name === name)
    const mid = match?.id || null
    setManufacturerId(mid)
    setModels([])
    if (mid) {
      setModelsLoading(true)
      api.getModels(mid).then(d => { setModels(Array.isArray(d) ? d : []); setModelsLoading(false) }).catch(() => setModelsLoading(false))
    }
  }

  const mfgOpts = manufacturers.map(m => ({ value: m.name, label: m.name }))
  const modelOpts = models.map(m => ({ value: m.name, label: m.name }))
  const userOpts = users.map(u => ({ value: u.name, label: u.name }))
  const deptOpts = departments.map(d => ({ value: d.name, label: d.name }))
  const locOpts = locations.map(l => ({ value: l.name, label: l.name }))

  return (
    <>
      <SectionTitle>Identity</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label="Hostname" name="hostname" value={form.hostname} onChange={set} required />
        <Field label="Asset Tag" name="asset_tag" value={form.asset_tag} onChange={set} placeholder="Auto-generated if blank" mono />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <DropdownField label="Status" value={form.status} onChange={v => set('status', v)} options={ASSET_STATUSES.map(s => ({ value: s, label: s }))} loading={false} />
        <DropdownField label="Category" value={form.asset_type} onChange={v => set('asset_type', v)} options={ASSET_TYPES.map(t => ({ value: t, label: t }))} loading={false} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label="Serial" name="serial" value={form.serial} onChange={set} mono />
        <Field label="MAC Address" name="mac_address" value={form.mac_address} onChange={set} placeholder="AA:BB:CC:DD:EE:FF" mono />
      </div>

      <SectionTitle>Hardware</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <DropdownField label="Manufacturer" value={form.manufacturer} onChange={handleManufacturerChange} options={mfgOpts} loading={mfgLoading} error={mfgError} />
        <DropdownField label="Model" value={form.model} onChange={v => set('model', v)} options={modelOpts} loading={modelsLoading} error={null} placeholder={manufacturerId ? 'Select model...' : 'Select manufacturer first'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label="IP Address" name="ip_address" value={form.ip_address} onChange={set} mono />
        <Field label="OS" name="os" value={form.os} onChange={set} />
      </div>

      <SectionTitle>Assignment</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <DropdownField label="Assigned To" value={form.assigned_user} onChange={v => set('assigned_user', v)} options={userOpts} loading={usersLoading} error={usersError} />
        <DropdownField label="Department" value={form.department} onChange={v => set('department', v)} options={deptOpts} loading={deptLoading} error={deptError} />
      </div>
      <DropdownField label="Location" value={form.location} onChange={v => set('location', v)} options={locOpts} loading={locLoading} error={locError} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label="Checkout Date" name="checkout_date" type="date" value={form.checkout_date} onChange={set} />
        <Field label="Expected Checkin" name="expected_checkin_date" type="date" value={form.expected_checkin_date} onChange={set} />
      </div>

      <SectionTitle>Purchase Info</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label="Purchase Date" name="purchase_date" type="date" value={form.purchase_date} onChange={set} />
        <Field label="Purchase Cost ($)" name="purchase_cost" type="number" value={form.purchase_cost} onChange={set} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label="Order Number" name="order_number" value={form.order_number} onChange={set} />
        <Field label="Supplier" name="supplier" value={form.supplier} onChange={set} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label="Warranty Months" name="warranty_months" type="number" value={form.warranty_months} onChange={set} />
        <Field label="Warranty Expires" name="warranty_expires" type="date" value={form.warranty_expires} onChange={set} />
      </div>
      <Field label="EOL Date" name="eol_date" type="date" value={form.eol_date} onChange={set} />

      <SectionTitle>Depreciation</SectionTitle>
      <Field label="Method" name="depreciation_method" value={form.depreciation_method} onChange={set}
        options={DEPRECIATION_METHODS} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label="Useful Life (years)" name="depreciation_years" type="number" value={form.depreciation_years} onChange={set} />
        <Field label="Salvage Value ($)" name="salvage_value" type="number" value={form.salvage_value} onChange={set} />
      </div>

      {isEdit && (
        <>
          <SectionTitle>Remote Access</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <Field label="RustDesk ID" name="rustdesk_id" value={form.rustdesk_id} onChange={set} mono />
            <Field label="RustDesk Password" name="rustdesk_password" value={form.rustdesk_password} onChange={set} mono />
          </div>
        </>
      )}

      <SectionTitle>Notes</SectionTitle>
      <div style={{ marginBottom: 14 }}>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          placeholder="Any additional notes..."
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!form.requestable} onChange={e => set('requestable', e.target.checked)} />
          Allow users to request this asset
        </label>
      </div>
    </>
  )
}

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

// ── QR Code modal ─────────────────────────────────────────────────────────────
export function QRModal({ asset, onClose }) {
  const [dataUrl, setDataUrl] = useState(null)

  useEffect(() => {
    const text = asset.asset_tag || asset.hostname || asset.id?.toString()
    QRCode.toDataURL(text, { width: 240, margin: 2, color: { dark: '#1a1f2e', light: '#ffffff' } })
      .then(url => setDataUrl(url))
      .catch(() => {})
  }, [asset])

  const download = () => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `qr-${asset.asset_tag || asset.hostname}.png`
    a.click()
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="QR Code Tag" onClose={onClose} />
      <div style={{ textAlign: 'center' }}>
        {dataUrl ? (
          <>
            <div style={{ display: 'inline-block', background: '#fff', padding: 16, borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 14 }}>
              <img src={dataUrl} alt="QR Code" style={{ display: 'block', width: 200, height: 200 }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'monospace', marginBottom: 4 }}>
              {asset.asset_tag || '—'}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>{asset.hostname}</div>
            <SaveBtn label="Download PNG" onClick={download} color={T.navy} />
          </>
        ) : (
          <div style={{ padding: 40, color: T.muted, fontSize: 13 }}>Generating QR code...</div>
        )}
      </div>
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
        <Label text="New Hostname" required />
        <input value={softName} onChange={e => setSoftName(e.target.value)} style={inputStyle} />
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
    hostname: '', asset_tag: '', status: 'Ready to Deploy', asset_type: 'Desktop',
    manufacturer: '', model: '', serial: '', mac_address: '', ip_address: '', os: '',
    assigned_user: '', department: '', location: '', checkout_date: '', expected_checkin_date: '',
    purchase_date: '', purchase_cost: '', order_number: '', supplier: '',
    warranty_months: '', warranty_expires: '', eol_date: '', notes: '',
    depreciation_method: 'Straight Line', depreciation_years: '3', salvage_value: '0',
    requestable: false,
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
      <AssetFormFields form={form} set={set} isEdit={false} />
      <SaveBtn label={saving ? 'Creating...' : 'Create Asset'} onClick={submit} disabled={saving || !form.hostname} />
    </Overlay>
  )
}

// ── Edit asset modal ──────────────────────────────────────────────────────────
export function EditAssetModal({ asset, onClose, onSave }) {
  const [form, setForm] = useState({
    hostname: asset?.hostname || '',
    asset_tag: asset?.asset_tag || '',
    status: asset?.status || '',
    asset_type: asset?.asset_type || 'Desktop',
    manufacturer: asset?.manufacturer || '',
    model: asset?.model || '',
    serial: asset?.serial || '',
    mac_address: asset?.mac_address || '',
    ip_address: asset?.ip_address || '',
    os: asset?.os || '',
    assigned_user: asset?.assigned_user || '',
    department: asset?.department || '',
    location: asset?.location || '',
    checkout_date: asset?.checkout_date?.slice(0, 10) || '',
    expected_checkin_date: asset?.expected_checkin_date?.slice(0, 10) || '',
    purchase_date: asset?.purchase_date?.slice(0, 10) || '',
    purchase_cost: asset?.purchase_cost || '',
    order_number: asset?.order_number || '',
    supplier: asset?.supplier || '',
    warranty_months: asset?.warranty_months || '',
    warranty_expires: asset?.warranty_expires?.slice(0, 10) || '',
    eol_date: asset?.eol_date?.slice(0, 10) || '',
    notes: asset?.notes || '',
    depreciation_method: asset?.depreciation_method || 'Straight Line',
    depreciation_years: String(asset?.depreciation_years ?? 3),
    salvage_value: String(asset?.salvage_value ?? 0),
    rustdesk_id: asset?.rustdesk_id || '',
    rustdesk_password: asset?.rustdesk_password || '',
    requestable: asset?.requestable ?? false,
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
      <AssetFormFields form={form} set={set} isEdit={true} />
      <SaveBtn label={saving ? 'Saving...' : 'Save Changes'} onClick={submit} disabled={saving || !form.hostname} />
    </Overlay>
  )
}

// ── Checkout modal ────────────────────────────────────────────────────────────
const CHECKOUT_TYPES = [
  { key: 'user',     label: 'To User' },
  { key: 'location', label: 'To Location' },
  { key: 'asset',    label: 'To Asset' },
]

export function CheckOutModal({ asset, onClose, onCheckout, locations = [] }) {
  const [checkoutType, setCheckoutType] = useState('user')
  const [form, setForm] = useState({
    assigned_to: asset?.assigned_user || '',
    location: asset?.location || '',
    parent_asset_id: '',
    checkout_date: new Date().toISOString().slice(0, 10),
    expected_checkin_date: '',
    note: '',
  })
  const [users, setUsers]   = useState([])
  const [apiLocs, setApiLocs] = useState([])
  const [allAssets, setAllAssets] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getUsers().then(d => setUsers(Array.isArray(d) ? d : [])).catch(() => {})
    api.getLocations().then(d => setApiLocs(Array.isArray(d) ? d : [])).catch(() => {})
    api.getAssets().then(d => {
      const rows = Array.isArray(d) ? d : (d?.rows || [])
      setAllAssets(rows.filter(a => a.id !== asset?.id))
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const locationOpts = apiLocs.length
    ? apiLocs.map(l => l.name)
    : [...new Set([asset?.location, ...locations].filter(Boolean))].sort()

  const isValid = () => {
    if (checkoutType === 'user')     return !!form.assigned_to
    if (checkoutType === 'location') return !!form.location
    if (checkoutType === 'asset')    return !!form.parent_asset_id
    return false
  }

  const submit = async () => {
    if (!isValid()) return
    setSaving(true)
    try {
      await onCheckout(asset.id, { ...form, checkout_type: checkoutType })
      onClose()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`Check Out — ${asset?.hostname}`} onClose={onClose} />

      {/* Type selector */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: `1px solid ${T.border}`, borderRadius: 9, overflow: 'hidden' }}>
        {CHECKOUT_TYPES.map(ct => (
          <button
            key={ct.key}
            onClick={() => setCheckoutType(ct.key)}
            style={{
              flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontSize: 13,
              fontFamily: T.font, fontWeight: checkoutType === ct.key ? 700 : 400,
              background: checkoutType === ct.key ? T.navy : T.card,
              color: checkoutType === ct.key ? '#fff' : T.text,
            }}
          >{ct.label}</button>
        ))}
      </div>

      {/* To User */}
      {checkoutType === 'user' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <Label text="Assign To" required />
            <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} style={selectStyle}>
              <option value="">Select user...</option>
              {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label text="Location" />
            <select value={form.location} onChange={e => set('location', e.target.value)} style={selectStyle}>
              <option value="">Select location...</option>
              {locationOpts.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </>
      )}

      {/* To Location */}
      {checkoutType === 'location' && (
        <div style={{ marginBottom: 14 }}>
          <Label text="Location" required />
          <select value={form.location} onChange={e => set('location', e.target.value)} style={selectStyle}>
            <option value="">Select location...</option>
            {locationOpts.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      )}

      {/* To Asset */}
      {checkoutType === 'asset' && (
        <div style={{ marginBottom: 14 }}>
          <Label text="Parent Asset" required />
          <select value={form.parent_asset_id} onChange={e => set('parent_asset_id', e.target.value)} style={selectStyle}>
            <option value="">Select asset...</option>
            {allAssets.map(a => (
              <option key={a.id} value={a.id}>
                {a.hostname}{a.asset_tag ? ` (${a.asset_tag})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label="Checkout Date" name="checkout_date" type="date" value={form.checkout_date} onChange={set} />
        <Field label="Expected Return" name="expected_checkin_date" type="date" value={form.expected_checkin_date} onChange={set} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <Label text="Note" />
        <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <SaveBtn label={saving ? 'Checking Out...' : 'Check Out'} onClick={submit} disabled={saving || !isValid()} color={T.blue} />
    </Overlay>
  )
}

// ── Check In modal ────────────────────────────────────────────────────────────
export function CheckInModal({ asset, onClose, onCheckin, locations = [] }) {
  const [form, setForm] = useState({
    location: asset?.location || '',
    note: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setSaving(true)
    try {
      await onCheckin(asset.id, form)
      onClose()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const locationOpts = [...new Set([asset?.location, ...locations].filter(Boolean))].sort()

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`Check In — ${asset?.hostname}`} onClose={onClose} />
      {asset?.checked_out_to && (
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: T.muted }}>
          Currently checked out to <strong style={{ color: T.text }}>{asset.checked_out_to}</strong>
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <Label text="Return to Location" />
        <select value={form.location} onChange={e => set('location', e.target.value)} style={selectStyle}>
          <option value="">Select location...</option>
          {locationOpts.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 20 }}>
        <Label text="Note" />
        <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <SaveBtn label={saving ? 'Checking In...' : 'Check In'} onClick={submit} disabled={saving} color={T.navy} />
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
      <ModalHeader title={`Audit — ${asset?.hostname}`} onClose={onClose} />
      <p style={{ fontSize: 13, color: T.muted, marginBottom: 14 }}>
        Record that you have physically verified this asset is present and in the expected condition.
      </p>
      <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12 }}>
        <div style={{ color: T.muted }}>Last audited</div>
        <div style={{ color: T.text, fontWeight: 600, marginTop: 2 }}>
          {asset?.last_audited_at ? new Date(asset.last_audited_at).toLocaleString() : 'Never'}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <Label text="Note (optional)" />
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
          style={{ ...inputStyle, resize: 'vertical' }} />
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
        Are you sure you want to delete <strong>{asset?.hostname}</strong>? This asset will be moved to the trash and can be restored later.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 9, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', fontFamily: T.font, fontSize: 14 }}>Cancel</button>
        <SaveBtn label={saving ? 'Deleting...' : 'Delete Asset'} onClick={submit} disabled={saving} color={T.red} />
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
      <Field label="Assign To" name="user" value={value} onChange={(_, v) => setValue(v)} required placeholder="Full name" />
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

// ── Bulk status modal ─────────────────────────────────────────────────────────
export function BulkStatusModal({ count, onClose, onConfirm }) {
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
      <ModalHeader title={`Update status for ${count} assets`} onClose={onClose} />
      <Field label="New Status" name="status" value={value} onChange={(_, v) => setValue(v)} options={STATUS_OPTIONS} required />
      <SaveBtn label={saving ? 'Saving...' : 'Update Status'} onClick={submit} disabled={saving || !value} color={T.blue} />
    </Overlay>
  )
}
