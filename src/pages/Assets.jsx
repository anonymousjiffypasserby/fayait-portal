import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const ADMIN_ROLES = ['superadmin', 'admin']

const theme = {
  bg: '#f0f2f5',
  card: '#fff',
  navy: '#1a1f2e',
  orange: '#ff6b35',
  green: '#1D9E75',
  red: '#e74c3c',
  yellow: '#f39c12',
  border: 'rgba(0,0,0,0.06)',
  text: '#1a1f2e',
  muted: '#888',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const DeviceIcon = ({ type }) => {
  const icons = { Laptop: '💻', Desktop: '🖥️', Server: '🖧' }
  return <span style={{ fontSize: 24 }}>{icons[type] || '💻'}</span>
}

const StatusDot = ({ online, lastSeen }) => {
  const isRecent = lastSeen && (Date.now() - new Date(lastSeen).getTime()) < 2 * 60 * 60 * 1000
  const color = online && isRecent ? theme.green : theme.red
  const label = online && isRecent ? 'Online' : 'Offline'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: color,
        boxShadow: `0 0 6px ${color}`,
      }} />
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
    </div>
  )
}

const HealthScore = ({ asset }) => {
  let score = 100
  let issues = []
  if (asset.pending_updates && asset.pending_updates !== 'Unknown' && parseInt(asset.pending_updates) > 10) {
    score -= 20
    issues.push(`${asset.pending_updates} pending updates`)
  }
  if (asset.antivirus && asset.antivirus.includes('Disabled')) { score -= 30; issues.push('Antivirus disabled') }
  if (asset.antivirus && asset.antivirus.includes('Outdated')) { score -= 20; issues.push('Antivirus outdated') }
  if (asset.ram_usage > 90) { score -= 15; issues.push('High RAM usage') }
  if (asset.disk_health === 'Critical') { score -= 40; issues.push('Disk health critical') }
  const color = score >= 80 ? theme.green : score >= 60 ? theme.yellow : theme.red
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: `3px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color,
      }}>{score}</div>
      {issues.length > 0 && (
        <div style={{ fontSize: 10, color: theme.muted }}>
          {issues[0]}{issues.length > 1 ? ` +${issues.length - 1}` : ''}
        </div>
      )}
    </div>
  )
}

const UsageBar = ({ value, label, color }) => {
  if (!value) return null
  const pct = parseFloat(value)
  const barColor = pct > 90 ? theme.red : pct > 75 ? theme.yellow : color || theme.green
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: theme.muted }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: barColor }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: '#f0f2f5', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

const InfoRow = ({ label, value, mono }) => {
  if (!value || value === 'Unknown' || value === 'N/A') return null
  return (
    <div style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: `1px solid ${theme.border}` }}>
      <div style={{ fontSize: 11, color: theme.muted, width: 120, flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.5, paddingTop: 1 }}>{label}</div>
      <div style={{ fontSize: 12, color: theme.text, fontFamily: mono ? 'monospace' : theme.font, fontWeight: 500, wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 10, color: theme.muted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 8 }}>{title}</div>
    {children}
  </div>
)

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
  const isAdmin = ADMIN_ROLES.includes(user?.role)

  useEffect(() => {
    api.getAssets()
      .then(data => setAssets(data.rows || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = assets
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.hostname?.toLowerCase().includes(q) ||
        a.assigned_user?.toLowerCase().includes(q) ||
        a.manufacturer?.toLowerCase().includes(q) ||
        a.model?.toLowerCase().includes(q) ||
        a.ip_address?.includes(q)
      )
    }
    if (filter === 'online') list = list.filter(a => a.online)
    if (filter === 'offline') list = list.filter(a => !a.online)
    if (filter === 'issues') list = list.filter(a =>
      (a.pending_updates && parseInt(a.pending_updates) > 10) ||
      a.antivirus?.includes('Disabled') ||
      a.disk_health === 'Critical'
    )
    list = [...list].sort((a, b) => {
      if (sortBy === 'hostname') return (a.hostname || '').localeCompare(b.hostname || '')
      if (sortBy === 'last_seen') return new Date(b.last_seen || 0) - new Date(a.last_seen || 0)
      if (sortBy === 'manufacturer') return (a.manufacturer || '').localeCompare(b.manufacturer || '')
      return 0
    })
    return list
  }, [assets, search, filter, sortBy])

  const handleConnect = (asset) => {
    if (asset.rustdesk_id && asset.rustdesk_password) {
      window.open(`rustdesk://${asset.rustdesk_id}:${asset.rustdesk_password}`, '_self')
    }
  }

  const exportCSV = () => {
    const headers = ['Hostname', 'Manufacturer', 'Model', 'CPU', 'RAM', 'OS', 'IP', 'MAC', 'Assigned To', 'Department', 'Location', 'Antivirus', 'Pending Updates']
    const rows = filtered.map(a => [
      a.hostname, a.manufacturer, a.model, a.cpu, a.ram_gb + ' GB',
      a.os, a.ip_address, a.mac_address, a.assigned_user,
      a.department, a.location, a.antivirus, a.pending_updates
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'assets.csv'
    a.click()
  }

  const onlineCount = assets.filter(a => a.online).length
  const issueCount = assets.filter(a =>
    (a.pending_updates && parseInt(a.pending_updates) > 10) ||
    a.antivirus?.includes('Disabled') || a.disk_health === 'Critical'
  ).length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: theme.muted, fontFamily: theme.font }}>
      Loading assets...
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: theme.bg, fontFamily: theme.font }}>
      {/* Main Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.navy, margin: 0 }}>Assets</h1>
              <p style={{ fontSize: 12, color: theme.muted, margin: '3px 0 0' }}>
                {assets.length} devices · {onlineCount} online · {issueCount > 0 ? <span style={{ color: theme.red }}>{issueCount} need attention</span> : 'all healthy'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={exportCSV} style={{
                background: '#fff', border: `1px solid ${theme.border}`,
                borderRadius: 8, padding: '8px 14px', fontSize: 12,
                color: theme.muted, cursor: 'pointer', fontFamily: theme.font,
              }}>⬇ Export CSV</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${theme.border}` }}>
            {['assets', 'discovered'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? theme.orange : theme.muted,
                background: 'none', border: 'none',
                borderBottom: tab === t ? `2px solid ${theme.orange}` : '2px solid transparent',
                cursor: 'pointer', fontFamily: theme.font, textTransform: 'capitalize',
              }}>{t === 'assets' ? `Registered (${assets.length})` : 'Discovered (0)'}</button>
            ))}
          </div>
        </div>

        {tab === 'discovered' ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: theme.muted }}>
            <div style={{ fontSize: 40 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.navy }}>No discovered devices yet</div>
            <div style={{ fontSize: 13, maxWidth: 320, textAlign: 'center' }}>
              Enable network discovery on an installed device to start scanning your network for unregistered devices.
            </div>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div style={{ padding: '12px 24px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search hostname, user, IP..."
                style={{
                  flex: 1, padding: '8px 14px', borderRadius: 8,
                  border: `1px solid ${theme.border}`, fontSize: 13,
                  outline: 'none', background: '#fff', fontFamily: theme.font,
                }}
              />
              <select value={filter} onChange={e => setFilter(e.target.value)} style={{
                padding: '8px 12px', borderRadius: 8, border: `1px solid ${theme.border}`,
                fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: theme.font,
              }}>
                <option value="all">All devices</option>
                <option value="online">Online only</option>
                <option value="offline">Offline only</option>
                <option value="issues">Has issues</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
                padding: '8px 12px', borderRadius: 8, border: `1px solid ${theme.border}`,
                fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: theme.font,
              }}>
                <option value="hostname">Sort: Name</option>
                <option value="last_seen">Sort: Last seen</option>
                <option value="manufacturer">Sort: Brand</option>
              </select>
            </div>

            {/* Asset List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
              {filtered.length === 0 ? (
                <div style={{
                  background: '#fff', borderRadius: 12, padding: '48px 24px',
                  textAlign: 'center', border: `1px solid ${theme.border}`,
                }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💻</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: theme.navy, marginBottom: 8 }}>No assets found</div>
                  <div style={{ fontSize: 13, color: theme.muted }}>
                    {isAdmin ? 'Download and run the installer on client devices to register them.' : 'No devices registered yet.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filtered.map(asset => (
                    <div
                      key={asset.id}
                      onClick={() => setSelected(selected?.id === asset.id ? null : asset)}
                      style={{
                        background: '#fff',
                        borderRadius: 12,
                        padding: '14px 18px',
                        border: `1px solid ${selected?.id === asset.id ? theme.orange : theme.border}`,
                        boxShadow: selected?.id === asset.id ? `0 0 0 1px ${theme.orange}` : '0 1px 3px rgba(0,0,0,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        cursor: 'pointer',
                        transition: 'border-color 0.15s',
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: '#f7f8fa', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <DeviceIcon type={asset.asset_type} />
                      </div>

                      {/* Main info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: theme.navy }}>{asset.hostname || 'Unknown'}</span>
                          <StatusDot online={asset.online} lastSeen={asset.last_seen} />
                        </div>
                        <div style={{ fontSize: 12, color: theme.muted }}>
                          {[asset.manufacturer, asset.model].filter(Boolean).join(' ')} · {asset.cpu?.split('@')[0]?.trim() || '—'} · {asset.ram_gb ? `${asset.ram_gb}GB RAM` : '—'}
                        </div>
                      </div>

                      {/* User */}
                      <div style={{ fontSize: 12, color: theme.muted, minWidth: 100, textAlign: 'center' }}>
                        {asset.assigned_user || 'Unassigned'}
                        {asset.department && <div style={{ fontSize: 10, color: '#aaa' }}>{asset.department}</div>}
                      </div>

                      {/* Health */}
                      <div style={{ minWidth: 80 }}>
                        <HealthScore asset={asset} />
                      </div>

                      {/* RAM usage */}
                      {asset.ram_usage && (
                        <div style={{ minWidth: 80 }}>
                          <div style={{ fontSize: 10, color: theme.muted, marginBottom: 3 }}>RAM</div>
                          <div style={{ height: 4, background: '#f0f2f5', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(parseFloat(asset.ram_usage), 100)}%`,
                              height: '100%',
                              background: parseFloat(asset.ram_usage) > 90 ? theme.red : theme.green,
                              borderRadius: 2,
                            }} />
                          </div>
                          <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>{parseFloat(asset.ram_usage).toFixed(0)}%</div>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {isAdmin && asset.rustdesk_id && (
                          <button
                            onClick={e => { e.stopPropagation(); handleConnect(asset) }}
                            style={{
                              background: theme.orange, color: '#fff',
                              border: 'none', borderRadius: 7,
                              padding: '6px 12px', fontSize: 11,
                              fontWeight: 600, cursor: 'pointer',
                              fontFamily: theme.font,
                            }}
                          >
                            🖥 Connect
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div style={{
          width: 360, background: '#fff',
          borderLeft: `1px solid ${theme.border}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Detail Header */}
          <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#f7f8fa', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <DeviceIcon type={selected.asset_type} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: theme.navy }}>{selected.hostname}</div>
                  <StatusDot online={selected.online} lastSeen={selected.last_seen} />
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{
                background: 'none', border: 'none', fontSize: 18,
                cursor: 'pointer', color: theme.muted, padding: 0,
              }}>✕</button>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              {isAdmin && selected.rustdesk_id && (
                <button onClick={() => handleConnect(selected)} style={{
                  flex: 1, background: theme.orange, color: '#fff',
                  border: 'none', borderRadius: 8, padding: '9px 0',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: theme.font,
                }}>🖥 Remote Connect</button>
              )}
              <button style={{
                flex: 1, background: '#f7f8fa', color: theme.navy,
                border: `1px solid ${theme.border}`, borderRadius: 8,
                padding: '9px 0', fontSize: 12, fontWeight: 500,
                cursor: 'pointer', fontFamily: theme.font,
              }}>🎫 Create Ticket</button>
            </div>
          </div>

          {/* Detail Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {/* Health */}
            <Section title="Health">
              <div style={{ padding: '10px 14px', background: '#f7f8fa', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: selected.disk_usage ? 10 : 0 }}>
                  <HealthScore asset={selected} />
                  <div style={{ flex: 1 }}>
                    <UsageBar value={selected.ram_usage} label="RAM Usage" />
                    <UsageBar value={selected.cpu_usage} label="CPU Usage" color={theme.orange} />
                  </div>
                </div>
                {selected.disk_usage && typeof selected.disk_usage === 'object' && Object.keys(selected.disk_usage).length > 0 && (
                  <div>
                    {Object.entries(selected.disk_usage).map(([drive, pct]) => (
                      <UsageBar key={drive} value={pct} label={`Disk ${drive}`} color={theme.navy} />
                    ))}
                  </div>
                )}
              </div>
              {selected.disk_health && selected.disk_health !== 'OK' && (
                <div style={{ marginTop: 6, padding: '6px 10px', background: '#fff3cd', borderRadius: 6, fontSize: 12, color: '#856404', fontWeight: 600 }}>
                  ⚠ Disk health: {selected.disk_health}
                </div>
              )}
            </Section>

            {/* Hardware */}
            <Section title="Hardware">
              <InfoRow label="Manufacturer" value={selected.manufacturer} />
              <InfoRow label="Model" value={selected.model} />
              <InfoRow label="CPU" value={selected.cpu} />
              <InfoRow label="CPU Cores" value={selected.cpu_cores} />
              <InfoRow label="RAM" value={selected.ram_gb ? `${selected.ram_gb} GB` : null} />
              <InfoRow label="Storage" value={selected.disk_gb ? `${selected.disk_gb} GB` : null} />
              <InfoRow label="Drives" value={selected.disks_detail} />
              <InfoRow label="GPU" value={selected.gpu} />
              <InfoRow label="Monitors" value={selected.monitors} />
              <InfoRow label="Resolution" value={selected.resolution} />
              <InfoRow label="Serial" value={selected.serial} mono />
            </Section>

            {/* System */}
            <Section title="System">
              <InfoRow label="OS" value={selected.os} />
              <InfoRow label="Antivirus" value={selected.antivirus} />
              <InfoRow label="Disk Health" value={selected.disk_health && selected.disk_health !== 'OK' ? selected.disk_health : selected.disk_health === 'OK' ? 'Good' : null} />
              <InfoRow label="Pending Updates" value={selected.pending_updates && selected.pending_updates !== 'Unknown' ? `${selected.pending_updates} updates` : null} />
              <InfoRow label="Last Update" value={selected.last_update} />
              <InfoRow label="Battery" value={selected.battery_status !== 'N/A' ? selected.battery_status : null} />
              <InfoRow label="Battery Health" value={selected.battery_health !== 'N/A' ? selected.battery_health : null} />
            </Section>

            {/* Network */}
            <Section title="Network">
              <InfoRow label="IP Address" value={selected.ip_address} mono />
              <InfoRow label="MAC Address" value={selected.mac_address} mono />
              <InfoRow label="Connection" value={selected.network_type} />
            </Section>

            {/* Assignment */}
            <Section title="Assignment">
              <InfoRow label="Assigned To" value={selected.assigned_user} />
              <InfoRow label="Department" value={selected.department} />
              <InfoRow label="Location" value={selected.location} />
              <InfoRow label="Asset Type" value={selected.asset_type} />
            </Section>

            {/* USB Devices */}
            {selected.usb_devices && selected.usb_devices !== 'Unknown' && (
              <Section title="Connected USB Devices">
                <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.8 }}>
                  {selected.usb_devices.split(', ').map((device, i) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: `1px solid ${theme.border}` }}>
                      🔌 {device}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Admin only */}
            {isAdmin && (
              <Section title="Remote Access">
                <InfoRow label="RustDesk ID" value={selected.rustdesk_id} mono />
                <InfoRow label="Agent Token" value={selected.agent_token ? selected.agent_token.substring(0, 16) + '...' : null} mono />
                <InfoRow label="Last Check-in" value={selected.last_seen ? new Date(selected.last_seen).toLocaleString() : null} />
                <InfoRow label="Network Discovery" value={selected.network_discovery ? 'Enabled' : 'Disabled'} />
              </Section>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
