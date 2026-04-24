import { useState } from 'react'
import api from '../../../services/api'
import { T, ROLE_LABELS, btn } from '../shared'

const lbl = { fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3, display: 'block' }
const val = { fontSize: 14, color: T.navy, fontWeight: 500 }
const inputSt = { width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: T.font, boxSizing: 'border-box' }

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <span style={lbl}>{label}</span>
      <div style={val}>{children || <span style={{ color: T.muted }}>—</span>}</div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, padding: '20px 24px', marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function MyProfile({ me, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(me.name || '')
  const [phone, setPhone] = useState(me.phone || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      await api.updateProfile({ name: name.trim(), phone: phone.trim() || null })
      onUpdated()
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const roleLabel = ROLE_LABELS[me.role] || me.role

  return (
    <div style={{ padding: '24px', maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: T.navy }}>My Profile</h2>
        {!editing && (
          <button onClick={() => setEditing(true)} style={btn('ghost')}>Edit</button>
        )}
      </div>

      {/* Avatar + name header */}
      <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, padding: '20px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: T.orange, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, flexShrink: 0,
        }}>
          {(me.name || '').split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, color: T.navy }}>{me.name}</div>
          <div style={{ fontSize: 13, color: T.muted }}>{me.email}</div>
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#EEF2FF', color: '#4338CA', fontWeight: 500 }}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {editing ? (
        <Section title="Edit Profile">
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Full Name *</label>
            <input style={inputSt} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Phone</label>
            <input style={inputSt} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+597 000 0000" />
          </div>
          {error && (
            <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setEditing(false); setError('') }} style={btn('ghost')}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ ...btn('primary'), opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </Section>
      ) : (
        <>
          <Section title="Personal Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <Field label="Email">{me.email}</Field>
              <Field label="Phone">{me.phone}</Field>
              <Field label="Department">{me.department}</Field>
              <Field label="Role">{roleLabel}</Field>
            </div>
          </Section>

          <Section title="Employment">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <Field label="Job Title">{me.job_title}</Field>
              <Field label="Manager">{me.manager_name}</Field>
              <Field label="Employee Number">{me.employee_number}</Field>
              <Field label="Contract Type">{me.contract_type}</Field>
              <Field label="Start Date">{me.start_date ? new Date(me.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null}</Field>
              <Field label="End Date">{me.end_date ? new Date(me.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null}</Field>
              {me.job_function_name && (
                <Field label="Job Function">{me.job_function_name}</Field>
              )}
            </div>
          </Section>

          {me.access?.filter(a => a.level !== 'none').length > 0 && (
            <Section title="Service Access">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {me.access.filter(a => a.level !== 'none').map(a => (
                  <span key={a.service} style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 6,
                    background: '#F1EFE8', color: '#5F5E5A', fontWeight: 500,
                    border: `1px solid rgba(0,0,0,0.06)`,
                  }}>
                    {a.service} · {a.level}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}
