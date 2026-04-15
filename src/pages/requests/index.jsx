import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { T, STATUS_COLORS, ITEM_TYPE_ICONS, fmtDate, fmtDateTime } from './shared'
import api from '../../services/api'

const ADMIN_ROLES = ['superadmin', 'admin']

const StatusBadge = ({ status }) => {
  const color = STATUS_COLORS[status] || T.muted
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
      background: color + '18', color, border: `1px solid ${color}30`,
    }}>
      {status}
    </span>
  )
}

export default function Requests() {
  const { user } = useAuth()
  const isAdmin  = ADMIN_ROLES.includes(user?.role)
  const [tab,      setTab]      = useState('pending')
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getRequests()
      setRequests(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const displayed = tab === 'pending'
    ? requests.filter(r => r.status === 'Pending')
    : requests

  const pendingCount = requests.filter(r => r.status === 'Pending').length

  return (
    <div style={{ background: T.bg, minHeight: '100vh', fontFamily: T.font }}>
      {/* Header */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '16px 24px' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.navy }}>
          {isAdmin ? 'Item Requests' : 'My Requests'}
        </h1>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
          {isAdmin
            ? 'Review and action requests from your team'
            : 'Track your pending and past requests'}
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
          {['pending', 'all'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '9px 20px', fontSize: 13, fontWeight: tab === t ? 700 : 400,
              color: tab === t ? T.navy : T.muted, background: 'none', border: 'none',
              borderBottom: tab === t ? `2px solid ${T.navy}` : '2px solid transparent',
              cursor: 'pointer', fontFamily: T.font, marginBottom: -1, textTransform: 'capitalize',
            }}>
              {t === 'pending' ? 'Pending' : 'All'}
              {t === 'pending' && pendingCount > 0 && (
                <span style={{ marginLeft: 6, fontSize: 10, background: T.orange, color: '#fff', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={load} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', marginBottom: 4, color: T.text }}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>Loading…</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.red }}>{error}</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 14 }}>
              {tab === 'pending' ? 'No pending requests' : 'No requests yet'}
            </div>
          </div>
        ) : isAdmin ? (
          <AdminTable requests={displayed} onApprove={handleApprove} onDeny={handleDeny} />
        ) : (
          <UserList requests={displayed} onCancel={handleCancel} />
        )}
      </div>
    </div>
  )

  async function handleApprove(id, reviewNote) {
    try {
      const updated = await api.approveRequest(id, { review_note: reviewNote || null })
      setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r))
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleDeny(id, reviewNote) {
    try {
      const updated = await api.denyRequest(id, { review_note: reviewNote || null })
      setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r))
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleCancel(id) {
    if (!window.confirm('Cancel this request?')) return
    try {
      await api.cancelRequest(id)
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Cancelled' } : r))
    } catch (e) {
      alert(e.message)
    }
  }
}

// ── Admin table ───────────────────────────────────────────────────────────────
function AdminTable({ requests, onApprove, onDeny }) {
  const [notes, setNotes] = useState({}) // { [id]: string }
  const [acting, setActing] = useState(null)

  const act = async (fn, id) => {
    setActing(id)
    await fn(id, notes[id] || '')
    setActing(null)
  }

  const Th = ({ children }) => (
    <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: `1px solid ${T.border}`, background: '#fafbfc', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  )

  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.font }}>
        <thead>
          <tr>
            <Th>Requested By</Th>
            <Th>Item</Th>
            <Th>Qty</Th>
            <Th>Reason</Th>
            <Th>Date</Th>
            <Th>Status</Th>
            <Th>Review Note</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r, i) => {
            const isPending = r.status === 'Pending'
            return (
              <tr key={r.id} style={{ background: i % 2 === 0 ? T.card : '#fafbfc', borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{r.user_name}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{r.user_email}</div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 16 }}>{ITEM_TYPE_ICONS[r.item_type]}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{r.item_name || r.item_id}</div>
                      <div style={{ fontSize: 10, color: T.muted, textTransform: 'capitalize' }}>{r.item_type}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: T.text }}>{r.quantity}</td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: T.muted, maxWidth: 200 }}>
                  {r.reason || <span style={{ color: T.border }}>—</span>}
                </td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: T.muted, whiteSpace: 'nowrap' }}>
                  {fmtDate(r.created_at)}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <StatusBadge status={r.status} />
                  {r.reviewed_by_name && (
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>by {r.reviewed_by_name}</div>
                  )}
                </td>
                <td style={{ padding: '12px 14px', minWidth: 180 }}>
                  {isPending ? (
                    <input
                      placeholder="Optional note…"
                      value={notes[r.id] || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: T.font, outline: 'none', boxSizing: 'border-box' }}
                    />
                  ) : (
                    <span style={{ fontSize: 12, color: T.muted }}>{r.review_note || '—'}</span>
                  )}
                </td>
                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                  {isPending ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => act(onApprove, r.id)}
                        disabled={acting === r.id}
                        style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: 'none', background: T.green, color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: T.font, opacity: acting === r.id ? 0.6 : 1 }}
                      >
                        {acting === r.id ? '…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => act(onDeny, r.id)}
                        disabled={acting === r.id}
                        style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: `1px solid ${T.red}30`, background: '#fdecea', color: T.red, cursor: 'pointer', fontWeight: 700, fontFamily: T.font, opacity: acting === r.id ? 0.6 : 1 }}
                      >
                        Deny
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: T.muted }}>{fmtDateTime(r.reviewed_at)}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── User list ─────────────────────────────────────────────────────────────────
function UserList({ requests, onCancel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {requests.map(r => {
        const isPending = r.status === 'Pending'
        const statusColor = STATUS_COLORS[r.status] || T.muted
        return (
          <div key={r.id} style={{
            background: T.card, borderRadius: 12, padding: '14px 18px',
            border: `1px solid ${T.border}`, borderLeft: `4px solid ${statusColor}`,
            display: 'flex', alignItems: 'flex-start', gap: 16,
          }}>
            <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{ITEM_TYPE_ICONS[r.item_type]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{r.item_name || r.item_id}</span>
                <StatusBadge status={r.status} />
              </div>
              <div style={{ fontSize: 12, color: T.muted }}>
                {r.item_type} · Qty: {r.quantity} · Requested {fmtDate(r.created_at)}
              </div>
              {r.reason && (
                <div style={{ fontSize: 12, color: T.text, marginTop: 6, fontStyle: 'italic' }}>"{r.reason}"</div>
              )}
              {(r.review_note || r.reviewed_by_name) && (
                <div style={{ fontSize: 11, color: T.muted, marginTop: 6, padding: '6px 10px', background: '#f8f9fa', borderRadius: 6 }}>
                  {r.reviewed_by_name && <span style={{ fontWeight: 600 }}>{r.reviewed_by_name}: </span>}
                  {r.review_note || 'No note'}
                </div>
              )}
            </div>
            {isPending && (
              <button
                onClick={() => onCancel(r.id)}
                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.muted, flexShrink: 0, fontFamily: T.font }}
              >
                Cancel
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
