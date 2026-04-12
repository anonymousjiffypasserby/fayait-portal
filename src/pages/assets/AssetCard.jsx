import { T, fmtAgo, healthScore, isOnline } from './shared'

const RamBar = ({ value, label }) => {
  if (value === null || value === undefined) return null
  const pct = parseFloat(value)
  if (isNaN(pct)) return null
  const c = pct > 90 ? T.red : pct > 75 ? T.yellow : T.green
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: T.muted }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: c }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ height: 3, background: '#f0f2f5', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: c, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

export default function AssetCard({ asset, selected, onSelect, onOpen, onConnect, isAdmin }) {
  const on = isOnline(asset)
  const { score } = healthScore(asset)
  const healthColor = score >= 80 ? T.green : score >= 60 ? T.yellow : T.red
  const ms = asset.last_seen ? Date.now() - new Date(asset.last_seen).getTime() : null
  const icons = { Laptop: '💻', Desktop: '🖥️', Server: '🖧' }
  const icon = icons[asset.asset_type] || '💻'

  return (
    <div
      onClick={() => onOpen(asset)}
      style={{
        background: T.card,
        border: `2px solid ${selected ? T.blue : T.border}`,
        borderRadius: 12,
        padding: 16,
        cursor: 'pointer',
        position: 'relative',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        boxShadow: selected ? `0 0 0 2px ${T.blue}22` : '0 1px 4px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = selected ? `0 0 0 2px ${T.blue}22` : '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* Checkbox */}
      <div style={{ position: 'absolute', top: 12, left: 12 }} onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={e => onSelect(asset.id, e.target.checked)} />
      </div>

      {/* Health score */}
      <div style={{ position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: '50%', border: `3px solid ${healthColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: healthColor }}>
        {score}
      </div>

      {/* Icon + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingLeft: 24, paddingRight: 40, marginTop: 4 }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.text, lineHeight: 1.2 }}>{asset.hostname}</div>
          {asset.model && <div style={{ fontSize: 10, color: T.muted }}>{asset.model}</div>}
        </div>
      </div>

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: on ? T.green : T.red, boxShadow: `0 0 5px ${on ? T.green : T.red}` }} />
        <span style={{ fontSize: 11, color: on ? T.green : T.red, fontWeight: 600 }}>{on ? 'Online' : 'Offline'}</span>
        {!on && ms !== null && <span style={{ fontSize: 10, color: T.muted }}>({fmtAgo(ms)})</span>}
        {asset.asset_tag && <span style={{ fontSize: 10, color: T.muted, fontFamily: 'monospace', marginLeft: 4 }}>{asset.asset_tag}</span>}
      </div>

      {/* RAM / CPU bars */}
      <RamBar value={asset.ram_percent} label="RAM" />
      <RamBar value={asset.cpu_percent} label="CPU" />

      {/* Info */}
      <div style={{ fontSize: 11, color: T.muted, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {asset.assigned_user && <span>👤 {asset.assigned_user}</span>}
        {asset.location && <span>📍 {asset.location}</span>}
        {asset.os && <span>💿 {asset.os}</span>}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onOpen(asset)}
          style={{ flex: 1, fontSize: 11, padding: '5px 0', borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.blue, fontWeight: 600 }}
        >
          Details
        </button>
        {isAdmin && asset.rustdesk_id && (
          <button
            onClick={() => onConnect(asset)}
            style={{ flex: 1, fontSize: 11, padding: '5px 0', borderRadius: 7, border: 'none', background: T.navy, cursor: 'pointer', color: '#fff', fontWeight: 600 }}
          >
            Connect
          </button>
        )}
      </div>
    </div>
  )
}
