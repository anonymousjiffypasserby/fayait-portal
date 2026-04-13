import { T } from './shared'

export default function BulkBar({ count, onClear, onAssign, onLocation, onStatus, onExport, onDelete, onAudit }) {
  if (count === 0) return null

  const btn = (label, onClick, danger = false, accent = false) => (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        padding: '6px 14px',
        borderRadius: 7,
        border: `1px solid ${danger ? T.red : accent ? T.blue : T.border}`,
        background: danger ? T.red : accent ? T.blue : T.card,
        color: danger || accent ? '#fff' : T.text,
        cursor: 'pointer',
        fontWeight: 600,
        fontFamily: T.font,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      background: T.navy,
      color: '#fff',
      borderRadius: 14,
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      zIndex: 1000,
      fontFamily: T.font,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginRight: 4 }}>
        {count} selected
      </span>
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)' }} />
      {btn('Assign User', onAssign)}
      {btn('Update Location', onLocation)}
      {btn('Update Status', onStatus, false, true)}
      {btn('Audit All', onAudit)}
      {btn('Export', onExport)}
      {btn('Delete Selected', onDelete, true)}
      <button
        onClick={onClear}
        style={{ fontSize: 18, lineHeight: 1, background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '0 4px', marginLeft: 4 }}
      >
        ×
      </button>
    </div>
  )
}
