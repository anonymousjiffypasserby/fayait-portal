// Shared primitives for all Settings tabs
import { useState } from 'react'
import api from '../../services/api'

export function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, width, maxWidth: '90vw',
          maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{title}</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20,
            color: '#9ca3af', cursor: 'pointer', lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
      </div>
    </div>
  )
}

export function ConfirmModal({ message, onConfirm, onCancel, error }) {
  return (
    <Modal title="Confirm Delete" onClose={onCancel} width={400}>
      <p style={{ fontSize: 13, color: '#374151', margin: '0 0 16px' }}>{message}</p>
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6,
          padding: '8px 12px', fontSize: 12, color: '#b91c1c', marginBottom: 16,
        }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={btnStyle('ghost')}>Cancel</button>
        <button onClick={onConfirm} style={btnStyle('danger')}>Delete</button>
      </div>
    </Modal>
  )
}

export function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

export const inputStyle = {
  width: '100%', padding: '7px 10px', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: 13, color: '#111', background: '#fff',
  boxSizing: 'border-box', outline: 'none',
}

export const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
}

export function btnStyle(variant = 'primary') {
  const base = {
    padding: '7px 16px', border: 'none', borderRadius: 6,
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
  }
  if (variant === 'primary') return { ...base, background: '#ff6b35', color: '#fff' }
  if (variant === 'danger')  return { ...base, background: '#ef4444', color: '#fff' }
  if (variant === 'ghost')   return { ...base, background: '#f3f4f6', color: '#374151' }
  if (variant === 'icon')    return { ...base, padding: '4px 8px', background: 'transparent', color: '#9ca3af', fontSize: 14 }
  return base
}

export function PageHeader({ title, onAdd, addLabel }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '24px 28px 16px',
    }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>{title}</h2>
      <button onClick={onAdd} style={btnStyle('primary')}>{addLabel}</button>
    </div>
  )
}

export function Table({ columns, children, empty }) {
  return (
    <div style={{ padding: '0 28px 28px', overflowX: 'auto' }}>
      <div style={{
        background: '#fff', borderRadius: 10,
        border: '1px solid #e5e7eb', overflow: 'hidden',
        minWidth: 400,
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {columns.map(col => (
                <th key={col} style={{
                  padding: '10px 16px', textAlign: 'left',
                  fontSize: 11, fontWeight: 600, color: '#6b7280',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  whiteSpace: 'nowrap',
                }}>{col}</th>
              ))}
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
        {empty && (
          <div style={{
            padding: '40px 0', textAlign: 'center',
            fontSize: 13, color: '#9ca3af',
          }}>{empty}</div>
        )}
      </div>
    </div>
  )
}

export function Td({ children, muted }) {
  return (
    <td style={{
      padding: '10px 16px', fontSize: 13,
      color: muted ? '#9ca3af' : '#374151',
      borderBottom: '1px solid #f3f4f6',
    }}>{children}</td>
  )
}

export function ActionCell({ onEdit, onDelete }) {
  return (
    <td style={{
      padding: '6px 12px', textAlign: 'right',
      borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap',
    }}>
      <button onClick={onEdit} title="Edit" style={btnStyle('icon')}>✏️</button>
      <button onClick={onDelete} title="Delete" style={btnStyle('icon')}>🗑️</button>
    </td>
  )
}

// ── SyncBadge ─────────────────────────────────────────────────────────────────

function syncSummary(status = {}) {
  const vals = Object.values(status)
  if (!vals.length) return 'pending'
  if (vals.every(v => v === 'ok')) return 'ok'
  if (vals.some(v => v === 'ok')) return 'partial'
  return 'failed'
}

const BADGE = {
  ok:      { label: '✅ Synced',  bg: '#f0fdf4', border: '#86efac', color: '#15803d' },
  partial: { label: '⚠️ Partial', bg: '#fffbeb', border: '#fcd34d', color: '#92400e' },
  failed:  { label: '❌ Failed',  bg: '#fef2f2', border: '#fca5a5', color: '#b91c1c' },
  pending: { label: '⏳ Pending', bg: '#f9fafb', border: '#e5e7eb', color: '#6b7280' },
}

export function SyncBadge({ syncStatus, entity, id, onRetried }) {
  const [open, setOpen]       = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [err, setErr]         = useState(null)
  const state = syncSummary(syncStatus)
  const badge = BADGE[state]

  const handleRetry = async (e) => {
    e.stopPropagation()
    setRetrying(true)
    setErr(null)
    try {
      const updated = await api.retrySyncEntity(entity, id)
      onRetried?.(updated)
      setOpen(false)
    } catch (e) {
      setErr(e.message)
    } finally {
      setRetrying(false)
    }
  }

  const services = Object.entries(syncStatus || {})

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => (state === 'pending' ? null : setOpen(o => !o))}
        style={{
          padding: '2px 8px', fontSize: 11, fontWeight: 500, borderRadius: 12,
          border: `1px solid ${badge.border}`, background: badge.bg, color: badge.color,
          cursor: state === 'pending' ? 'default' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {badge.label}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={{
            position: 'absolute', top: '110%', right: 0, zIndex: 100,
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '12px 14px',
            minWidth: 180,
          }}>
            {services.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9ca3af' }}>No sync data yet</div>
            ) : services.map(([svc, st]) => (
              <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: st === 'ok' ? '#16a34a' : '#dc2626', fontSize: 14 }}>
                  {st === 'ok' ? '✅' : '❌'}
                </span>
                <span style={{ color: '#374151', textTransform: 'capitalize' }}>{svc}</span>
                <span style={{ color: '#9ca3af' }}>{st}</span>
              </div>
            ))}
            {(state === 'failed' || state === 'partial') && (
              <>
                {err && <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 6 }}>{err}</div>}
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  style={{
                    marginTop: 4, width: '100%', padding: '5px 0', fontSize: 12,
                    borderRadius: 6, border: '1px solid #d1d5db',
                    background: retrying ? '#f3f4f6' : '#fff', cursor: retrying ? 'default' : 'pointer',
                    color: '#374151',
                  }}
                >
                  {retrying ? 'Retrying…' : 'Retry sync'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function LoadingRow({ cols }) {
  return (
    <tr>
      <td colSpan={cols + 1} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
        Loading…
      </td>
    </tr>
  )
}

export function ErrorRow({ cols, message }) {
  return (
    <tr>
      <td colSpan={cols + 1} style={{ padding: '24px 16px', textAlign: 'center', color: '#ef4444', fontSize: 13 }}>
        {message}
      </td>
    </tr>
  )
}
