import { useState, useEffect } from 'react'
import { T, fmtAgo, healthScore, isOnline } from './shared'
import api from '../../services/api'

const TABS = ['Overview', 'Software', 'Network', 'Hardware', 'History', 'Maintenance', 'Files']

const InfoRow = ({ label, value, mono }) => {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 11, color: T.muted, width: 130, flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.4, paddingTop: 1 }}>{label}</div>
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

// ── Tab: Overview ────────────────────────────────────────────────────────────
function TabOverview({ asset }) {
  const on = isOnline(asset)
  const { score, issues } = healthScore(asset)
  const healthColor = score >= 80 ? T.green : score >= 60 ? T.yellow : T.red
  const ms = asset.last_seen ? Date.now() - new Date(asset.last_seen).getTime() : null

  return (
    <div>
      {/* Health + status */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div style={{ flex: 1, background: '#f8f9fa', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Health Score</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: `4px solid ${healthColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: healthColor }}>{score}</div>
            <div>{issues.length === 0 ? <span style={{ fontSize: 12, color: T.green }}>All good</span> : issues.map(i => <div key={i} style={{ fontSize: 11, color: T.red }}>• {i}</div>)}</div>
          </div>
        </div>
        <div style={{ flex: 1, background: '#f8f9fa', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: on ? T.green : T.red, boxShadow: `0 0 6px ${on ? T.green : T.red}` }} />
            <span style={{ fontWeight: 700, color: on ? T.green : T.red }}>{on ? 'Online' : 'Offline'}</span>
          </div>
          {ms !== null && <div style={{ fontSize: 11, color: T.muted }}>Last seen {fmtAgo(ms)}</div>}
          {asset.last_logged_user && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>User: {asset.last_logged_user}</div>}
        </div>
      </div>

      {/* Live metrics */}
      <Section title="Live Metrics">
        <UsageBar value={asset.ram_percent} label="RAM Usage" />
        <UsageBar value={asset.cpu_percent} label="CPU Usage" />
        {asset.disk_usage && typeof asset.disk_usage === 'object' &&
          Object.entries(asset.disk_usage).map(([drive, pct]) => (
            <UsageBar key={drive} value={pct} label={`Disk ${drive}`} />
          ))
        }
        <InfoRow label="Disk Health" value={asset.disk_health} />
      </Section>

      <Section title="Identity">
        <InfoRow label="Hostname" value={asset.hostname} />
        <InfoRow label="Asset Tag" value={asset.asset_tag} mono />
        <InfoRow label="Serial" value={asset.serial} mono />
        <InfoRow label="MAC Address" value={asset.mac_address} mono />
        <InfoRow label="IP Address" value={asset.ip_address} mono />
        <InfoRow label="Network Type" value={asset.network_type} />
        <InfoRow label="OS" value={asset.os} />
      </Section>

      <Section title="Assignment">
        <InfoRow label="Assigned To" value={asset.assigned_user} />
        <InfoRow label="Department" value={asset.department} />
        <InfoRow label="Location" value={asset.location} />
        {asset.checked_out_to && <InfoRow label="Checked Out To" value={asset.checked_out_to} />}
        {asset.last_audited_at && <InfoRow label="Last Audited" value={new Date(asset.last_audited_at).toLocaleString()} />}
      </Section>

      <Section title="Purchase Info">
        <InfoRow label="Manufacturer" value={asset.manufacturer} />
        <InfoRow label="Model" value={asset.model} />
        <InfoRow label="Purchase Date" value={asset.purchase_date} />
        <InfoRow label="Cost" value={asset.purchase_cost ? `$${asset.purchase_cost}` : null} />
        <InfoRow label="Warranty Expires" value={asset.warranty_expires} />
      </Section>

      {asset.notes && (
        <Section title="Notes">
          <div style={{ fontSize: 12, color: T.text, background: '#f8f9fa', borderRadius: 8, padding: 12, lineHeight: 1.6 }}>{asset.notes}</div>
        </Section>
      )}
    </div>
  )
}

// ── Tab: Software ────────────────────────────────────────────────────────────
function TabSoftware({ asset }) {
  const sw = asset.installed_software
  if (!sw || !Array.isArray(sw) || sw.length === 0) {
    return <div style={{ color: T.muted, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No software data yet. Agent will report on next 60-min scan.</div>
  }
  return (
    <div>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>{sw.length} installed applications</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {sw.map((s, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: i % 2 === 0 ? '#f8f9fa' : T.card, borderRadius: 4 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{s.name}</div>
              {s.publisher && <div style={{ fontSize: 10, color: T.muted }}>{s.publisher}</div>}
            </div>
            {s.version && <div style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace', alignSelf: 'center', marginLeft: 8, whiteSpace: 'nowrap' }}>{s.version}</div>}
          </div>
        ))}
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
    // Fetch discovered devices for this asset's company (they're stored globally)
    api.getDiscovered()
      .then(d => setDiscovered(Array.isArray(d) ? d : []))
      .catch(() => setDiscovered([]))
      .finally(() => setLoadingDisc(false))
  }, [asset.id])

  return (
    <div>
      <Section title="Network Info">
        <InfoRow label="IP Address" value={asset.ip_address} mono />
        <InfoRow label="MAC Address" value={asset.mac_address} mono />
        <InfoRow label="Connection" value={asset.network_type} />
        <InfoRow label="Discovery" value={asset.network_discovery ? 'Enabled' : 'Disabled'} />
      </Section>

      <Section title="Discovered Devices">
        {loadingDisc ? (
          <div style={{ color: T.muted, fontSize: 12 }}>Loading...</div>
        ) : discovered.length === 0 ? (
          <div style={{ color: T.muted, fontSize: 12 }}>No devices discovered yet. Enable network discovery in agent config.</div>
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
        <InfoRow label="Disk" value={asset.disk_gb ? `${asset.disk_gb} GB` : null} />
        <InfoRow label="Disk Health" value={asset.disk_health} />
        {asset.disks_detail && (
          <div style={{ fontSize: 12, background: '#f8f9fa', borderRadius: 8, padding: 10, marginTop: 4 }}>
            {typeof asset.disks_detail === 'string' ? asset.disks_detail : JSON.stringify(asset.disks_detail, null, 2)}
          </div>
        )}
      </Section>
      <Section title="Display">
        <InfoRow label="GPU" value={asset.gpu} />
        <InfoRow label="Monitors" value={asset.monitors} />
        <InfoRow label="Resolution" value={asset.resolution} />
      </Section>
      <Section title="Power">
        <InfoRow label="Battery Status" value={asset.battery_status} />
        <InfoRow label="Battery Health" value={asset.battery_health} />
      </Section>
      <Section title="Peripherals">
        <InfoRow label="USB Devices" value={asset.usb_devices} />
      </Section>
      <Section title="Security">
        <InfoRow label="Antivirus" value={asset.antivirus} />
        <InfoRow label="Pending Updates" value={asset.pending_updates} />
        <InfoRow label="Last Update" value={asset.last_update} />
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

  if (loading) return <div style={{ color: T.muted, fontSize: 12 }}>Loading...</div>
  if (history.length === 0) return <div style={{ color: T.muted, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No history yet.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {history.map((h, i) => (
        <div key={h.id || i} style={{ padding: '10px 12px', background: '#f8f9fa', borderRadius: 8, borderLeft: `3px solid ${T.blue}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{h.action}</span>
            <span style={{ fontSize: 11, color: T.muted }}>{h.performed_by}</span>
          </div>
          {h.details && <div style={{ fontSize: 11, color: T.muted }}>{typeof h.details === 'object' ? JSON.stringify(h.details) : h.details}</div>}
          <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>{new Date(h.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  )
}

// ── Tab: Maintenance ─────────────────────────────────────────────────────────
function TabMaintenance({ asset }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', notes: '', scheduled_date: '', cost: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getAssetMaintenance(asset.id)
      .then(d => setRecords(Array.isArray(d) ? d : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [asset.id])

  const submit = async () => {
    setSaving(true)
    try {
      await api.createMaintenance(asset.id, form)
      const updated = await api.getAssetMaintenance(asset.id)
      setRecords(Array.isArray(updated) ? updated : [])
      setShowForm(false)
      setForm({ title: '', notes: '', scheduled_date: '', cost: '' })
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ color: T.muted, fontSize: 12 }}>Loading...</div>

  return (
    <div>
      <button
        onClick={() => setShowForm(s => !s)}
        style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: 'none', background: T.navy, color: '#fff', cursor: 'pointer', fontWeight: 600, marginBottom: 14 }}
      >
        + Schedule Maintenance
      </button>

      {showForm && (
        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          {[
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'scheduled_date', label: 'Scheduled Date', type: 'date' },
            { key: 'cost', label: 'Cost ($)', type: 'number' },
          ].map(({ key, label, type }) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 3 }}>{label}</label>
              <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 12, boxSizing: 'border-box' }} />
            </div>
          ))}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 3 }}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3} style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <button onClick={submit} disabled={saving || !form.title}
            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: 'none', background: T.green, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      {records.length === 0 ? (
        <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No maintenance records.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {records.map((r, i) => (
            <div key={r.id || i} style={{ padding: '10px 12px', background: '#f8f9fa', borderRadius: 8, borderLeft: `3px solid ${T.orange}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{r.title}</span>
                {r.cost && <span style={{ fontSize: 11, color: T.muted }}>${r.cost}</span>}
              </div>
              {r.notes && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{r.notes}</div>}
              <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>
                {r.scheduled_date && `Scheduled: ${r.scheduled_date} • `}
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab: Files ───────────────────────────────────────────────────────────────
function TabFiles() {
  return (
    <div style={{ color: T.muted, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
      File attachments coming soon.
    </div>
  )
}

// ── Main detail panel ────────────────────────────────────────────────────────
export default function DetailPanel({
  asset, onClose, onEdit, onConnect, onRetire, onCheckout, onCheckin, onClone, onAudit, onRename, isAdmin
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

  const ActionBtn = ({ label, onClick, color, disabled, title }) => (
    <button
      onClick={onClick}
      disabled={disabled || cmdLoading}
      title={title}
      style={{
        fontSize: 11, padding: '6px 11px', borderRadius: 7,
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
      case 'Overview': return <TabOverview asset={asset} />
      case 'Software': return <TabSoftware asset={asset} />
      case 'Network': return <TabNetwork asset={asset} />
      case 'Hardware': return <TabHardware asset={asset} />
      case 'History': return <TabHistory asset={asset} />
      case 'Maintenance': return <TabMaintenance asset={asset} />
      case 'Files': return <TabFiles />
      default: return null
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 520, background: T.card,
      boxShadow: '-4px 0 30px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column',
      zIndex: 495, fontFamily: T.font,
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{ fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 0 }}>×</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.hostname}</div>
          <div style={{ fontSize: 11, color: T.muted }}>{asset.asset_tag} {asset.model ? `• ${asset.model}` : ''}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: on ? T.green : T.red, boxShadow: `0 0 5px ${on ? T.green : T.red}` }} />
          <span style={{ fontSize: 11, color: on ? T.green : T.red, fontWeight: 600 }}>{on ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <ActionBtn label="Edit" onClick={onEdit} />
        {!asset.checked_out_to
          ? <ActionBtn label="Check Out" onClick={onCheckout} color={T.blue} />
          : <ActionBtn label="Check In" onClick={onCheckin} color={T.navy} />
        }
        <ActionBtn label="Clone" onClick={onClone} />
        <ActionBtn label="Audit" onClick={onAudit} />
        {isAdmin && asset.rustdesk_id && (
          <ActionBtn label="Connect" onClick={() => onConnect(asset)} color={T.navy} />
        )}
        {isAdmin && (
          <ActionBtn label="Rename PC" onClick={() => onRename(asset)} title="Send rename command to agent" />
        )}
        {asset.snipe_id && (
          <ActionBtn label="Snipe-IT" onClick={() => window.open(`https://snipe.fayait.com/hardware/${asset.snipe_id}`, '_blank')} />
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
            fontSize: 12, padding: '10px 14px', border: 'none', cursor: 'pointer', fontFamily: T.font, fontWeight: tab === t ? 700 : 400,
            color: tab === t ? T.navy : T.muted,
            borderBottom: tab === t ? `2px solid ${T.navy}` : '2px solid transparent',
            background: 'none', whiteSpace: 'nowrap',
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {tabContent()}
      </div>
    </div>
  )
}
