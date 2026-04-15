import { useState, useEffect } from 'react'
import { T } from './shared'
import api from '../../services/api'

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`,
  fontSize: 13, boxSizing: 'border-box', fontFamily: T.font, outline: 'none', background: T.card, color: T.text,
}
const selectStyle = { ...inputStyle, cursor: 'pointer' }

function Modal({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 14, padding: 24, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: T.font, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>{title}</h3>
          <button onClick={onClose} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: T.muted }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function BulkCheckout({ assets, onCheckout }) {
  const ready = assets.filter(a => a.status === 'Ready to Deploy' && !a.checked_out_to && !a.retired)

  const [selected, setSelected]   = useState(new Set())
  const [showModal, setShowModal] = useState(false)
  const [users, setUsers]         = useState([])
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState({
    assigned_to: '', location: '',
    checkout_date: new Date().toISOString().slice(0, 10),
    expected_checkin_date: '', note: '',
  })
  const [progress, setProgress] = useState(null) // { done, total }
  const [result, setResult]     = useState(null)  // { succeeded, failed }
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    api.getUsers().then(d => setUsers(Array.isArray(d) ? d : [])).catch(() => {})
    api.getLocations().then(d => setLocations(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = (checked) => setSelected(checked ? new Set(ready.map(a => a.id)) : new Set())

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCheckout = async () => {
    if (!form.assigned_to) return
    setSaving(true)
    const ids = [...selected]
    let succeeded = 0, failed = 0
    setProgress({ done: 0, total: ids.length })

    await Promise.all(ids.map(async (id) => {
      try {
        await api.checkoutAsset(id, {
          checkout_type: 'user',
          assigned_to: form.assigned_to,
          location: form.location || undefined,
          checkout_date: form.checkout_date || undefined,
          expected_checkin_date: form.expected_checkin_date || undefined,
          note: form.note || undefined,
        })
        succeeded++
        if (onCheckout) onCheckout(id, form.assigned_to)
      } catch {
        failed++
      } finally {
        setProgress(p => ({ done: p.done + 1, total: p.total }))
      }
    }))

    setResult({ succeeded, failed })
    setSaving(false)
    setProgress(null)
    setShowModal(false)
    setSelected(new Set())
  }

  const Label = ({ text }) => (
    <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{text}</label>
  )

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.navy }}>Bulk Checkout</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>
            {ready.length} asset{ready.length !== 1 ? 's' : ''} ready to deploy
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={selected.size === 0}
          style={{
            padding: '9px 16px', borderRadius: 9, border: 'none',
            background: selected.size > 0 ? T.navy : '#ccc',
            color: '#fff', fontWeight: 700, fontSize: 13,
            cursor: selected.size > 0 ? 'pointer' : 'not-allowed', fontFamily: T.font,
          }}
        >
          Checkout Selected ({selected.size})
        </button>
      </div>

      {result && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 10,
          background: result.failed === 0 ? '#e8f5e9' : '#fff3e0',
          color: result.failed === 0 ? '#2e7d32' : '#e65100',
          fontSize: 13, fontWeight: 600,
          border: `1px solid ${result.failed === 0 ? '#a5d6a7' : '#ffcc80'}`,
        }}>
          {result.succeeded} checked out successfully{result.failed > 0 ? `, ${result.failed} failed` : ''}
        </div>
      )}

      {ready.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>
          No assets with status "Ready to Deploy" and unchecked out.
        </div>
      ) : (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f6f8' }}>
                <th style={{ width: 40, padding: '10px 12px', textAlign: 'center' }}>
                  <input type="checkbox"
                    checked={selected.size === ready.length && ready.length > 0}
                    onChange={e => toggleAll(e.target.checked)} />
                </th>
                {['Asset Tag', 'Hostname', 'Model', 'Location'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ready.map((a, i) => (
                <tr key={a.id}
                  onClick={() => toggle(a.id)}
                  style={{ cursor: 'pointer', background: selected.has(a.id) ? '#eef1ff' : (i % 2 === 0 ? '#fff' : '#fafbfc'), borderTop: `1px solid ${T.border}` }}>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} onClick={e => e.stopPropagation()} />
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: T.muted }}>{a.asset_tag || '—'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: T.text }}>{a.hostname}</td>
                  <td style={{ padding: '10px 12px', color: T.muted }}>{a.model || '—'}</td>
                  <td style={{ padding: '10px 12px', color: T.muted }}>{a.location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={`Checkout ${selected.size} Asset${selected.size !== 1 ? 's' : ''}`} onClose={() => setShowModal(false)}>
          <div style={{ marginBottom: 14 }}>
            <Label text="Assign To *" />
            <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} style={selectStyle}>
              <option value="">Select user…</option>
              {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label text="Location" />
            <select value={form.location} onChange={e => set('location', e.target.value)} style={selectStyle}>
              <option value="">No change</option>
              {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px', marginBottom: 14 }}>
            <div>
              <Label text="Checkout Date" />
              <input type="date" value={form.checkout_date} onChange={e => set('checkout_date', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <Label text="Expected Checkin" />
              <input type="date" value={form.expected_checkin_date} onChange={e => set('expected_checkin_date', e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <Label text="Note" />
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2}
              style={{ ...inputStyle, resize: 'vertical' }} placeholder="Optional note…" />
          </div>
          {progress && (
            <div style={{ marginBottom: 14, fontSize: 13, color: T.muted, textAlign: 'center' }}>
              Checking out {progress.done} of {progress.total}…
            </div>
          )}
          <button
            onClick={handleCheckout}
            disabled={saving || !form.assigned_to}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 9, border: 'none',
              background: !form.assigned_to ? '#ccc' : T.navy,
              color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: saving || !form.assigned_to ? 'not-allowed' : 'pointer', fontFamily: T.font,
            }}
          >
            {saving ? `Checking out… (${progress?.done ?? 0}/${progress?.total ?? selected.size})` : `Confirm Checkout (${selected.size})`}
          </button>
        </Modal>
      )}
    </div>
  )
}
