import { useState, useEffect } from 'react'
import { T, zammadApi, fmtDateTime } from '../shared'
import { getTicketSettings } from '../ticketSettings'

export default function DetailsTab({ ticket, onTagsChanged }) {
  const [history,  setHistory]  = useState([])
  const [tags,     setTags]     = useState([])
  const [loading,  setLoading]  = useState(true)

  const predefinedTags = getTicketSettings().predefinedTags

  useEffect(() => {
    if (!ticket?.id) return
    setLoading(true)
    Promise.all([
      zammadApi.getTicketHistory(ticket.id),
      zammadApi.getTicketTags(ticket.id),
    ])
      .then(([h, t]) => {
        setHistory(Array.isArray(h) ? h : [])
        setTags(t?.tags || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ticket?.id])

  const toggleTag = async (tag) => {
    if (tags.includes(tag)) {
      await zammadApi.removeTicketTag(ticket.id, tag).catch(() => {})
      setTags(prev => prev.filter(t => t !== tag))
    } else {
      await zammadApi.addTicketTag(ticket.id, tag).catch(() => {})
      setTags(prev => [...prev, tag])
    }
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

      {/* Category */}
      <Section label="Category">
        {predefinedTags.length === 0 ? (
          <div style={{ fontSize: 12, color: T.muted }}>
            No categories configured. Add predefined categories in ⚙ Ticket Settings.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {predefinedTags.map(tag => {
              const active = tags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    fontFamily: T.font, fontWeight: active ? 600 : 400,
                    border: `1px solid ${active ? '#6366f1' : T.border}`,
                    background: active ? '#eef2ff' : '#fafafa',
                    color: active ? '#6366f1' : T.muted,
                    transition: 'all 0.1s',
                  }}
                >
                  {active ? '✓ ' : ''}{tag}
                </button>
              )
            })}
          </div>
        )}
        {/* Non-predefined, non-system tags */}
        {tags.filter(t => !predefinedTags.includes(t) && !t.startsWith('dept:') && !t.startsWith('contact:')).length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tags.filter(t => !predefinedTags.includes(t) && !t.startsWith('dept:') && !t.startsWith('contact:')).map(tag => (
              <span key={tag} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 20,
                background: '#f1f5f9', color: T.muted, fontSize: 12,
              }}>
                {tag}
                <button
                  onClick={() => toggleTag(tag)}
                  style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}
                >✕</button>
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Department / Contact from system tags */}
      {tags.some(t => t.startsWith('dept:') || t.startsWith('contact:')) && (
        <Section label="Department">
          {tags.filter(t => t.startsWith('dept:')).map(t => (
            <div key={t} style={{ fontSize: 13, color: T.navy, fontWeight: 500, marginBottom: 2 }}>{t.slice(5)}</div>
          ))}
          {tags.filter(t => t.startsWith('contact:')).map(t => (
            <div key={t} style={{ fontSize: 12, color: T.muted }}>{t.slice(8)}</div>
          ))}
        </Section>
      )}

      {/* Dates */}
      <Section label="Dates">
        <Row label="Created"      value={fmtDateTime(ticket.created_at)} />
        <Row label="Updated"      value={fmtDateTime(ticket.updated_at)} />
        {ticket.close_at      && <Row label="Closed"       value={fmtDateTime(ticket.close_at)} />}
        {ticket.escalation_at && <Row label="SLA Deadline" value={fmtDateTime(ticket.escalation_at)} />}
      </Section>

      {/* History */}
      <Section label="History">
        {history.length === 0
          ? <div style={{ fontSize: 12, color: T.muted }}>No history</div>
          : (
            <div style={{ borderLeft: '2px solid #e5e7eb', paddingLeft: 12 }}>
              {history.slice(0, 20).map((h, i) => (
                <div key={i} style={{ marginBottom: 10, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: -17, top: 4,
                    width: 8, height: 8, borderRadius: '50%', background: '#6366f1',
                  }} />
                  <div style={{ fontSize: 12, color: T.navy, fontWeight: 500 }}>
                    {h.object} {h.type}{h.value_to ? ` → ${h.value_to}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                    {h.created_by} · {fmtDateTime(h.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )
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
