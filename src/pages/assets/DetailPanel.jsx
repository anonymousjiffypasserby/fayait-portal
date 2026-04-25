import { useState, useEffect, useRef } from 'react'
import { T, fmtAgo, fmtDate, healthScore, isOnline, STATUS_COLORS, calcDepreciation, DEPRECIATION_METHODS } from './shared'
import { usePermission } from '../../hooks/usePermission'
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

// ── Depreciation chart (pure SVG) ────────────────────────────────────────────
function DepreciationChart({ asset, depSettings }) {
  const W = 380, H = 90, PAD = { t: 8, r: 8, b: 20, l: 48 }
  const iW = W - PAD.l - PAD.r
  const iH = H - PAD.t - PAD.b

  const synth = { ...asset, ...depSettings }
  const base  = calcDepreciation(synth)
  if (!base) return null

  const { cost, salvage, life } = base
  const STEPS = 60
  const points = []

  for (let i = 0; i <= STEPS; i++) {
    const yr = (life * i) / STEPS
    const val = calcDepreciation({ ...synth, _override_years: yr })
    if (!val) continue
    // use override
    const ms   = yr * 365.25 * 24 * 60 * 60 * 1000
    const fake  = { ...synth, purchase_date: new Date(Date.now() - ms).toISOString() }
    const snap  = calcDepreciation(fake)
    if (!snap) continue
    const x = PAD.l + (yr / life) * iW
    const y = PAD.t + (1 - (snap.current_value - salvage) / (cost - salvage || 1)) * iH
    points.push([x, y])
  }

  const todayYr  = base.years_owned
  const todayPct = Math.min(1, todayYr / life)
  const todayX   = PAD.l + todayPct * iW
  const todaySnap = calcDepreciation(synth)
  const todayY   = todaySnap
    ? PAD.t + (1 - (todaySnap.current_value - salvage) / (cost - salvage || 1)) * iH
    : PAD.t

  const polyline = points.map(p => p.join(',')).join(' ')
  const valPct   = todaySnap ? (todaySnap.current_value - salvage) / (cost - salvage || 1) : 1
  const dotColor = valPct > 0.66 ? T.green : valPct > 0.33 ? T.yellow : T.red

  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      {/* Grid lines */}
      {[0, 0.5, 1].map(f => (
        <line key={f}
          x1={PAD.l} x2={PAD.l + iW}
          y1={PAD.t + f * iH} y2={PAD.t + f * iH}
          stroke={T.border} strokeWidth={1} />
      ))}
      {/* Area fill */}
      <polygon
        points={`${PAD.l},${PAD.t + iH} ${polyline} ${PAD.l + iW},${PAD.t + iH}`}
        fill={T.blue + '12'} />
      {/* Curve */}
      <polyline points={polyline} fill="none" stroke={T.blue} strokeWidth={2} strokeLinejoin="round" />
      {/* Today marker */}
      {todayPct < 1 && (
        <line x1={todayX} x2={todayX} y1={PAD.t} y2={PAD.t + iH}
          stroke={dotColor} strokeWidth={1.5} strokeDasharray="3,2" />
      )}
      {/* Today dot */}
      <circle cx={todayX} cy={todayY} r={4} fill={dotColor} stroke="#fff" strokeWidth={1.5} />
      {/* Y axis labels */}
      <text x={PAD.l - 4} y={PAD.t + 4} textAnchor="end" fontSize={9} fill={T.muted}>${cost.toLocaleString()}</text>
      <text x={PAD.l - 4} y={PAD.t + iH + 4} textAnchor="end" fontSize={9} fill={T.muted}>${salvage.toLocaleString()}</text>
      {/* X axis labels */}
      <text x={PAD.l} y={H - 2} textAnchor="start" fontSize={9} fill={T.muted}>Purchase</text>
      <text x={PAD.l + iW} y={H - 2} textAnchor="end" fontSize={9} fill={T.muted}>{life}yr</text>
    </svg>
  )
}

// ── Depreciation section ──────────────────────────────────────────────────────
function DepreciationSection({ asset, onAssetUpdate }) {
  const [method,  setMethod]  = useState(asset.depreciation_method  || 'Straight Line')
  const [years,   setYears]   = useState(String(asset.depreciation_years  ?? 3))
  const [salvage, setSalvage] = useState(String(asset.salvage_value  ?? 0))
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  // Sync when asset prop changes (e.g. after save propagates back)
  useEffect(() => {
    setMethod(asset.depreciation_method || 'Straight Line')
    setYears(String(asset.depreciation_years ?? 3))
    setSalvage(String(asset.salvage_value ?? 0))
  }, [asset.depreciation_method, asset.depreciation_years, asset.salvage_value])

  const depSettings = {
    depreciation_method: method,
    depreciation_years:  parseInt(years) || 3,
    salvage_value:       parseFloat(salvage) || 0,
  }
  const dep = calcDepreciation({ ...asset, ...depSettings })
  if (!dep) return null

  const { current_value, depreciation_per_year, fully_depreciated, cost } = dep
  const pctRemaining = (current_value - dep.salvage) / (cost - dep.salvage || 1)
  const valColor = fully_depreciated ? T.muted : pctRemaining > 0.66 ? T.green : pctRemaining > 0.33 ? T.yellow : T.red

  const isDirty = method  !== (asset.depreciation_method  || 'Straight Line') ||
                  years   !== String(asset.depreciation_years  ?? 3) ||
                  salvage !== String(asset.salvage_value  ?? 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onAssetUpdate(asset.id, {
        depreciation_method: method,
        depreciation_years:  parseInt(years) || 3,
        salvage_value:       parseFloat(salvage) || 0,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const inpSt = {
    padding: '5px 8px', borderRadius: 6, border: `1px solid ${T.border}`,
    fontSize: 12, fontFamily: T.font, outline: 'none', background: '#fff',
  }

  return (
    <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
      {/* Controls row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '2 1 140px' }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Method</div>
          <select value={method} onChange={e => setMethod(e.target.value)}
            style={{ ...inpSt, width: '100%', cursor: 'pointer', background: '#fff' }}>
            {DEPRECIATION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 60px' }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Life (yrs)</div>
          <input type="number" min="1" max="50" value={years}
            onChange={e => setYears(e.target.value)}
            style={{ ...inpSt, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: '1 1 70px' }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Salvage ($)</div>
          <input type="number" min="0" step="0.01" value={salvage}
            onChange={e => setSalvage(e.target.value)}
            style={{ ...inpSt, width: '100%', boxSizing: 'border-box' }} />
        </div>
        {onAssetUpdate && isDirty && (
          <button onClick={handleSave} disabled={saving} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none',
            background: T.navy, color: '#fff', fontSize: 11, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
            fontFamily: T.font, alignSelf: 'flex-end', flexShrink: 0,
          }}>{saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}</button>
        )}
      </div>

      {/* Current value display */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '10px 14px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Current Value</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: valColor }}>
              ${current_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {fully_depreciated && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#e8eaed', color: T.muted }}>
                Fully Depreciated
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
            ${depreciation_per_year.toLocaleString(undefined, { maximumFractionDigits: 2 })}/yr · {' '}
            {fully_depreciated
              ? 'expired'
              : `${Math.max(0, dep.life - dep.years_owned).toFixed(1)} yrs remaining`
            }
          </div>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '10px 14px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>% Remaining</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: valColor }}>
            {(pctRemaining * 100).toFixed(0)}%
          </div>
          <div style={{ height: 4, background: '#f0f2f5', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(0, pctRemaining * 100)}%`, height: '100%', background: valColor, borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ overflowX: 'auto' }}>
        <DepreciationChart asset={asset} depSettings={depSettings} />
      </div>
    </div>
  )
}

// ── Tab: Overview ────────────────────────────────────────────────────────────
function TabOverview({ asset, isAdmin, onAssetUpdate }) {
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

      {asset.purchase_cost && asset.purchase_date && (
        <Section title="Depreciation">
          <DepreciationSection asset={asset} onAssetUpdate={onAssetUpdate} />
        </Section>
      )}

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
function InstalledComponents({ asset }) {
  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAssetComponents(asset.id)
      .then(d => setComponents(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [asset.id])

  if (loading) return <div style={{ fontSize: 11, color: T.muted, padding: '4px 0' }}>Loading…</div>
  if (components.length === 0) return <div style={{ fontSize: 11, color: T.muted, padding: '4px 0' }}>No components installed</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {components.map(c => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#f8f9fa', borderRadius: 8, border: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 16 }}>🔩</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{c.component_name}</div>
            <div style={{ fontSize: 10, color: T.muted }}>
              {c.category_name && `${c.category_name} · `}
              Qty: {c.quantity}
              {c.component_serial && ` · S/N: ${c.component_serial}`}
            </div>
          </div>
          {c.installed_by_name && (
            <div style={{ fontSize: 10, color: T.muted, flexShrink: 0 }}>by {c.installed_by_name}</div>
          )}
        </div>
      ))}
    </div>
  )
}

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
      <Section title="Installed Components">
        <InstalledComponents asset={asset} />
      </Section>
    </div>
  )
}

// ── Tab: Software ────────────────────────────────────────────────────────────
function TabSoftware({ asset, pendingUpdatesRef }) {
  const [search, setSearch]         = useState('')
  const [updatesOpen, setUpdatesOpen] = useState(true)
  const sw = asset.installed_software

  const updateCount  = parseInt(asset.pending_updates) || 0
  const updateList   = Array.isArray(asset.pending_updates_detail) ? asset.pending_updates_detail : []
  const updateColor  = updateCount === 0 ? T.green : updateCount <= 5 ? '#b45309' : T.red
  const updateBg     = updateCount === 0 ? '#f0fdf4' : updateCount <= 5 ? '#fefce8' : '#fef2f2'
  const updateBorder = updateCount === 0 ? '#86efac' : updateCount <= 5 ? '#fcd34d' : '#fca5a5'

  const lastScan = asset.last_seen

  return (
    <div>
      {/* ── Pending updates section ── */}
      <div ref={pendingUpdatesRef} style={{ marginBottom: 18, background: updateBg, border: `1px solid ${updateBorder}`, borderRadius: 10, overflow: 'hidden' }}>
        <button
          onClick={() => setUpdatesOpen(o => !o)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.font }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: updateColor }}>{updateCount}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: updateColor }}>
                {updateCount === 0 ? 'Up to date' : `${updateCount} pending update${updateCount !== 1 ? 's' : ''}`}
              </div>
              {lastScan && (
                <div style={{ fontSize: 10, color: T.muted }}>Last scan {fmtAgo(Date.now() - new Date(lastScan).getTime())}</div>
              )}
            </div>
          </div>
          <span style={{ fontSize: 12, color: T.muted }}>{updatesOpen ? '▲' : '▼'}</span>
        </button>
        {updatesOpen && updateList.length > 0 && (
          <div style={{ borderTop: `1px solid ${updateBorder}`, maxHeight: 220, overflowY: 'auto' }}>
            {updateList.map((u, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 14px', borderBottom: i < updateList.length - 1 ? `1px solid ${updateBorder}` : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: 12, color: T.text, flex: 1, paddingRight: 8 }}>{u.title}</div>
                {u.kb && <div style={{ fontSize: 10, fontFamily: 'monospace', color: T.muted, flexShrink: 0 }}>{u.kb}</div>}
              </div>
            ))}
          </div>
        )}
        {updatesOpen && updateList.length === 0 && updateCount > 0 && (
          <div style={{ padding: '8px 14px', borderTop: `1px solid ${updateBorder}`, fontSize: 12, color: T.muted }}>Update names will appear on next agent scan.</div>
        )}
      </div>

      {/* ── Installed software ── */}
      {(!sw || !Array.isArray(sw) || sw.length === 0) ? (
        <div style={{ color: T.muted, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No software data yet. Agent will report on next 60-min scan.</div>
      ) : (
        <>
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
            {(search ? sw.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.publisher?.toLowerCase().includes(search.toLowerCase())) : sw).map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: i % 2 === 0 ? '#f8f9fa' : T.card, borderRadius: 4 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{s.name}</div>
                  {s.publisher && <div style={{ fontSize: 10, color: T.muted }}>{s.publisher}</div>}
                </div>
                {s.version && <div style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace', alignSelf: 'center', marginLeft: 8, whiteSpace: 'nowrap' }}>{s.version}</div>}
              </div>
            ))}
            {search && sw.filter(s => s.name?.toLowerCase().includes(search.toLowerCase())).length === 0 && (
              <div style={{ color: T.muted, fontSize: 12, padding: 20, textAlign: 'center' }}>No results</div>
            )}
          </div>
        </>
      )}
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
  asset, onClose, onEdit, onConnect, onRetire, onCheckout, onCheckin, onClone, onAudit, onRename, onQR, isAdmin, onAssetUpdate, initialTab
}) {
  const [tab, setTab]                   = useState(initialTab || 'Overview')
  const [cmdLoading, setCmdLoading]     = useState(false)
  const [cmdMsg, setCmdMsg]             = useState(null)
  const [winUpdateCmdId, setWinUpdateCmdId] = useState(null)
  const [winUpdateConfirm, setWinUpdateConfirm] = useState(false)
  const pendingUpdatesRef               = useRef(null)

  // Sync tab when asset or initialTab changes (e.g. badge click opens different asset)
  useEffect(() => {
    setTab(initialTab || 'Overview')
  }, [asset?.id, initialTab])

  // Clear winUpdate pending state when SSE reports completion
  useEffect(() => {
    if (winUpdateCmdId && asset?.last_command_status?.id === winUpdateCmdId) {
      setWinUpdateCmdId(null)
    }
  }, [asset?.last_command_status, winUpdateCmdId])

  // Scroll to pending updates when Software tab opens via badge click
  useEffect(() => {
    if (tab === 'Software' && pendingUpdatesRef.current) {
      setTimeout(() => pendingUpdatesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }, [tab])

  const { hasPermission } = usePermission()

  if (!asset) return null

  const on = isOnline(asset)

  const sendCmd = async (command, payload = {}) => {
    setCmdLoading(true)
    setCmdMsg(null)
    try {
      const res = await api.sendAssetCommand(asset.id, command, payload)
      setCmdMsg({ ok: true, text: res.message || 'Command queued.' })
      return res
    } catch (e) {
      setCmdMsg({ ok: false, text: e.message })
    } finally {
      setCmdLoading(false)
      setTimeout(() => setCmdMsg(null), 4000)
    }
  }

  const handleRunWindowsUpdate = async () => {
    setWinUpdateConfirm(false)
    try {
      const res = await api.sendAssetCommand(asset.id, 'windows_update', {
        command: 'Install-Module PSWindowsUpdate -Force -Scope CurrentUser; Get-WindowsUpdate -Install -AcceptAll -AutoReboot',
      })
      if (res?.id) setWinUpdateCmdId(res.id)
      setCmdMsg({ ok: true, text: 'Windows Update command queued. Device will install updates and may reboot.' })
      setTimeout(() => setCmdMsg(null), 6000)
    } catch (e) {
      setCmdMsg({ ok: false, text: e.message })
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
      case 'Overview': return <TabOverview asset={asset} isAdmin={isAdmin} onAssetUpdate={onAssetUpdate} />
      case 'Hardware': return <TabHardware asset={asset} />
      case 'Software': return <TabSoftware asset={asset} pendingUpdatesRef={pendingUpdatesRef} />
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
      width: 'min(540px, 100vw)', background: T.card,
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
        {hasPermission('assets', 'edit') && <ActionBtn label="Edit" onClick={onEdit} />}
        {hasPermission('assets', 'checkout') && (
          !asset.checked_out_to
            ? <ActionBtn label="Check Out" onClick={onCheckout} color={T.blue} />
            : <ActionBtn label="Check In" onClick={onCheckin} color={T.navy} />
        )}
        <ActionBtn label="Clone" onClick={onClone} />
        {hasPermission('assets', 'audit') && <ActionBtn label="Audit" onClick={onAudit} />}
        <ActionBtn label="QR Tag" onClick={onQR} />
        {isAdmin && asset.rustdesk_id && (
          <ActionBtn label="Connect" onClick={() => onConnect(asset)} color={T.navy} />
        )}
        {isAdmin && (
          <ActionBtn label="Rename PC" onClick={() => onRename(asset)} title="Send rename command to agent" />
        )}
        {isAdmin && on && (
          <ActionBtn
            label={winUpdateCmdId ? 'Pending…' : 'Run Windows Update'}
            onClick={() => !winUpdateCmdId && setWinUpdateConfirm(true)}
            color={winUpdateCmdId ? T.muted : '#7c3aed'}
            disabled={!!winUpdateCmdId}
            title="Install all pending Windows updates"
          />
        )}
        {asset.snipe_id && (
          <ActionBtn label="Snipe-IT ↗" onClick={() => window.open(`https://snipe.fayait.com/hardware/${asset.snipe_id}`, '_blank')} />
        )}
        {hasPermission('assets', 'delete') && <ActionBtn label="Delete" onClick={onRetire} color={T.red} />}
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

      {/* Windows Update confirmation modal */}
      {winUpdateConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 380, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', fontFamily: T.font }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 10 }}>Run Windows Update</div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 20 }}>
              This will install all pending Windows updates on <strong>{asset.hostname}</strong>. The device may reboot automatically.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setWinUpdateConfirm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, fontSize: 13, cursor: 'pointer', fontFamily: T.font }}>Cancel</button>
              <button onClick={handleRunWindowsUpdate} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}>Run Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
