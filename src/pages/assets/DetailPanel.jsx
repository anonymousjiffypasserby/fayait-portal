import { useState, useEffect, useRef } from 'react'
import { T, fmtAgo, fmtDate, healthScore, isOnline, STATUS_COLORS } from './shared'
import api from '../../services/api'

const TABS = ['Overview', 'Hardware', 'Software', 'Network', 'History', 'Maintenance', 'Files']

const InfoRow = ({ label, value, mono, copyable, children }) => {
  const [copied, setCopied] = useState(false)
  const displayValue = children || value
  if (!displayValue && displayValue !== 0) return null

  const copy = () => {
    navigator.clipboard.writeText(String(value)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 11, color: T.muted, width: 150, flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.4, paddingTop: 1 }}>{label}</div>
      <div style={{ fontSize: 12, color: T.text, fontFamily: mono ? 'monospace' : T.font, fontWeight: 500, wordBreak: 'break-all', flex: 1 }}>
        {children || value}
      </div>
      {copyable && value && (
        <button
          onClick={copy}
          style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, border: `1px solid ${T.border}`, background: copied ? T.green : T.card, color: copied ? '#fff' : T.muted, cursor: 'pointer', flexShrink: 0, fontFamily: T.font }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      )}
    </div>
  )
}

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>{title}</div>
    {children}
  </div>
)

const UsageBar = ({ value, label }) => {
  if (value === null || value === undefined) return null
  const pct = parseFloat(value)
  if (isNaN(pct)) return null
  const c = pct > 90 ? T.red : pct > 75 ? T.yellow : T.green
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: T.muted }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: c }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 5, background: '#f0f2f5', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: c, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

const StatusBadge = ({ status }) => {
  if (!status) return null
  const color = STATUS_COLORS[status] || T.muted
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
      background: color + '18', color, border: `1px solid ${color}30`,
    }}>
      {status}
    </span>
  )
}

// ── Tab: Overview ────────────────────────────────────────────────────────────
function TabOverview({ asset, isAdmin }) {
  const on = isOnline(asset)
  const { score, issues } = healthScore(asset)
  const healthColor = score >= 80 ? T.green : score >= 60 ? T.yellow : T.red
  const ms = asset.last_seen ? Date.now() - new Date(asset.last_seen).getTime() : null

  return (
    <div>
      {/* Status cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1, background: '#f8f9fa', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Health</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', border: `4px solid ${healthColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: healthColor, flexShrink: 0 }}>{score}</div>
            <div>{issues.length === 0 ? <span style={{ fontSize: 12, color: T.green }}>All good</span> : issues.map(i => <div key={i} style={{ fontSize: 11, color: T.red }}>• {i}</div>)}</div>
          </div>
        </div>
        <div style={{ flex: 1, background: '#f8f9fa', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Connectivity</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: on ? T.green : T.red, boxShadow: `0 0 6px ${on ? T.green : T.red}` }} />
            <span style={{ fontWeight: 700, color: on ? T.green : T.red, fontSize: 13 }}>{on ? 'Online' : 'Offline'}</span>
          </div>
          {ms !== null && <div style={{ fontSize: 11, color: T.muted }}>Last seen {fmtAgo(ms)}</div>}
        </div>
      </div>

      {/* Deployment status */}
      {asset.status && (
        <div style={{ marginBottom: 16 }}>
          <StatusBadge status={asset.status} />
        </div>
      )}

      {/* Live metrics */}
      {(asset.ram_percent || asset.cpu_percent || asset.disk_usage) && (
        <Section title="Live Metrics">
          <UsageBar value={asset.cpu_percent} label="CPU Usage" />
          <UsageBar value={asset.ram_percent} label="RAM Usage" />
          {asset.disk_usage && typeof asset.disk_usage === 'object' &&
            Object.entries(asset.disk_usage).map(([drive, pct]) => (
              <UsageBar key={drive} value={pct} label={`Disk ${drive}`} />
            ))
          }
        </Section>
      )}

      <Section title="Identity">
        <InfoRow label="Hostname" value={asset.hostname} />
        <InfoRow label="Asset Tag" value={asset.asset_tag} mono copyable />
        <InfoRow label="Serial" value={asset.serial} mono copyable />
        <InfoRow label="OS" value={asset.os} />
        <InfoRow label="IP Address" value={asset.ip_address} mono />
        <InfoRow label="MAC Address" value={asset.mac_address} mono />
        <InfoRow label="Network Type" value={asset.network_type} />
      </Section>

      <Section title="Assignment">
        <InfoRow label="Assigned To" value={asset.assigned_user} />
        <InfoRow label="Checked Out To" value={asset.checked_out_to} />
        <InfoRow label="Checkout Date" value={fmtDate(asset.checkout_date)} />
        <InfoRow label="Expected Return" value={fmtDate(asset.expected_checkin_date)} />
        <InfoRow label="Department" value={asset.department} />
        <InfoRow label="Location" value={asset.location} />
        <InfoRow label="Component of" value={asset.parent_hostname || null} />
        <InfoRow label="Last Audited" value={asset.last_audited_at ? new Date(asset.last_audited_at).toLocaleString() : null} />
        <InfoRow label="Last Logged User" value={asset.last_logged_user} />
      </Section>

      <Section title="Hardware">
        <InfoRow label="Manufacturer" value={asset.manufacturer} />
        <InfoRow label="Model" value={asset.model} />
        <InfoRow label="CPU" value={asset.cpu} />
        <InfoRow label="RAM" value={asset.ram_gb ? `${asset.ram_gb} GB` : null} />
        <InfoRow label="Disk" value={asset.disk_gb ? `${asset.disk_gb} GB` : null} />
        <InfoRow label="Disk Health" value={asset.disk_health} />
        <InfoRow label="GPU" value={asset.gpu} />
      </Section>

      <Section title="Purchase Info">
        <InfoRow label="Purchase Date" value={fmtDate(asset.purchase_date)} />
        <InfoRow label="Purchase Cost" value={asset.purchase_cost ? `$${asset.purchase_cost}` : null} />
        <InfoRow label="Order Number" value={asset.order_number} />
        <InfoRow label="Supplier" value={asset.supplier} />
        <InfoRow label="Warranty Months" value={asset.warranty_months} />
        <InfoRow label="Warranty Expires" value={fmtDate(asset.warranty_expires)} />
        <InfoRow label="EOL Date" value={fmtDate(asset.eol_date)} />
      </Section>

      {isAdmin && (
        <Section title="Admin Info">
          <InfoRow label="Agent Token" value={asset.agent_token} mono copyable />
          <InfoRow label="RustDesk ID" value={asset.rustdesk_id} mono copyable />
          <InfoRow label="RustDesk Pass" value={asset.rustdesk_password} mono copyable />
          <InfoRow label="Snipe-IT ID" value={asset.snipe_id} />
        </Section>
      )}

      {asset.notes && (
        <Section title="Notes">
          <div style={{ fontSize: 12, color: T.text, background: '#f8f9fa', borderRadius: 8, padding: 12, lineHeight: 1.6 }}>{asset.notes}</div>
        </Section>
      )}
    </div>
  )
}

// ── Tab: Hardware ────────────────────────────────────────────────────────────
function TabHardware({ asset }) {
  return (
    <div>
      <Section title="Processor">
        <InfoRow label="CPU" value={asset.cpu} />
        <InfoRow label="Cores" value={asset.cpu_cores} />
      </Section>
      <Section title="Memory & Storage">
        <InfoRow label="RAM" value={asset.ram_gb ? `${asset.ram_gb} GB` : null} />
        <InfoRow label="Disk Total" value={asset.disk_gb ? `${asset.disk_gb} GB` : null} />
        <InfoRow label="Disk Health" value={asset.disk_health} />
        {asset.disks_detail && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Drive Details</div>
            {(() => {
              let disks = asset.disks_detail
              if (typeof disks === 'string') { try { disks = JSON.parse(disks) } catch { return <pre style={{ fontSize: 11, color: T.muted }}>{disks}</pre> } }
              if (Array.isArray(disks)) return disks.map((d, i) => (
                <div key={i} style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{d.drive || d.letter || `Drive ${i + 1}`}</div>
                  {d.size && <div style={{ fontSize: 11, color: T.muted }}>Size: {d.size} GB</div>}
                  {d.used && <div style={{ fontSize: 11, color: T.muted }}>Used: {d.used} GB</div>}
                  {d.health && <div style={{ fontSize: 11, color: d.health === 'OK' ? T.green : T.red }}>Health: {d.health}</div>}
                  {d.model && <div style={{ fontSize: 11, color: T.muted }}>Model: {d.model}</div>}
                </div>
              ))
              return <pre style={{ fontSize: 11, color: T.muted, whiteSpace: 'pre-wrap' }}>{JSON.stringify(disks, null, 2)}</pre>
            })()}
          </div>
        )}
      </Section>
      <Section title="Display">
        <InfoRow label="GPU" value={asset.gpu} />
        <InfoRow label="Monitors" value={asset.monitors} />
        <InfoRow label="Resolution" value={asset.resolution} />
      </Section>
      {(asset.battery_status || asset.battery_health) && (
        <Section title="Power">
          <InfoRow label="Battery Status" value={asset.battery_status} />
          <InfoRow label="Battery Health" value={asset.battery_health} />
        </Section>
      )}
      <Section title="Peripherals">
        <InfoRow label="USB Devices" value={asset.usb_devices} />
      </Section>
      <Section title="Security">
        <InfoRow label="Antivirus" value={asset.antivirus} />
        {asset.pending_updates > 0 && (
          <InfoRow label="Pending Updates" value={`${asset.pending_updates} update${asset.pending_updates !== 1 ? 's' : ''}`} />
        )}
        <InfoRow label="Last Update" value={asset.last_update} />
      </Section>
    </div>
  )
}

// ── Tab: Software ────────────────────────────────────────────────────────────
function TabSoftware({ asset }) {
  const [search, setSearch] = useState('')
  const sw = asset.installed_software

  if (!sw || !Array.isArray(sw) || sw.length === 0) {
    return <div style={{ color: T.muted, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No software data yet. Agent will report on next 60-min scan.</div>
  }

  const filtered = search
    ? sw.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.publisher?.toLowerCase().includes(search.toLowerCase()))
    : sw

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: T.muted }}>{sw.length} installed apps</span>
        {asset.last_scanned_at && <span style={{ fontSize: 10, color: T.muted }}>Scanned {fmtAgo(Date.now() - new Date(asset.last_scanned_at).getTime())}</span>}
      </div>
      <input
        placeholder="Search software..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: T.font, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {filtered.map((s, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: i % 2 === 0 ? '#f8f9fa' : T.card, borderRadius: 4 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{s.name}</div>
              {s.publisher && <div style={{ fontSize: 10, color: T.muted }}>{s.publisher}</div>}
            </div>
            {s.version && <div style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace', alignSelf: 'center', marginLeft: 8, whiteSpace: 'nowrap' }}>{s.version}</div>}
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: T.muted, fontSize: 12, padding: 20, textAlign: 'center' }}>No results</div>}
      </div>
    </div>
  )
}

// ── Tab: Network ─────────────────────────────────────────────────────────────
function TabNetwork({ asset }) {
  const [discovered, setDiscovered] = useState([])
  const [loadingDisc, setLoadingDisc] = useState(false)

  useEffect(() => {
    if (!asset.id) return
    setLoadingDisc(true)
    api.getDiscovered()
      .then(d => setDiscovered(Array.isArray(d) ? d : []))
      .catch(() => setDiscovered([]))
      .finally(() => setLoadingDisc(false))
  }, [asset.id])

  return (
    <div>
      <Section title="Network Info">
        <InfoRow label="IP Address" value={asset.ip_address} mono copyable />
        <InfoRow label="MAC Address" value={asset.mac_address} mono copyable />
        <InfoRow label="Connection" value={asset.network_type} />
        <InfoRow label="Discovery" value={asset.network_discovery ? 'Enabled' : 'Disabled'} />
      </Section>

      <Section title="Discovered Devices">
        {loadingDisc ? (
          <div style={{ color: T.muted, fontSize: 12 }}>Loading...</div>
        ) : discovered.length === 0 ? (
          <div style={{ color: T.muted, fontSize: 12 }}>No devices discovered yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {discovered.map((d, i) => (
              <div key={d.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8f9fa', borderRadius: 8, border: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{d.hostname || d.ip_address}</div>
                  <div style={{ fontSize: 10, color: T.muted, fontFamily: 'monospace' }}>{d.ip_address} • {d.mac_address}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {d.status === 'pending' && (
                    <>
                      <button onClick={() => api.approveDiscovered(d.id).then(() => setDiscovered(p => p.filter(x => x.id !== d.id)))} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: 'none', background: T.green, color: '#fff', cursor: 'pointer' }}>Approve</button>
                      <button onClick={() => api.ignoreDiscovered(d.id).then(() => setDiscovered(p => p.filter(x => x.id !== d.id)))} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.muted, cursor: 'pointer' }}>Ignore</button>
                    </>
                  )}
                  {d.status !== 'pending' && <span style={{ fontSize: 11, color: T.muted }}>{d.status}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

// ── Tab: History ─────────────────────────────────────────────────────────────
function TabHistory({ asset }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAssetHistory(asset.id)
      .then(d => setHistory(Array.isArray(d) ? d : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [asset.id])

  const ACTION_COLORS = {
    checkout: T.blue,
    checkin: T.green,
    audit: T.yellow,
    update: T.navy,
    create: T.green,
    delete: T.red,
    online: T.green,
    offline: T.red,
  }

  if (loading) return <div style={{ color: T.muted, fontSize: 12 }}>Loading...</div>
  if (history.length === 0) return <div style={{ color: T.muted, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No history yet.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {history.map((h, i) => {
        const actionType = h.action?.toLowerCase() || ''
        const borderColor = Object.entries(ACTION_COLORS).find(([k]) => actionType.includes(k))?.[1] || T.muted
        return (
          <div key={h.id || i} style={{ padding: '10px 12px', background: '#f8f9fa', borderRadius: 8, borderLeft: `3px solid ${borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{h.action}</span>
              <span style={{ fontSize: 11, color: T.muted }}>{h.performed_by}</span>
            </div>
            {h.details && <div style={{ fontSize: 11, color: T.muted }}>{typeof h.details === 'object' ? JSON.stringify(h.details) : h.details}</div>}
            <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>{new Date(h.created_at).toLocaleString()}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tab: Maintenance ─────────────────────────────────────────────────────────
function TabMaintenance({ asset }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ title: '', supplier: '', start_date: '', end_date: '', cost: '', notes: '', completed: false })
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setForm({ title: '', supplier: '', start_date: '', end_date: '', cost: '', notes: '', completed: false })
    setEditingId(null)
  }

  const reload = () => {
    return api.getAssetMaintenance(asset.id)
      .then(d => setRecords(Array.isArray(d) ? d : []))
      .catch(() => {})
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [asset.id])

  const submit = async () => {
    setSaving(true)
    try {
      if (editingId) {
        await api.updateMaintenance(asset.id, editingId, form)
      } else {
        await api.createMaintenance(asset.id, form)
      }
      await reload()
      setShowForm(false)
      resetForm()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (r) => {
    setForm({
      title: r.title || '',
      supplier: r.supplier || '',
      start_date: r.start_date?.slice(0, 10) || '',
      end_date: r.end_date?.slice(0, 10) || '',
      cost: r.cost || '',
      notes: r.notes || '',
      completed: !!r.completed,
    })
    setEditingId(r.id)
    setShowForm(true)
  }

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this maintenance record?')) return
    try {
      await api.deleteMaintenance(asset.id, id)
      setRecords(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      alert(e.message)
    }
  }

  const inputStyle = { width: '100%', padding: '6px 10px', borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 12, boxSizing: 'border-box', fontFamily: T.font, outline: 'none' }

  if (loading) return <div style={{ color: T.muted, fontSize: 12 }}>Loading...</div>

  return (
    <div>
      <button
        onClick={() => { if (showForm && !editingId) { setShowForm(false) } else { resetForm(); setShowForm(true) } }}
        style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: 'none', background: T.navy, color: '#fff', cursor: 'pointer', fontWeight: 600, marginBottom: 14 }}
      >
        {showForm && !editingId ? '✕ Cancel' : '+ Schedule Maintenance'}
      </button>

      {showForm && (
        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 14, border: `1px solid ${T.border}` }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 12 }}>{editingId ? 'Edit Record' : 'New Maintenance'}</div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Supplier</label>
            <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 10px', marginBottom: 10 }}>
            {[['Start Date', 'start_date', 'date'], ['End Date', 'end_date', 'date'], ['Cost ($)', 'cost', 'number']].map(([label, key, type]) => (
              <div key={key}>
                <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
                <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.text, marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.completed} onChange={e => setForm(f => ({ ...f, completed: e.target.checked }))} />
            Completed
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submit} disabled={saving || !form.title}
              style={{ flex: 1, fontSize: 12, padding: '7px 14px', borderRadius: 7, border: 'none', background: T.green, color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: (!form.title || saving) ? 0.6 : 1 }}>
              {saving ? 'Saving...' : (editingId ? 'Update' : 'Save')}
            </button>
            {editingId && (
              <button onClick={() => { setShowForm(false); resetForm() }}
                style={{ fontSize: 12, padding: '7px 14px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.text }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No maintenance records.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {records.map((r, i) => (
            <div key={r.id || i} style={{ padding: '10px 14px', background: '#f8f9fa', borderRadius: 8, borderLeft: `3px solid ${r.completed ? T.green : T.orange}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{r.title}</span>
                    {r.completed && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 5, background: '#e8f5e9', color: T.green, fontWeight: 600 }}>Completed</span>}
                  </div>
                  {r.supplier && <div style={{ fontSize: 11, color: T.muted }}>Supplier: {r.supplier}</div>}
                  {r.notes && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{r.notes}</div>}
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>
                    {r.start_date && `${fmtDate(r.start_date)}${r.end_date ? ` → ${fmtDate(r.end_date)}` : ''}`}
                    {r.cost && ` • $${r.cost}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, marginLeft: 8, flexShrink: 0 }}>
                  <button onClick={() => startEdit(r)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.blue, fontWeight: 600 }}>Edit</button>
                  <button onClick={() => deleteRecord(r.id)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, border: `1px solid ${T.red}30`, background: '#fdecea', cursor: 'pointer', color: T.red, fontWeight: 600 }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab: Files ───────────────────────────────────────────────────────────────
const fmtSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const FILE_ICON = (name) => {
  const ext = name?.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '🖼'
  if (['pdf'].includes(ext)) return '📄'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊'
  return '📎'
}

function TabFiles({ asset }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    api.getAssetFiles(asset.id)
      .then(d => setFiles(Array.isArray(d) ? d : []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
  }, [asset.id])

  const uploadFile = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.uploadAssetFile(asset.id, fd)
      setFiles(prev => [res, ...prev])
    } catch (err) {
      alert(err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleInputChange = (e) => uploadFile(e.target.files?.[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    uploadFile(e.dataTransfer.files?.[0])
  }

  const deleteFile = async (fileId) => {
    if (!window.confirm('Delete this file?')) return
    try {
      await api.deleteAssetFile(asset.id, fileId)
      setFiles(prev => prev.filter(f => f.id !== fileId))
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div style={{ color: T.muted, fontSize: 12 }}>Loading...</div>

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? T.blue : T.border}`,
          borderRadius: 10,
          padding: '18px 14px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: dragOver ? '#f0f7ff' : '#fafbfc',
          marginBottom: 14,
          transition: 'all 0.15s',
        }}
      >
        <div style={{ fontSize: 22, marginBottom: 4 }}>📎</div>
        <div style={{ fontSize: 12, color: T.muted }}>
          {uploading ? 'Uploading...' : 'Drop a file here or click to upload'}
        </div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>Max 10 MB</div>
        <input ref={fileRef} type="file" onChange={handleInputChange} style={{ display: 'none' }} />
      </div>

      {/* File count */}
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>
        {files.length} file{files.length !== 1 ? 's' : ''} attached
      </div>

      {files.length === 0 ? (
        <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No files attached.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map((f, i) => (
            <div key={f.id || i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, border: `1px solid ${T.border}`,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{FILE_ICON(f.filename)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.filename}
                </div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
                  {fmtSize(f.size_bytes)}
                  {f.size_bytes ? ' • ' : ''}
                  {f.uploaded_at ? new Date(f.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  {f.uploaded_by_name ? ` • ${f.uploaded_by_name}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                <a
                  href={api.getFileDownloadUrl(asset.id, f.id)}
                  download={f.filename}
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.blue, fontWeight: 600, textDecoration: 'none' }}
                >
                  Download
                </a>
                <button
                  onClick={() => deleteFile(f.id)}
                  style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: `1px solid ${T.red}30`, background: '#fdecea', color: T.red, cursor: 'pointer', fontWeight: 600 }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main detail panel ────────────────────────────────────────────────────────
export default function DetailPanel({
  asset, onClose, onEdit, onConnect, onRetire, onCheckout, onCheckin, onClone, onAudit, onRename, onQR, isAdmin
}) {
  const [tab, setTab] = useState('Overview')
  const [cmdLoading, setCmdLoading] = useState(false)
  const [cmdMsg, setCmdMsg] = useState(null)

  if (!asset) return null

  const on = isOnline(asset)

  const sendCmd = async (command, payload = {}) => {
    setCmdLoading(true)
    setCmdMsg(null)
    try {
      const res = await api.sendAssetCommand(asset.id, command, payload)
      setCmdMsg({ ok: true, text: res.message || 'Command queued.' })
    } catch (e) {
      setCmdMsg({ ok: false, text: e.message })
    } finally {
      setCmdLoading(false)
      setTimeout(() => setCmdMsg(null), 4000)
    }
  }

  const ActionBtn = ({ label, onClick, color, disabled, title, small }) => (
    <button
      onClick={onClick}
      disabled={disabled || cmdLoading}
      title={title}
      style={{
        fontSize: small ? 10 : 11, padding: small ? '5px 9px' : '6px 11px', borderRadius: 7,
        border: `1px solid ${color || T.border}`,
        background: color ? color : T.card,
        color: color ? '#fff' : T.text,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600, fontFamily: T.font, opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )

  const tabContent = () => {
    switch (tab) {
      case 'Overview': return <TabOverview asset={asset} isAdmin={isAdmin} />
      case 'Hardware': return <TabHardware asset={asset} />
      case 'Software': return <TabSoftware asset={asset} />
      case 'Network': return <TabNetwork asset={asset} />
      case 'History': return <TabHistory asset={asset} />
      case 'Maintenance': return <TabMaintenance asset={asset} />
      case 'Files': return <TabFiles asset={asset} />
      default: return null
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 540, background: T.card,
      boxShadow: '-4px 0 30px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column',
      zIndex: 495, fontFamily: T.font,
    }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{ fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 0, flexShrink: 0 }}>×</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.hostname}</div>
          <div style={{ fontSize: 11, color: T.muted }}>{asset.asset_tag && `${asset.asset_tag} `}{asset.model && `• ${asset.model}`}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: on ? T.green : T.red, boxShadow: `0 0 5px ${on ? T.green : T.red}` }} />
          <span style={{ fontSize: 11, color: on ? T.green : T.red, fontWeight: 600 }}>{on ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        <ActionBtn label="Edit" onClick={onEdit} />
        {!asset.checked_out_to
          ? <ActionBtn label="Check Out" onClick={onCheckout} color={T.blue} />
          : <ActionBtn label="Check In" onClick={onCheckin} color={T.navy} />
        }
        <ActionBtn label="Clone" onClick={onClone} />
        <ActionBtn label="Audit" onClick={onAudit} />
        <ActionBtn label="QR Tag" onClick={onQR} />
        {isAdmin && asset.rustdesk_id && (
          <ActionBtn label="Connect" onClick={() => onConnect(asset)} color={T.navy} />
        )}
        {isAdmin && (
          <ActionBtn label="Rename PC" onClick={() => onRename(asset)} title="Send rename command to agent" />
        )}
        {asset.snipe_id && (
          <ActionBtn label="Snipe-IT ↗" onClick={() => window.open(`https://snipe.fayait.com/hardware/${asset.snipe_id}`, '_blank')} />
        )}
        <ActionBtn label="Delete" onClick={onRetire} color={T.red} />
      </div>

      {cmdMsg && (
        <div style={{ padding: '8px 16px', background: cmdMsg.ok ? '#e8f5e9' : '#fdecea', color: cmdMsg.ok ? T.green : T.red, fontSize: 12 }}>
          {cmdMsg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, overflowX: 'auto', flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontSize: 12, padding: '10px 13px', border: 'none', cursor: 'pointer', fontFamily: T.font, fontWeight: tab === t ? 700 : 400,
            color: tab === t ? T.navy : T.muted,
            borderBottom: tab === t ? `2px solid ${T.navy}` : '2px solid transparent',
            background: 'none', whiteSpace: 'nowrap',
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
        {tabContent()}
      </div>
    </div>
  )
}
