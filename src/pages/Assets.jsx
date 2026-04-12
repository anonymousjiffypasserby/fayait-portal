import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const ADMIN_ROLES = ['superadmin', 'admin']

const T = {
  bg: '#f0f2f5',
  card: '#fff',
  navy: '#1a1f2e',
  orange: '#ff6b35',
  green: '#1D9E75',
  red: '#e74c3c',
  yellow: '#f39c12',
  blue: '#378ADD',
  border: 'rgba(0,0,0,0.06)',
  text: '#1a1f2e',
  muted: '#888',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

// ── Utility components ───────────────────────────────────────────────────────

const DeviceIcon = ({ type }) => {
  const icons = { Laptop: '💻', Desktop: '🖥️', Server: '🖧' }
  return <span style={{ fontSize: 22 }}>{icons[type] || '💻'}</span>
}

const StatusDot = ({ online, lastSeen }) => {
  const ms = lastSeen ? Date.now() - new Date(lastSeen).getTime() : Infinity
  const isRecent = ms < 2 * 60 * 60 * 1000
  const active = online && isRecent
  const color = active ? T.green : T.red
  const label = active ? 'Online' : 'Offline'
  const ago = lastSeen ? fmtAgo(ms) : 'never'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} title={`Last seen: ${ago}`}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}` }} />
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
      {!active && lastSeen && <span style={{ fontSize: 10, color: T.muted }}>({ago})</span>}
    </div>
  )
}

const fmtAgo = (ms) => {
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const HealthScore = ({ asset }) => {
  let score = 100, issues = []
  if (asset.pending_updates && asset.pending_updates !== 'Unknown' && parseInt(asset.pending_updates) > 10) { score -= 20; issues.push(`${asset.pending_updates} pending updates`) }
  if (asset.antivirus?.includes('Disabled')) { score -= 30; issues.push('Antivirus disabled') }
  if (asset.antivirus?.includes('Outdated')) { score -= 20; issues.push('Antivirus outdated') }
  if (asset.ram_usage > 90) { score -= 15; issues.push('High RAM') }
  if (asset.disk_health === 'Critical') { score -= 40; issues.push('Disk critical') }
  const color = score >= 80 ? T.green : score >= 60 ? T.yellow : T.red
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', border: `3px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color }}>{score}</div>
      {issues.length > 0 && <div style={{ fontSize: 10, color: T.muted }}>{issues[0]}{issues.length > 1 ? ` +${issues.length - 1}` : ''}</div>}
    </div>
  )
}

const UsageBar = ({ value, label, color }) => {
  if (value === null || value === undefined) return null
  const pct = parseFloat(value)
  if (isNaN(pct)) return null
  const c = pct > 90 ? T.red : pct > 75 ? T.yellow : color || T.green
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: T.muted }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: c }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ height: 4, background: '#f0f2f5', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: c, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

const InfoRow = ({ label, value, mono }) => {
  if (!value || value === 'Unknown' || value === 'N/A') return null
  return (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 11, color: T.muted, width: 120, flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.4, paddingTop: 1 }}>{label}</div>
      <div style={{ fontSize: 12, color: T.text, fontFamily: mono ? 'monospace' : T.font, fontWeight: 500, wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 6 }}>{title}</div>
    {children}
  </div>
)

const Btn = ({ children, onClick, color = T.navy, bg = '#f7f8fa', style = {}, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: bg, color, border: `1px solid ${T.border}`, borderRadius: 7,
    padding: '7px 13px', fontSize: 12, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: T.font, opacity: disabled ? 0.5 : 1, ...style
  }}>{children}</button>
)

const Input = ({ label, value, onChange, placeholder, type = 'text', mono, style = {} }) => (
  <div style={{ marginBottom: 10 }}>
    {label && <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>}
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '7px 10px', borderRadius: 7,
        border: `1px solid ${T.border}`, fontSize: 12,
        fontFamily: mono ? 'monospace' : T.font,
        outline: 'none', boxSizing: 'border-box', ...style
      }}
    />
  </div>
)

const Textarea = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <div style={{ marginBottom: 10 }}>
    {label && <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>}
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', padding: '7px 10px', borderRadius: 7,
        border: `1px solid ${T.border}`, fontSize: 12,
        fontFamily: T.font, outline: 'none', resize: 'vertical', boxSizing: 'border-box'
      }}
    />
  </div>
)

// ── Connect Modal ─────────────────────────────────────────────────────────────

const ConnectModal = ({ asset, onClose }) => {
  const [showPw, setShowPw] = useState(false)
  const [copied, setCopied] = useState('')

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(''), 1500) })
  }
  const launch = () => {
    window.open(`rustdesk://remote_desktop/${asset.rustdesk_id}?password=${asset.rustdesk_password}`, '_self')
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 380 }}>
        <ModalHeader title={`Connect to ${asset.hostname}`} onClose={onClose} />
        <div style={{ padding: '20px 24px 24px' }}>
          <div style={{ background: '#f7f8fa', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>RustDesk ID</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: T.navy, fontFamily: 'monospace', letterSpacing: 2 }}>{asset.rustdesk_id}</span>
              <Btn onClick={() => copy(asset.rustdesk_id, 'id')} style={{ padding: '5px 10px' }}>
                {copied === 'id' ? '✓ Copied' : 'Copy'}
              </Btn>
            </div>
          </div>
          <div style={{ background: '#f7f8fa', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Password</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: T.navy, fontFamily: 'monospace', flex: 1 }}>
                {showPw ? asset.rustdesk_password : '•'.repeat(12)}
              </span>
              <Btn onClick={() => setShowPw(p => !p)} style={{ padding: '5px 10px' }}>{showPw ? 'Hide' : 'Show'}</Btn>
              <Btn onClick={() => copy(asset.rustdesk_password, 'pw')} style={{ padding: '5px 10px' }}>
                {copied === 'pw' ? '✓ Copied' : 'Copy'}
              </Btn>
            </div>
          </div>
          <button onClick={launch} style={{
            width: '100%', background: T.orange, color: '#fff', border: 'none',
            borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: T.font, marginBottom: 10
          }}>🖥 Open in RustDesk</button>
          <div style={{ fontSize: 11, color: T.muted, textAlign: 'center' }}>
            RustDesk must be installed on your computer. If it doesn't open automatically, launch RustDesk manually and enter the ID and password above.
          </div>
        </div>
      </div>
    </Overlay>
  )
}

// ── Rename Modal ──────────────────────────────────────────────────────────────

const RenameModal = ({ asset, onClose, onSoftRename, onSendCommand, isAdmin }) => {
  const [tab, setTab] = useState('software')
  const [newName, setNewName] = useState(asset.hostname || '')
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  const handleSoftRename = async () => {
    if (!newName.trim()) return
    setSaving(true); setErr('')
    try {
      await onSoftRename(newName.trim())
      onClose()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  const handleSendCommand = async () => {
    if (!newName.trim()) return
    if (!/^[a-zA-Z0-9-]{1,15}$/.test(newName.trim())) {
      setErr('PC name must be 1–15 chars, letters, numbers, hyphens only.')
      return
    }
    setSaving(true); setErr('')
    try {
      await onSendCommand('rename_pc', { new_name: newName.trim() })
      setSent(true)
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 420 }}>
        <ModalHeader title="Rename Device" onClose={onClose} />
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
            {[['software', 'Portal Name'], ['pc', 'Rename PC']].map(([k, label]) => (
              <button key={k} onClick={() => { setTab(k); setErr(''); setSent(false) }} style={{
                padding: '10px 16px', fontSize: 13, fontWeight: tab === k ? 600 : 400,
                color: tab === k ? T.orange : T.muted, background: 'none', border: 'none',
                borderBottom: tab === k ? `2px solid ${T.orange}` : '2px solid transparent',
                cursor: 'pointer', fontFamily: T.font,
              }}>{label}</button>
            ))}
          </div>

          {tab === 'software' && (
            <>
              <p style={{ fontSize: 12, color: T.muted, marginBottom: 14, marginTop: 0 }}>
                Updates the display name in the portal only. The actual Windows computer name is not changed.
              </p>
              <Input label="Portal display name" value={newName} onChange={setNewName} placeholder="DESKTOP-XXXX" />
              {err && <div style={{ fontSize: 12, color: T.red, marginBottom: 10 }}>{err}</div>}
              <button onClick={handleSoftRename} disabled={saving || !newName.trim()} style={{
                width: '100%', background: T.orange, color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: T.font, opacity: saving ? 0.7 : 1
              }}>{saving ? 'Saving…' : 'Save Name'}</button>
            </>
          )}

          {tab === 'pc' && !isAdmin && (
            <div style={{ fontSize: 13, color: T.muted, padding: '12px 0' }}>Admin access required to send PC commands.</div>
          )}

          {tab === 'pc' && isAdmin && !asset.agent_token && (
            <div style={{ fontSize: 13, color: T.muted, padding: '12px 0' }}>No agent installed on this device. Cannot send remote commands.</div>
          )}

          {tab === 'pc' && isAdmin && asset.agent_token && !sent && (
            <>
              <p style={{ fontSize: 12, color: T.muted, marginBottom: 14, marginTop: 0 }}>
                Sends a rename command to the agent. The PC will be renamed on next check-in (hourly). A restart is required for the change to take effect.
              </p>
              <Input label="New PC hostname (max 15 chars)" value={newName} onChange={setNewName} placeholder="NEWNAME" mono />
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>Letters, numbers, hyphens only. Max 15 characters.</div>
              {err && <div style={{ fontSize: 12, color: T.red, marginBottom: 10 }}>{err}</div>}
              <button onClick={handleSendCommand} disabled={saving || !newName.trim()} style={{
                width: '100%', background: T.navy, color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: T.font, opacity: saving ? 0.7 : 1
              }}>{saving ? 'Sending…' : 'Send Rename Command'}</button>
            </>
          )}

          {tab === 'pc' && isAdmin && sent && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 600, color: T.navy, marginBottom: 6 }}>Command queued</div>
              <div style={{ fontSize: 12, color: T.muted }}>The agent will rename the PC on its next check-in (within 1 hour). A restart will be required.</div>
              <Btn onClick={onClose} style={{ marginTop: 16 }}>Close</Btn>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  )
}

// ── New Asset Modal ───────────────────────────────────────────────────────────

const NewAssetModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({ asset_type: 'Desktop' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    if (!form.hostname?.trim()) { setErr('Hostname is required'); return }
    setSaving(true); setErr('')
    try {
      await onCreate(form)
      onClose()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 500, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <ModalHeader title="Add Asset Manually" onClose={onClose} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 24px 24px' }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 12 }}>Identity</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <Input label="Hostname *" value={form.hostname} onChange={v => set('hostname', v)} placeholder="DESKTOP-XXXX" />
            <div>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Asset Type</div>
              <select value={form.asset_type || 'Desktop'} onChange={e => set('asset_type', e.target.value)} style={{
                width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${T.border}`,
                fontSize: 12, fontFamily: T.font, marginBottom: 10
              }}>
                {['Desktop', 'Laptop', 'Server', 'Network', 'Printer', 'Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Serial" value={form.serial} onChange={v => set('serial', v)} placeholder="SN12345" mono />
            <Input label="MAC Address" value={form.mac_address} onChange={v => set('mac_address', v)} placeholder="AA:BB:CC:DD:EE:FF" mono />
          </div>

          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 6 }}>Assignment</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <Input label="Assigned To" value={form.assigned_user} onChange={v => set('assigned_user', v)} placeholder="John Smith" />
            <Input label="Department" value={form.department} onChange={v => set('department', v)} placeholder="IT" />
            <Input label="Location" value={form.location} onChange={v => set('location', v)} placeholder="Head Office" />
            <Input label="IP Address" value={form.ip_address} onChange={v => set('ip_address', v)} placeholder="192.168.1.x" mono />
          </div>

          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 6 }}>Hardware</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <Input label="Manufacturer" value={form.manufacturer} onChange={v => set('manufacturer', v)} placeholder="Lenovo" />
            <Input label="Model" value={form.model} onChange={v => set('model', v)} placeholder="ThinkPad X1" />
            <Input label="CPU" value={form.cpu} onChange={v => set('cpu', v)} placeholder="Intel Core i7" />
            <Input label="RAM (GB)" value={form.ram_gb} onChange={v => set('ram_gb', v)} type="number" placeholder="16" />
            <Input label="Storage (GB)" value={form.disk_gb} onChange={v => set('disk_gb', v)} type="number" placeholder="512" />
            <Input label="OS" value={form.os} onChange={v => set('os', v)} placeholder="Windows 11 Pro" />
          </div>

          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 6 }}>Purchase Info</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 14px' }}>
            <Input label="Purchase Date" value={form.purchase_date} onChange={v => set('purchase_date', v)} type="date" />
            <Input label="Warranty Expires" value={form.warranty_expires} onChange={v => set('warranty_expires', v)} type="date" />
            <Input label="Cost ($)" value={form.purchase_cost} onChange={v => set('purchase_cost', v)} type="number" placeholder="0.00" />
          </div>

          <Textarea label="Notes" value={form.notes} onChange={v => set('notes', v)} placeholder="Any notes about this asset..." />

          {err && <div style={{ fontSize: 12, color: T.red, marginBottom: 10 }}>{err}</div>}
          <button onClick={handleCreate} disabled={saving} style={{
            width: '100%', background: T.orange, color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: T.font, opacity: saving ? 0.7 : 1
          }}>{saving ? 'Creating…' : 'Create Asset'}</button>
        </div>
      </div>
    </Overlay>
  )
}

// ── Overlay & ModalHeader ──────────────────────────────────────────��──────────

const Overlay = ({ children, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, fontFamily: T.font,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
    }}>
      {children}
    </div>
  </div>
)

const ModalHeader = ({ title, onClose }) => (
  <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
    <span style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>{title}</span>
    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: T.muted, padding: 0 }}>✕</button>
  </div>
)

// ── Detail Panel ──────────────────────────────────────────────────────────────

const DetailPanel = ({ asset, onClose, isAdmin, onUpdate, onRetire, onConnect, onRename }) => {
  const [tab, setTab] = useState('overview')
  const [editForm, setEditForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [commands, setCommands] = useState(null)
  const [loadingCmds, setLoadingCmds] = useState(false)
  const [retireConfirm, setRetireConfirm] = useState(false)
  const [sendingCmd, setSendingCmd] = useState('')
  const [cmdInput, setCmdInput] = useState('')

  const setEdit = (k, v) => setEditForm(f => ({ ...f, [k]: v }))

  const startEdit = () => {
    setEditForm({
      hostname: asset.hostname || '',
      manufacturer: asset.manufacturer || '',
      model: asset.model || '',
      serial: asset.serial || '',
      mac_address: asset.mac_address || '',
      cpu: asset.cpu || '',
      cpu_cores: asset.cpu_cores || '',
      ram_gb: asset.ram_gb || '',
      disk_gb: asset.disk_gb || '',
      os: asset.os || '',
      asset_type: asset.asset_type || '',
      assigned_user: asset.assigned_user || '',
      department: asset.department || '',
      location: asset.location || '',
      ip_address: asset.ip_address || '',
      gpu: asset.gpu || '',
      notes: asset.notes || '',
      purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : '',
      warranty_expires: asset.warranty_expires ? asset.warranty_expires.split('T')[0] : '',
      purchase_cost: asset.purchase_cost || '',
    })
    setTab('edit')
  }

  const saveEdit = async () => {
    setSaving(true); setSaveErr('')
    try {
      await onUpdate(editForm)
      setEditForm(null)
      setTab('overview')
    } catch (e) { setSaveErr(e.message) }
    setSaving(false)
  }

  const loadCommands = useCallback(async () => {
    setLoadingCmds(true)
    try { setCommands(await api.getAssetCommands(asset.id)) } catch { setCommands([]) }
    setLoadingCmds(false)
  }, [asset.id])

  const handleTabChange = (t) => {
    setTab(t)
    if (t === 'commands' && commands === null) loadCommands()
  }

  const sendRestart = async () => {
    if (!window.confirm('Schedule a restart on this PC? The device will restart on its next check-in (within 1 hour).')) return
    setSendingCmd('restart')
    try {
      await api.sendAssetCommand(asset.id, 'restart', {})
      loadCommands()
    } catch (e) { alert(e.message) }
    setSendingCmd('')
  }

  const warrantyExpired = asset.warranty_expires && new Date(asset.warranty_expires) < new Date()
  const warrantyExpiresSoon = asset.warranty_expires && !warrantyExpired &&
    (new Date(asset.warranty_expires) - new Date()) < 30 * 24 * 60 * 60 * 1000

  return (
    <div style={{
      width: 380, background: '#fff', borderLeft: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0
    }}>
      {/* Panel header */}
      <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: '#f7f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DeviceIcon type={asset.asset_type} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{asset.hostname}</div>
              <StatusDot online={asset.online} lastSeen={asset.last_seen} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: T.muted, padding: 0 }}>✕</button>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {isAdmin && asset.rustdesk_id && (
            <button onClick={onConnect} style={{
              background: T.orange, color: '#fff', border: 'none', borderRadius: 7,
              padding: '7px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: T.font
            }}>🖥 Connect</button>
          )}
          {isAdmin && (
            <Btn onClick={onRename}>✏ Rename</Btn>
          )}
          <Btn onClick={() => alert('Create ticket coming soon')}>🎫 Ticket</Btn>
          {isAdmin && !retireConfirm && (
            <Btn onClick={() => setRetireConfirm(true)} color={T.red}>Retire</Btn>
          )}
          {retireConfirm && (
            <>
              <Btn onClick={() => setRetireConfirm(false)}>Cancel</Btn>
              <Btn onClick={onRetire} bg={T.red} color="#fff" style={{ border: 'none' }}>Confirm Retire</Btn>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        {[['overview', 'Overview'], ['edit', 'Edit'], ...(isAdmin ? [['commands', 'Commands']] : [])].map(([k, label]) => (
          <button key={k} onClick={() => handleTabChange(k)} style={{
            padding: '8px 14px', fontSize: 12, fontWeight: tab === k ? 600 : 400,
            color: tab === k ? T.orange : T.muted, background: 'none', border: 'none',
            borderBottom: tab === k ? `2px solid ${T.orange}` : '2px solid transparent',
            cursor: 'pointer', fontFamily: T.font,
          }}>{label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <>
            <Section title="Health">
              <div style={{ padding: '10px 12px', background: '#f7f8fa', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: asset.disk_usage ? 10 : 0 }}>
                  <HealthScore asset={asset} />
                  <div style={{ flex: 1 }}>
                    <UsageBar value={asset.ram_usage} label="RAM" />
                    <UsageBar value={asset.cpu_usage} label="CPU" color={T.orange} />
                  </div>
                </div>
                {asset.disk_usage && typeof asset.disk_usage === 'object' && Object.keys(asset.disk_usage).length > 0 && (
                  <div>
                    {Object.entries(asset.disk_usage).map(([drive, pct]) => (
                      <UsageBar key={drive} value={pct} label={`Disk ${drive}`} color={T.blue} />
                    ))}
                  </div>
                )}
              </div>
              {asset.disk_health && asset.disk_health !== 'OK' && (
                <div style={{ marginTop: 6, padding: '6px 10px', background: '#fff3cd', borderRadius: 6, fontSize: 11, color: '#856404', fontWeight: 600 }}>
                  ⚠ Disk health: {asset.disk_health}
                </div>
              )}
            </Section>

            <Section title="Hardware">
              <InfoRow label="Manufacturer" value={asset.manufacturer} />
              <InfoRow label="Model" value={asset.model} />
              <InfoRow label="CPU" value={asset.cpu} />
              <InfoRow label="CPU Cores" value={asset.cpu_cores} />
              <InfoRow label="RAM" value={asset.ram_gb ? `${asset.ram_gb} GB` : null} />
              <InfoRow label="Storage" value={asset.disk_gb ? `${asset.disk_gb} GB` : null} />
              <InfoRow label="Drives" value={asset.disks_detail} />
              <InfoRow label="GPU" value={asset.gpu} />
              <InfoRow label="Monitors" value={asset.monitors} />
              <InfoRow label="Resolution" value={asset.resolution} />
              <InfoRow label="Serial" value={asset.serial} mono />
            </Section>

            <Section title="System">
              <InfoRow label="OS" value={asset.os} />
              <InfoRow label="Antivirus" value={asset.antivirus} />
              <InfoRow label="Disk Health" value={asset.disk_health === 'OK' ? 'Good' : asset.disk_health} />
              <InfoRow label="Pending Updates" value={asset.pending_updates && asset.pending_updates !== 'Unknown' ? `${asset.pending_updates} updates` : null} />
              <InfoRow label="Last Update" value={asset.last_update} />
              <InfoRow label="Battery" value={asset.battery_status !== 'N/A' ? asset.battery_status : null} />
              <InfoRow label="Battery Health" value={asset.battery_health !== 'N/A' ? asset.battery_health : null} />
            </Section>

            <Section title="Network">
              <InfoRow label="IP Address" value={asset.ip_address} mono />
              <InfoRow label="MAC Address" value={asset.mac_address} mono />
              <InfoRow label="Connection" value={asset.network_type} />
            </Section>

            <Section title="Assignment">
              <InfoRow label="Assigned To" value={asset.assigned_user} />
              <InfoRow label="Department" value={asset.department} />
              <InfoRow label="Location" value={asset.location} />
              <InfoRow label="Asset Type" value={asset.asset_type} />
            </Section>

            {asset.purchase_date || asset.warranty_expires || asset.purchase_cost ? (
              <Section title="Purchase">
                <InfoRow label="Purchase Date" value={asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : null} />
                <InfoRow label="Warranty" value={
                  asset.warranty_expires
                    ? `${new Date(asset.warranty_expires).toLocaleDateString()}${warrantyExpired ? ' ⚠ Expired' : warrantyExpiresSoon ? ' ⚠ Expiring soon' : ''}`
                    : null
                } />
                <InfoRow label="Cost" value={asset.purchase_cost ? `$${parseFloat(asset.purchase_cost).toFixed(2)}` : null} />
              </Section>
            ) : null}

            {asset.usb_devices && asset.usb_devices !== 'Unknown' && (
              <Section title="USB Devices">
                <div style={{ fontSize: 12, color: T.text, lineHeight: 1.8 }}>
                  {asset.usb_devices.split(', ').map((d, i) => (
                    <div key={i} style={{ padding: '3px 0', borderBottom: `1px solid ${T.border}` }}>🔌 {d}</div>
                  ))}
                </div>
              </Section>
            )}

            {asset.notes && (
              <Section title="Notes">
                <div style={{ fontSize: 12, color: T.text, lineHeight: 1.7, padding: '8px 10px', background: '#f7f8fa', borderRadius: 8, whiteSpace: 'pre-wrap' }}>{asset.notes}</div>
              </Section>
            )}

            {isAdmin && (
              <Section title="Remote Access">
                <InfoRow label="RustDesk ID" value={asset.rustdesk_id} mono />
                <InfoRow label="Agent Token" value={asset.agent_token ? asset.agent_token.substring(0, 16) + '…' : null} mono />
                <InfoRow label="Last Check-in" value={asset.last_seen ? new Date(asset.last_seen).toLocaleString() : null} />
                <InfoRow label="Net Discovery" value={asset.network_discovery ? 'Enabled' : 'Disabled'} />
              </Section>
            )}
          </>
        )}

        {/* ── Edit ── */}
        {tab === 'edit' && (
          <>
            {!editForm ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <button onClick={startEdit} style={{
                  background: T.orange, color: '#fff', border: 'none', borderRadius: 8,
                  padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.font
                }}>Edit This Asset</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 4 }}>Identity</div>
                <Input label="Hostname" value={editForm.hostname} onChange={v => setEdit('hostname', v)} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
                  <Input label="Serial" value={editForm.serial} onChange={v => setEdit('serial', v)} mono />
                  <Input label="MAC Address" value={editForm.mac_address} onChange={v => setEdit('mac_address', v)} mono />
                </div>

                <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 8 }}>Assignment</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
                  <Input label="Assigned To" value={editForm.assigned_user} onChange={v => setEdit('assigned_user', v)} />
                  <Input label="Department" value={editForm.department} onChange={v => setEdit('department', v)} />
                  <Input label="Location" value={editForm.location} onChange={v => setEdit('location', v)} />
                  <div>
                    <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Asset Type</div>
                    <select value={editForm.asset_type || ''} onChange={e => setEdit('asset_type', e.target.value)} style={{
                      width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: T.font, marginBottom: 10
                    }}>
                      <option value="">— Select —</option>
                      {['Desktop', 'Laptop', 'Server', 'Network', 'Printer', 'Other'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 8 }}>Hardware</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
                  <Input label="Manufacturer" value={editForm.manufacturer} onChange={v => setEdit('manufacturer', v)} />
                  <Input label="Model" value={editForm.model} onChange={v => setEdit('model', v)} />
                  <Input label="RAM (GB)" value={editForm.ram_gb} onChange={v => setEdit('ram_gb', v)} type="number" />
                  <Input label="Storage (GB)" value={editForm.disk_gb} onChange={v => setEdit('disk_gb', v)} type="number" />
                  <Input label="GPU" value={editForm.gpu} onChange={v => setEdit('gpu', v)} />
                  <Input label="IP Address" value={editForm.ip_address} onChange={v => setEdit('ip_address', v)} mono />
                </div>
                <Input label="CPU" value={editForm.cpu} onChange={v => setEdit('cpu', v)} />
                <Input label="OS" value={editForm.os} onChange={v => setEdit('os', v)} />

                <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 8 }}>Purchase Info</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
                  <Input label="Purchase Date" value={editForm.purchase_date} onChange={v => setEdit('purchase_date', v)} type="date" />
                  <Input label="Warranty Expires" value={editForm.warranty_expires} onChange={v => setEdit('warranty_expires', v)} type="date" />
                </div>
                <Input label="Cost ($)" value={editForm.purchase_cost} onChange={v => setEdit('purchase_cost', v)} type="number" placeholder="0.00" />

                <Textarea label="Notes" value={editForm.notes} onChange={v => setEdit('notes', v)} placeholder="Notes about this asset..." rows={4} />

                {saveErr && <div style={{ fontSize: 12, color: T.red, marginBottom: 10 }}>{saveErr}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveEdit} disabled={saving} style={{
                    flex: 1, background: T.orange, color: '#fff', border: 'none',
                    borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: T.font, opacity: saving ? 0.7 : 1
                  }}>{saving ? 'Saving…' : 'Save Changes'}</button>
                  <Btn onClick={() => { setEditForm(null); setTab('overview') }}>Cancel</Btn>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Commands (admin) ── */}
        {tab === 'commands' && isAdmin && (
          <>
            <Section title="Send Command">
              {!asset.agent_token ? (
                <div style={{ fontSize: 12, color: T.muted, padding: '8px 0' }}>No agent installed on this device.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Btn onClick={sendRestart} disabled={sendingCmd === 'restart'} style={{ textAlign: 'left' }}>
                    🔄 {sendingCmd === 'restart' ? 'Sending…' : 'Schedule Restart'}
                  </Btn>
                  <div style={{ fontSize: 11, color: T.muted }}>Commands execute on next agent check-in (hourly).</div>
                </div>
              )}
            </Section>

            <Section title="Command History">
              {loadingCmds && <div style={{ fontSize: 12, color: T.muted }}>Loading…</div>}
              {!loadingCmds && commands?.length === 0 && <div style={{ fontSize: 12, color: T.muted }}>No commands yet.</div>}
              {commands?.map(c => (
                <div key={c.id} style={{
                  padding: '8px 10px', borderRadius: 8, background: '#f7f8fa',
                  marginBottom: 6, fontSize: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, color: T.navy }}>{c.command.replace('_', ' ')}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                      background: c.status === 'done' ? '#d4edda' : c.status === 'failed' ? '#f8d7da' : c.status === 'executing' ? '#fff3cd' : '#e2e3e5',
                      color: c.status === 'done' ? '#155724' : c.status === 'failed' ? '#721c24' : c.status === 'executing' ? '#856404' : '#383d41',
                    }}>{c.status}</span>
                  </div>
                  {c.payload && Object.keys(c.payload).length > 0 && (
                    <div style={{ color: T.muted, marginBottom: 2 }}>
                      {Object.entries(c.payload).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </div>
                  )}
                  {c.result && <div style={{ color: T.muted, fontStyle: 'italic' }}>{c.result}</div>}
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>{new Date(c.created_at).toLocaleString()}</div>
                </div>
              ))}
              {commands?.length > 0 && (
                <Btn onClick={loadCommands} style={{ marginTop: 4, width: '100%', textAlign: 'center' }}>↻ Refresh</Btn>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Assets() {
  const { user } = useAuth()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('hostname')
  const [tab, setTab] = useState('assets')
  const [showConnect, setShowConnect] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [showNewAsset, setShowNewAsset] = useState(false)
  const isAdmin = ADMIN_ROLES.includes(user?.role)

  const loadAssets = useCallback(() => {
    api.getAssets()
      .then(data => setAssets(data.rows || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadAssets() }, [loadAssets])

  const filtered = useMemo(() => {
    let list = assets
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.hostname?.toLowerCase().includes(q) ||
        a.assigned_user?.toLowerCase().includes(q) ||
        a.manufacturer?.toLowerCase().includes(q) ||
        a.model?.toLowerCase().includes(q) ||
        a.ip_address?.includes(q) ||
        a.serial?.toLowerCase().includes(q)
      )
    }
    if (filter === 'online') list = list.filter(a => {
      const ms = a.last_seen ? Date.now() - new Date(a.last_seen).getTime() : Infinity
      return a.online && ms < 2 * 60 * 60 * 1000
    })
    if (filter === 'offline') list = list.filter(a => {
      const ms = a.last_seen ? Date.now() - new Date(a.last_seen).getTime() : Infinity
      return !a.online || ms >= 2 * 60 * 60 * 1000
    })
    if (filter === 'issues') list = list.filter(a =>
      (a.pending_updates && parseInt(a.pending_updates) > 10) ||
      a.antivirus?.includes('Disabled') || a.disk_health === 'Critical'
    )
    list = [...list].sort((a, b) => {
      if (sortBy === 'hostname') return (a.hostname || '').localeCompare(b.hostname || '')
      if (sortBy === 'last_seen') return new Date(b.last_seen || 0) - new Date(a.last_seen || 0)
      if (sortBy === 'manufacturer') return (a.manufacturer || '').localeCompare(b.manufacturer || '')
      return 0
    })
    return list
  }, [assets, search, filter, sortBy])

  const handleUpdate = async (form) => {
    await api.updateAsset(selected.id, form)
    const updated = { ...selected, ...form }
    setSelected(updated)
    setAssets(prev => prev.map(a => a.id === selected.id ? { ...a, ...form } : a))
  }

  const handleRetire = async () => {
    await api.retireAsset(selected.id)
    setAssets(prev => prev.filter(a => a.id !== selected.id))
    setSelected(null)
  }

  const handleCreate = async (form) => {
    const newAsset = await api.createAsset(form)
    setAssets(prev => [newAsset, ...prev])
  }

  const handleSoftRename = async (newName) => {
    await handleUpdate({ hostname: newName })
  }

  const handleSendCommand = async (command, payload) => {
    await api.sendAssetCommand(selected.id, command, payload)
  }

  const exportCSV = () => {
    const headers = ['Hostname', 'Manufacturer', 'Model', 'CPU', 'RAM (GB)', 'OS', 'IP', 'MAC', 'Assigned To', 'Department', 'Location', 'Antivirus', 'Pending Updates', 'Purchase Date', 'Warranty Expires', 'Cost']
    const rows = filtered.map(a => [
      a.hostname, a.manufacturer, a.model, a.cpu, a.ram_gb, a.os,
      a.ip_address, a.mac_address, a.assigned_user, a.department, a.location,
      a.antivirus, a.pending_updates, a.purchase_date, a.warranty_expires, a.purchase_cost
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'assets.csv'; a.click()
  }

  const onlineCount = assets.filter(a => {
    const ms = a.last_seen ? Date.now() - new Date(a.last_seen).getTime() : Infinity
    return a.online && ms < 2 * 60 * 60 * 1000
  }).length
  const issueCount = assets.filter(a =>
    (a.pending_updates && parseInt(a.pending_updates) > 10) ||
    a.antivirus?.includes('Disabled') || a.disk_health === 'Critical'
  ).length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.muted, fontFamily: T.font }}>
      Loading assets…
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: T.bg, fontFamily: T.font }}>

      {/* ── List panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: T.navy, margin: 0 }}>Assets</h1>
              <p style={{ fontSize: 12, color: T.muted, margin: '3px 0 0' }}>
                {assets.length} devices · {onlineCount} online
                {issueCount > 0 && <span style={{ color: T.red }}> · {issueCount} need attention</span>}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {isAdmin && (
                <button onClick={() => setShowNewAsset(true)} style={{
                  background: T.orange, color: '#fff', border: 'none', borderRadius: 8,
                  padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: T.font
                }}>+ Add Asset</button>
              )}
              <button onClick={exportCSV} style={{
                background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8,
                padding: '8px 14px', fontSize: 12, color: T.muted, cursor: 'pointer', fontFamily: T.font
              }}>⬇ CSV</button>
              <button onClick={loadAssets} style={{
                background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8,
                padding: '8px 14px', fontSize: 12, color: T.muted, cursor: 'pointer', fontFamily: T.font
              }}>↻</button>
            </div>
          </div>

          <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
            {[['assets', `Registered (${assets.length})`], ['discovered', 'Discovered (0)']].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: tab === k ? 600 : 400,
                color: tab === k ? T.orange : T.muted, background: 'none', border: 'none',
                borderBottom: tab === k ? `2px solid ${T.orange}` : '2px solid transparent',
                cursor: 'pointer', fontFamily: T.font,
              }}>{label}</button>
            ))}
          </div>
        </div>

        {tab === 'discovered' ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: T.muted }}>
            <div style={{ fontSize: 36 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.navy }}>No discovered devices yet</div>
            <div style={{ fontSize: 13, maxWidth: 320, textAlign: 'center' }}>Enable network discovery on an installed device to start scanning.</div>
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 24px', display: 'flex', gap: 8, flexShrink: 0 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hostname, user, serial, IP…" style={{
                flex: 1, padding: '8px 14px', borderRadius: 8, border: `1px solid ${T.border}`,
                fontSize: 13, outline: 'none', background: '#fff', fontFamily: T.font,
              }} />
              <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: T.font }}>
                <option value="all">All</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="issues">Has issues</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: T.font }}>
                <option value="hostname">Name</option>
                <option value="last_seen">Last seen</option>
                <option value="manufacturer">Brand</option>
              </select>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
              {filtered.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 12, padding: '48px 24px', textAlign: 'center', border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>💻</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 8 }}>No assets found</div>
                  <div style={{ fontSize: 13, color: T.muted }}>
                    {isAdmin ? 'Use "Add Asset" to register manually, or deploy the installer on client devices.' : 'No devices registered yet.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filtered.map(asset => {
                    const ms = asset.last_seen ? Date.now() - new Date(asset.last_seen).getTime() : Infinity
                    const isOnline = asset.online && ms < 2 * 60 * 60 * 1000
                    const isSel = selected?.id === asset.id
                    return (
                      <div key={asset.id} onClick={() => setSelected(isSel ? null : asset)} style={{
                        background: '#fff', borderRadius: 10, padding: '12px 16px',
                        border: `1px solid ${isSel ? T.orange : T.border}`,
                        boxShadow: isSel ? `0 0 0 1px ${T.orange}` : '0 1px 3px rgba(0,0,0,0.04)',
                        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'border-color 0.15s',
                      }}>
                        <div style={{ width: 40, height: 40, borderRadius: 9, background: '#f7f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <DeviceIcon type={asset.asset_type} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: T.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.hostname || 'Unknown'}</span>
                            <StatusDot online={asset.online} lastSeen={asset.last_seen} />
                          </div>
                          <div style={{ fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[asset.manufacturer, asset.model].filter(Boolean).join(' ')} · {asset.cpu?.split('@')[0]?.trim() || '—'} · {asset.ram_gb ? `${asset.ram_gb}GB` : '—'}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: T.muted, minWidth: 90, textAlign: 'right', flexShrink: 0 }}>
                          <div>{asset.assigned_user || '—'}</div>
                          {asset.department && <div style={{ fontSize: 10, color: '#aaa' }}>{asset.department}</div>}
                        </div>
                        <div style={{ minWidth: 70, flexShrink: 0 }}>
                          <HealthScore asset={asset} />
                        </div>
                        {isAdmin && asset.rustdesk_id && (
                          <button onClick={e => { e.stopPropagation(); setSelected(asset); setShowConnect(true) }} style={{
                            background: isOnline ? T.orange : '#ddd', color: isOnline ? '#fff' : '#999',
                            border: 'none', borderRadius: 6, padding: '5px 10px',
                            fontSize: 11, fontWeight: 600, cursor: isOnline ? 'pointer' : 'default',
                            fontFamily: T.font, flexShrink: 0,
                          }} title={isOnline ? 'Connect' : 'Device offline'}>
                            🖥
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <DetailPanel
          asset={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onRetire={handleRetire}
          onConnect={() => setShowConnect(true)}
          onRename={() => setShowRename(true)}
        />
      )}

      {/* ── Modals ── */}
      {showConnect && selected?.rustdesk_id && (
        <ConnectModal asset={selected} onClose={() => setShowConnect(false)} />
      )}
      {showRename && selected && (
        <RenameModal
          asset={selected}
          isAdmin={isAdmin}
          onClose={() => setShowRename(false)}
          onSoftRename={handleSoftRename}
          onSendCommand={handleSendCommand}
        />
      )}
      {showNewAsset && (
        <NewAssetModal onClose={() => setShowNewAsset(false)} onCreate={handleCreate} />
      )}
    </div>
  )
}
