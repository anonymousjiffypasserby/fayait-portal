import { useState, useEffect } from 'react'
import { T, zammadApi, fmtDateTime } from '../shared'

export default function DetailsTab({ ticket, onTagsChanged }) {
  const [history,  setHistory]  = useState([])
  const [tags,     setTags]     = useState([])
  const [tagInput, setTagInput] = useState('')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!ticket?.id) return
    setLoading(true)
    Promise.all([
      zammadApi.getTicketHistory(ticket.id),
      zammadApi.getTicketTags(ticket.id),
    ])
      .then(([h, t]) => {
        setHistory(Array.isArray(h) ? h : [])
        setTags((t?.tags || []))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ticket?.id])

  const addTag = async (e) => {
    e.preventDefault()
    const tag = tagInput.trim()
    if (!tag || tags.includes(tag)) return
    await zammadApi.addTicketTag(ticket.id, tag).catch(() => {})
    setTags(prev => [...prev, tag])
    setTagInput('')
    onTagsChanged?.()
  }

  const removeTag = async (tag) => {
    await zammadApi.removeTicketTag(ticket.id, tag).catch(() => {})
    setTags(prev => prev.filter(t => t !== tag))
    onTagsChanged?.()
  }

  if (loading) return <div style={{ padding: 24, color: T.muted, fontSize: 13 }}>Loading…</div>

  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', height: '100%' }}>

      {/* Customer */}
      <Section label="Customer">
        <div style={{ fontSize: 13, color: T.navy, fontWeight: 500 }}>{ticket.customer || '—'}</div>
      </Section>

      {/* Organization */}
      {ticket.organization && (
        <Section label="Organization">
          <div style={{ fontSize: 13, color: T.navy }}>{ticket.organization}</div>
        </Section>
      )}

      {/* Tags */}
      <Section label="Tags">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {tags.map(tag => (
            <span key={tag} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 6,
              background: '#eef2ff', color: '#6366f1', fontSize: 12, fontWeight: 500,
            }}>
              {tag}
              <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}>✕</button>
            </span>
          ))}
          {tags.length === 0 && <span style={{ fontSize: 12, color: T.muted }}>No tags</span>}
        </div>
        <form onSubmit={addTag} style={{ display: 'flex', gap: 6 }}>
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            placeholder="Add tag…"
            style={{
              flex: 1, padding: '5px 9px', borderRadius: 6, fontSize: 12,
              border: `1px solid ${T.border}`, fontFamily: T.font, outline: 'none',
            }}
          />
          <button type="submit" style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 12, fontFamily: T.font,
            background: '#eef2ff', color: '#6366f1', border: 'none', cursor: 'pointer', fontWeight: 600,
          }}>Add</button>
        </form>
      </Section>

      {/* Dates */}
      <Section label="Dates">
        <Row label="Created"  value={fmtDateTime(ticket.created_at)} />
        <Row label="Updated"  value={fmtDateTime(ticket.updated_at)} />
        {ticket.close_at && <Row label="Closed" value={fmtDateTime(ticket.close_at)} />}
        {ticket.escalation_at && <Row label="SLA Deadline" value={fmtDateTime(ticket.escalation_at)} />}
      </Section>

      {/* History */}
      <Section label="History">
        {history.length === 0
          ? <div style={{ fontSize: 12, color: T.muted }}>No history</div>
          : <div style={{ borderLeft: '2px solid #e5e7eb', paddingLeft: 12 }}>
              {history.slice(0, 20).map((h, i) => (
                <div key={i} style={{ marginBottom: 10, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: -17, top: 4,
                    width: 8, height: 8, borderRadius: '50%', background: '#6366f1',
                  }} />
                  <div style={{ fontSize: 12, color: T.navy, fontWeight: 500 }}>
                    {h.object} {h.type} {h.value_to ? `→ ${h.value_to}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                    {h.created_by} · {fmtDateTime(h.created_at)}
                  </div>
                </div>
              ))}
            </div>
        }
      </Section>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontFamily: T.font }}>{label}</div>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 4, fontFamily: T.font }}>
      <span style={{ fontSize: 12, color: T.muted, minWidth: 90 }}>{label}</span>
      <span style={{ fontSize: 12, color: T.navy }}>{value}</span>
    </div>
  )
}
