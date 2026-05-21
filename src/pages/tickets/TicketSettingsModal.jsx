import { useState, useEffect } from 'react'
import { T, zammadApi } from './shared'
import { getTicketSettings, loadTicketSettings, saveTicketSettings, SLA_PRIORITY_LABELS, DEFAULTS } from './ticketSettings'

const TABS = ['General', 'Templates', 'Macros']

const MACRO_TYPES = [
  { key: 'state',    label: 'Set State',    placeholder: 'open / closed / pending reminder' },
  { key: 'priority', label: 'Set Priority', placeholder: '1 (Low) / 2 (Normal) / 3 (High) / 4 (Emergency)' },
  { key: 'owner',    label: 'Assign Agent', placeholder: 'Agent Zammad user ID' },
  { key: 'note',     label: 'Add Internal Note', placeholder: 'Note text…' },
  { key: 'tag',      label: 'Add Tag',      placeholder: 'tag-name' },
]

export default function TicketSettingsModal({ onClose }) {
  const initial = getTicketSettings()

  // General tab state
  const [slaHours,            setSlaHours]            = useState({ ...initial.slaHours })
  const [newBadgeHours,       setNewBadgeHours]       = useState(initial.newBadgeHours)
  const [predefinedTags,      setPredefinedTags]      = useState(initial.predefinedTags)
  const [retentionClosedDays, setRetentionClosedDays] = useState(initial.retentionClosedDays ?? '')
  const [deletionAfterMonths, setDeletionAfterMonths] = useState(initial.deletionAfterMonths ?? '')
  const [privacyPolicyUrl,    setPrivacyPolicyUrl]    = useState(initial.privacyPolicyUrl ?? '')
  const [tagInput,            setTagInput]            = useState('')

  // Templates tab state
  const [templates,    setTemplates]    = useState(initial.templates || [])
  const [tplForm,      setTplForm]      = useState(null) // null | {id?,name,title,body,priority_id,categories}
  const [tplCatInput,  setTplCatInput]  = useState('')

  // Macros tab state
  const [macros,       setMacros]       = useState(initial.macros || [])
  const [macroForm,    setMacroForm]    = useState(null) // null | {id?,name,actions}
  const [agents,       setAgents]       = useState([])

  const [activeTab, setActiveTab] = useState('General')
  const [saved,     setSaved]     = useState(false)
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    loadTicketSettings().then(s => {
      setSlaHours({ ...s.slaHours })
      setNewBadgeHours(s.newBadgeHours)
      setPredefinedTags(s.predefinedTags)
      setRetentionClosedDays(s.retentionClosedDays ?? '')
      setDeletionAfterMonths(s.deletionAfterMonths ?? '')
      setPrivacyPolicyUrl(s.privacyPolicyUrl ?? '')
      setTemplates(s.templates || [])
      setMacros(s.macros || [])
    })
    // Fetch agents for macro "assign" action display
    zammadApi.getUsers()
      .then(u => setAgents(Array.isArray(u) ? u.filter(x => x.role_ids?.some(id => id === 1 || id === 2)) : []))
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await saveTicketSettings({
      slaHours, newBadgeHours, predefinedTags,
      retentionClosedDays: retentionClosedDays !== '' ? Number(retentionClosedDays) : null,
      deletionAfterMonths: deletionAfterMonths !== '' ? Number(deletionAfterMonths) : null,
      privacyPolicyUrl,
      templates,
      macros,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 700)
  }

  // ── Category tag helpers ──────────────────────────────────────────────────
  const addTag = (e) => {
    e.preventDefault()
    const t = tagInput.trim().toLowerCase()
    if (t && !predefinedTags.includes(t)) setPredefinedTags(prev => [...prev, t])
    setTagInput('')
  }
  const removeTag = (tag) => setPredefinedTags(prev => prev.filter(t => t !== tag))

  // ── Template helpers ──────────────────────────────────────────────────────
  const newTplForm = () => setTplForm({ name: '', title: '', body: '', priority_id: 2, categories: [] })
  const saveTpl = () => {
    if (!tplForm.name.trim()) return
    const tpl = { ...tplForm, id: tplForm.id || crypto.randomUUID() }
    setTemplates(prev => tplForm.id ? prev.map(t => t.id === tpl.id ? tpl : t) : [...prev, tpl])
    setTplForm(null)
  }
  const deleteTpl = (id) => setTemplates(prev => prev.filter(t => t.id !== id))
  const tplToggleCat = (cat) => {
    setTplForm(f => ({
      ...f,
      categories: f.categories.includes(cat) ? f.categories.filter(c => c !== cat) : [...f.categories, cat],
    }))
  }

  // ── Macro helpers ─────────────────────────────────────────────────────────
  const newMacroForm = () => setMacroForm({ name: '', actions: [] })
  const saveMacro = () => {
    if (!macroForm.name.trim() || macroForm.actions.length === 0) return
    const m = { ...macroForm, id: macroForm.id || crypto.randomUUID() }
    setMacros(prev => macroForm.id ? prev.map(x => x.id === m.id ? m : x) : [...prev, m])
    setMacroForm(null)
  }
  const deleteMacro = (id) => setMacros(prev => prev.filter(m => m.id !== id))
  const addMacroAction = () => {
    setMacroForm(f => ({ ...f, actions: [...f.actions, { type: 'state', value: '' }] }))
  }
  const updateMacroAction = (i, field, val) => {
    setMacroForm(f => {
      const actions = f.actions.map((a, idx) => idx === i ? { ...a, [field]: val } : a)
      return { ...f, actions }
    })
  }
  const removeMacroAction = (i) => {
    setMacroForm(f => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }))
  }

  const agentName = (ownerId) => {
    const a = agents.find(x => String(x.id) === String(ownerId))
    return a ? `${a.firstname} ${a.lastname}` : ownerId
  }

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
        background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520,
        maxHeight: '88dvh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        margin: '0 16px',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px 0', borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>Ticket Settings</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: T.muted, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                style={{
                  padding: '7px 16px', border: 'none', background: 'none',
                  fontSize: 13, fontFamily: T.font, cursor: 'pointer',
                  color: activeTab === t ? '#6366f1' : T.muted,
                  fontWeight: activeTab === t ? 700 : 400,
                  borderBottom: activeTab === t ? '2px solid #6366f1' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

          {/* ── General ── */}
          {activeTab === 'General' && (
            <>
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

              <SettingSection label='"New" Badge Duration' description='Tickets created within this window show a green NEW badge.'>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="number" min="1" step="1" value={newBadgeHours}
                    onChange={e => setNewBadgeHours(parseFloat(e.target.value) || 0)} style={numInput} />
                  <span style={{ fontSize: 12, color: T.muted }}>hours</span>
                </div>
              </SettingSection>

              <SettingSection label="GDPR & Data Retention" description="Configure how long ticket data is kept.">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: T.navy, minWidth: 180 }}>Flag closed tickets after</span>
                  <input type="number" min="1" step="1" placeholder="off" value={retentionClosedDays}
                    onChange={e => setRetentionClosedDays(e.target.value)} style={numInput} />
                  <span style={{ fontSize: 12, color: T.muted }}>days</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: T.navy, minWidth: 180 }}>Schedule deletion after</span>
                  <input type="number" min="1" step="1" placeholder="off" value={deletionAfterMonths}
                    onChange={e => setDeletionAfterMonths(e.target.value)} style={numInput} />
                  <span style={{ fontSize: 12, color: T.muted }}>months closed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: T.navy, minWidth: 180 }}>Privacy Policy URL</span>
                  <input type="url" placeholder="https://…" value={privacyPolicyUrl}
                    onChange={e => setPrivacyPolicyUrl(e.target.value)} style={{ ...numInput, width: 200, textAlign: 'left' }} />
                </div>
              </SettingSection>

              <SettingSection label="Predefined Categories">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {predefinedTags.length === 0 && <span style={{ fontSize: 12, color: T.muted }}>No categories yet</span>}
                  {predefinedTags.map(tag => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: '#eef2ff', color: '#6366f1', fontSize: 12, fontWeight: 500 }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}>✕</button>
                    </span>
                  ))}
                </div>
                <form onSubmit={addTag} style={{ display: 'flex', gap: 8 }}>
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add category…"
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 6, fontSize: 13, border: `1px solid ${T.border}`, fontFamily: T.font, color: T.navy, outline: 'none' }} />
                  <button type="submit" style={{ padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#eef2ff', color: '#6366f1', border: 'none', cursor: 'pointer', fontFamily: T.font }}>Add</button>
                </form>
              </SettingSection>
            </>
          )}

          {/* ── Templates ── */}
          {activeTab === 'Templates' && (
            <>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 16, lineHeight: 1.5 }}>
                Templates pre-fill the New Ticket form. Agents pick a template from the "Use template" dropdown.
              </div>

              {templates.length === 0 && !tplForm && (
                <div style={{ textAlign: 'center', color: T.muted, fontSize: 13, padding: '24px 0' }}>No templates yet</div>
              )}
              {templates.map(t => (
                <div key={t.id} style={{ border: `1px solid ${T.border}`, borderRadius: 7, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 2 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{t.title || '(no title pre-fill)'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setTplForm(t)} style={smallGhostBtn}>Edit</button>
                    <button onClick={() => deleteTpl(t.id)} style={{ ...smallGhostBtn, color: T.red }}>✕</button>
                  </div>
                </div>
              ))}

              {tplForm ? (
                <div style={{ border: `1px solid #6366f1`, borderRadius: 8, padding: '14px 16px', background: '#fafeff' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 12 }}>{tplForm.id ? 'Edit template' : 'New template'}</div>
                  <TplField label="Template name *">
                    <input value={tplForm.name} onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Password Reset" style={tplInp} />
                  </TplField>
                  <TplField label="Pre-fill title">
                    <input value={tplForm.title} onChange={e => setTplForm(f => ({ ...f, title: e.target.value }))} placeholder="Password reset request" style={tplInp} />
                  </TplField>
                  <TplField label="Pre-fill description">
                    <textarea value={tplForm.body} onChange={e => setTplForm(f => ({ ...f, body: e.target.value }))} rows={3} style={{ ...tplInp, resize: 'vertical' }} />
                  </TplField>
                  <TplField label="Default priority">
                    <select value={tplForm.priority_id} onChange={e => setTplForm(f => ({ ...f, priority_id: Number(e.target.value) }))} style={tplInp}>
                      <option value={1}>Low</option>
                      <option value={2}>Normal</option>
                      <option value={3}>High</option>
                      <option value={4}>Emergency</option>
                    </select>
                  </TplField>
                  {predefinedTags.length > 0 && (
                    <TplField label="Pre-select categories">
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {predefinedTags.map(cat => {
                          const active = (tplForm.categories || []).includes(cat)
                          return (
                            <button key={cat} type="button" onClick={() => tplToggleCat(cat)}
                              style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontFamily: T.font, fontWeight: active ? 600 : 400, border: `1px solid ${active ? '#6366f1' : T.border}`, background: active ? '#eef2ff' : '#fafafa', color: active ? '#6366f1' : T.muted }}>
                              {active ? '✓ ' : ''}{cat}
                            </button>
                          )
                        })}
                      </div>
                    </TplField>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={saveTpl} disabled={!tplForm.name.trim()} style={{ padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: tplForm.name.trim() ? '#6366f1' : '#e5e7eb', color: tplForm.name.trim() ? '#fff' : T.muted, border: 'none', cursor: 'pointer', fontFamily: T.font }}>
                      {tplForm.id ? 'Update' : 'Save template'}
                    </button>
                    <button onClick={() => setTplForm(null)} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, background: '#fff', color: T.muted, border: `1px solid ${T.border}`, cursor: 'pointer', fontFamily: T.font }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={newTplForm} style={{ width: '100%', padding: '9px', borderRadius: 8, border: `2px dashed ${T.border}`, background: 'none', fontSize: 13, color: T.muted, cursor: 'pointer', fontFamily: T.font, marginTop: 4 }}>
                  + Add template
                </button>
              )}
            </>
          )}

          {/* ── Macros ── */}
          {activeTab === 'Macros' && (
            <>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 16, lineHeight: 1.5 }}>
                Macros apply multiple actions to a ticket in one click (e.g. close + add note + assign). Run them from the ticket detail panel.
              </div>

              {macros.length === 0 && !macroForm && (
                <div style={{ textAlign: 'center', color: T.muted, fontSize: 13, padding: '24px 0' }}>No macros yet</div>
              )}
              {macros.map(m => (
                <div key={m.id} style={{ border: `1px solid ${T.border}`, borderRadius: 7, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 4 }}>{m.name}</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {m.actions.map((a, i) => (
                        <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#f1f5f9', color: T.muted }}>
                          {MACRO_TYPES.find(t => t.key === a.type)?.label || a.type}: {a.type === 'owner' ? agentName(a.value) : a.value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setMacroForm(m)} style={smallGhostBtn}>Edit</button>
                    <button onClick={() => deleteMacro(m.id)} style={{ ...smallGhostBtn, color: T.red }}>✕</button>
                  </div>
                </div>
              ))}

              {macroForm ? (
                <div style={{ border: `1px solid #6366f1`, borderRadius: 8, padding: '14px 16px', background: '#fafeff' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 12 }}>{macroForm.id ? 'Edit macro' : 'New macro'}</div>
                  <TplField label="Macro name *">
                    <input value={macroForm.name} onChange={e => setMacroForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Close and thank" style={tplInp} />
                  </TplField>
                  <TplField label="Actions">
                    {macroForm.actions.map((action, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'flex-start' }}>
                        <select
                          value={action.type}
                          onChange={e => updateMacroAction(i, 'type', e.target.value)}
                          style={{ ...tplInp, flex: '0 0 140px', marginBottom: 0 }}
                        >
                          {MACRO_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                        </select>
                        {action.type === 'owner' ? (
                          <select value={action.value} onChange={e => updateMacroAction(i, 'value', e.target.value)} style={{ ...tplInp, flex: 1, marginBottom: 0 }}>
                            <option value="">Select agent…</option>
                            {agents.map(a => <option key={a.id} value={a.id}>{a.firstname} {a.lastname}</option>)}
                          </select>
                        ) : action.type === 'state' ? (
                          <select value={action.value} onChange={e => updateMacroAction(i, 'value', e.target.value)} style={{ ...tplInp, flex: 1, marginBottom: 0 }}>
                            <option value="">Select state…</option>
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                            <option value="pending reminder">Pending Reminder</option>
                            <option value="pending close">Pending Close</option>
                          </select>
                        ) : action.type === 'priority' ? (
                          <select value={action.value} onChange={e => updateMacroAction(i, 'value', e.target.value)} style={{ ...tplInp, flex: 1, marginBottom: 0 }}>
                            <option value="">Select priority…</option>
                            <option value="1">Low</option>
                            <option value="2">Normal</option>
                            <option value="3">High</option>
                            <option value="4">Emergency</option>
                          </select>
                        ) : (
                          <input value={action.value} onChange={e => updateMacroAction(i, 'value', e.target.value)}
                            placeholder={MACRO_TYPES.find(t => t.key === action.type)?.placeholder || ''}
                            style={{ ...tplInp, flex: 1, marginBottom: 0 }} />
                        )}
                        <button onClick={() => removeMacroAction(i)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 16, padding: '4px 6px', flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={addMacroAction} style={{ width: '100%', padding: '7px', borderRadius: 6, border: `1px dashed ${T.border}`, background: 'none', fontSize: 12, color: T.muted, cursor: 'pointer', fontFamily: T.font, marginTop: 4 }}>
                      + Add action
                    </button>
                  </TplField>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={saveMacro} disabled={!macroForm.name.trim() || macroForm.actions.length === 0}
                      style={{ padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: (macroForm.name.trim() && macroForm.actions.length > 0) ? '#6366f1' : '#e5e7eb', color: (macroForm.name.trim() && macroForm.actions.length > 0) ? '#fff' : T.muted, border: 'none', cursor: 'pointer', fontFamily: T.font }}>
                      {macroForm.id ? 'Update' : 'Save macro'}
                    </button>
                    <button onClick={() => setMacroForm(null)} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, background: '#fff', color: T.muted, border: `1px solid ${T.border}`, cursor: 'pointer', fontFamily: T.font }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={newMacroForm} style={{ width: '100%', padding: '9px', borderRadius: 8, border: `2px dashed ${T.border}`, background: 'none', fontSize: 13, color: T.muted, cursor: 'pointer', fontFamily: T.font, marginTop: 4 }}>
                  + Add macro
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px', borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          {activeTab === 'General' ? (
            <button onClick={() => { setSlaHours({ ...DEFAULTS.slaHours }); setNewBadgeHours(DEFAULTS.newBadgeHours) }}
              style={{ background: 'none', border: 'none', fontSize: 12, color: T.muted, cursor: 'pointer', fontFamily: T.font, padding: '4px 0' }}>
              Reset SLA to defaults
            </button>
          ) : <div />}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 13, fontWeight: 500, background: '#fff', color: T.navy, cursor: 'pointer', fontFamily: T.font }}>Cancel</button>
            <button onClick={handleSave} style={{ padding: '8px 22px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.font, background: saved ? '#1D9E75' : '#6366f1', color: '#fff', transition: 'background 0.2s' }}>
              {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save'}
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
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
      {description && <div style={{ fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>{description}</div>}
      {children}
    </div>
  )
}

function TplField({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      {children}
    </div>
  )
}

const numInput = {
  width: 80, padding: '6px 10px', borderRadius: 6, fontSize: 13,
  border: `1px solid ${T.border}`, fontFamily: "'DM Sans', sans-serif",
  color: '#1a1f2e', outline: 'none', textAlign: 'right',
}

const tplInp = {
  width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 6,
  border: `1px solid ${T.border}`, fontSize: 12, fontFamily: "'DM Sans', sans-serif",
  color: '#1a1f2e', outline: 'none', background: '#fafafa', marginBottom: 0,
}

const smallGhostBtn = {
  padding: '3px 10px', borderRadius: 5, fontSize: 11, background: '#f1f5f9',
  border: `1px solid ${T.border}`, color: T.navy, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
}
