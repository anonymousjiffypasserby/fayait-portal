import { useState } from 'react'
import { T } from './shared'
import { getTicketSettings, saveTicketSettings, SLA_PRIORITY_LABELS, DEFAULTS } from './ticketSettings'

export default function TicketSettingsModal({ onClose }) {
  const initial = getTicketSettings()
  const [slaHours,       setSlaHours]       = useState({ ...initial.slaHours })
  const [newBadgeHours,  setNewBadgeHours]  = useState(initial.newBadgeHours)
  const [predefinedTags, setPredefinedTags] = useState(initial.predefinedTags)
  const [tagInput,       setTagInput]       = useState('')
  const [saved,          setSaved]          = useState(false)

  const handleSave = () => {
    saveTicketSettings({ slaHours, newBadgeHours, predefinedTags })
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 700)
  }

  const reset = () => {
    setSlaHours({ ...DEFAULTS.slaHours })
    setNewBadgeHours(DEFAULTS.newBadgeHours)
  }

  const addTag = (e) => {
    e.preventDefault()
    const t = tagInput.trim().toLowerCase()
    if (t && !predefinedTags.includes(t)) setPredefinedTags(prev => [...prev, t])
    setTagInput('')
  }

  const removeTag = (tag) => setPredefinedTags(prev => prev.filter(t => t !== tag))

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, fontFamily: T.font,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 12, width: 440,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px 14px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>Ticket Settings</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: T.muted, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

          {/* SLA thresholds */}
          <SettingSection label="SLA Thresholds (hours)" description="Response deadline per priority when Zammad SLA is not configured.">
            {[4, 3, 2, 1].map(pid => (
              <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: T.navy, minWidth: 90 }}>{SLA_PRIORITY_LABELS[pid]}</span>
                <input
                  type="number" min="0.25" step="0.25"
                  value={slaHours[pid]}
                  onChange={e => setSlaHours(prev => ({ ...prev, [pid]: parseFloat(e.target.value) || 0 }))}
                  style={numInput}
                />
                <span style={{ fontSize: 12, color: T.muted }}>hours</span>
              </div>
            ))}
          </SettingSection>

          {/* New badge */}
          <SettingSection label='"New" Badge Duration' description='How long to show the NEW badge on recently created tickets.'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number" min="1" step="1"
                value={newBadgeHours}
                onChange={e => setNewBadgeHours(parseFloat(e.target.value) || 0)}
                style={numInput}
              />
              <span style={{ fontSize: 12, color: T.muted }}>hours</span>
            </div>
          </SettingSection>

          {/* Predefined categories */}
          <SettingSection label="Predefined Categories" description="Categories available when creating or editing tickets.">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {predefinedTags.length === 0 && (
                <span style={{ fontSize: 12, color: T.muted }}>No categories yet</span>
              )}
              {predefinedTags.map(tag => (
                <span key={tag} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 6,
                  background: '#eef2ff', color: '#6366f1', fontSize: 12, fontWeight: 500,
                }}>
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}
                  >✕</button>
                </span>
              ))}
            </div>
            <form onSubmit={addTag} style={{ display: 'flex', gap: 8 }}>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                placeholder="Add category…"
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: 6, fontSize: 13,
                  border: `1px solid ${T.border}`, fontFamily: T.font, color: T.navy, outline: 'none',
                }}
              />
              <button type="submit" style={{
                padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: '#eef2ff', color: '#6366f1', border: 'none', cursor: 'pointer',
                fontFamily: T.font,
              }}>Add</button>
            </form>
          </SettingSection>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px', borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <button onClick={reset} style={{
            background: 'none', border: 'none', fontSize: 12, color: T.muted,
            cursor: 'pointer', fontFamily: T.font, padding: '4px 0',
          }}>
            Reset SLA to defaults
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{
              padding: '8px 18px', borderRadius: 7, border: `1px solid ${T.border}`,
              fontSize: 13, fontWeight: 500, background: '#fff', color: T.navy,
              cursor: 'pointer', fontFamily: T.font,
            }}>Cancel</button>
            <button onClick={handleSave} style={{
              padding: '8px 22px', borderRadius: 7, border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.font,
              background: saved ? '#1D9E75' : '#6366f1', color: '#fff',
              transition: 'background 0.2s',
            }}>
              {saved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingSection({ label, description, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
        {label}
      </div>
      {description && (
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>{description}</div>
      )}
      {children}
    </div>
  )
}

const numInput = {
  width: 80, padding: '6px 10px', borderRadius: 6, fontSize: 13,
  border: `1px solid ${T.border}`, fontFamily: "'DM Sans', sans-serif",
  color: '#1a1f2e', outline: 'none', textAlign: 'right',
}
