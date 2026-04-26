import { useState, useEffect, useRef } from 'react'
import { zammadApi, T, stateColor, priorityColor, fmtDateTime } from './shared'

function ArticleBubble({ article }) {
  const isInternal = article.internal
  const isAgent = article.sender === 'Agent'

  return (
    <div style={{
      display: 'flex',
      flexDirection: isAgent ? 'row-reverse' : 'row',
      gap: 10, marginBottom: 16,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: isAgent ? '#6366f1' : '#e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
        color: isAgent ? '#fff' : T.navy,
      }}>
        {(article.from || '?').charAt(0).toUpperCase()}
      </div>
      <div style={{ maxWidth: '72%' }}>
        <div style={{
          fontSize: 11, color: T.muted, marginBottom: 4,
          textAlign: isAgent ? 'right' : 'left',
        }}>
          {article.from || 'Unknown'} · {fmtDateTime(article.created_at)}
          {isInternal && (
            <span style={{
              marginLeft: 6, background: '#fef9c3', color: '#854d0e',
              borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 600,
            }}>
              internal
            </span>
          )}
        </div>
        <div style={{
          background: isAgent ? '#6366f1' : isInternal ? '#fef9c3' : '#f1f5f9',
          color: isAgent ? '#fff' : T.navy,
          borderRadius: isAgent ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
          padding: '10px 14px', fontSize: 13, lineHeight: 1.6,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}
          dangerouslySetInnerHTML={{ __html: article.body || '' }}
        />
      </div>
    </div>
  )
}

export default function TicketDetail({ ticketId, onBack, onUpdated }) {
  const [ticket, setTicket]   = useState(null)
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply]     = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!ticketId) return
    setLoading(true)
    setError(null)
    Promise.all([
      zammadApi.getTicket(ticketId),
      zammadApi.getTicketArticles(ticketId),
    ])
      .then(([t, a]) => {
        setTicket(t)
        setArticles(Array.isArray(a) ? a : [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [ticketId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [articles])

  const sendReply = async () => {
    if (!reply.trim() || sending) return
    setSending(true)
    try {
      await zammadApi.createArticle({
        ticket_id: ticketId,
        body: reply.trim(),
        type: 'note',
        internal: false,
        sender: 'Customer',
      })
      setReply('')
      const updated = await zammadApi.getTicketArticles(ticketId)
      setArticles(Array.isArray(updated) ? updated : [])
      onUpdated?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.muted, fontSize: 13, fontFamily: T.font }}>
        Loading…
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div style={{ padding: 32, fontFamily: T.font }}>
        <button onClick={onBack} style={backBtn}>← Back</button>
        <div style={{ marginTop: 16, color: T.red }}>{error || 'Ticket not found'}</div>
      </div>
    )
  }

  const sc = stateColor(ticket.state)
  const pc = priorityColor(ticket.priority_id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: T.font }}>

      {/* Header */}
      <div style={{
        padding: '14px 24px', borderBottom: `1px solid ${T.border}`,
        background: T.card, flexShrink: 0,
      }}>
        <button onClick={onBack} style={backBtn}>← Back</button>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>
              #{ticket.number || ticket.id}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.navy, lineHeight: 1.3 }}>
              {ticket.title}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: sc.color, background: sc.bg }}>
              {sc.label}
            </span>
            <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: pc.color, background: pc.bg }}>
              {ticket.priority || pc.label}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 10, flexWrap: 'wrap' }}>
          {ticket.group && (
            <Meta label="Group" value={ticket.group} />
          )}
          {ticket.owner && ticket.owner !== '-' && (
            <Meta label="Assigned to" value={ticket.owner} />
          )}
          {ticket.customer && (
            <Meta label="Customer" value={ticket.customer} />
          )}
          <Meta label="Created" value={fmtDateTime(ticket.created_at)} />
          <Meta label="Updated" value={fmtDateTime(ticket.updated_at)} />
        </div>
      </div>

      {/* Article thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {articles.map(a => (
          <ArticleBubble key={a.id} article={a} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      {ticket.state?.toLowerCase() !== 'closed' && (
        <div style={{
          padding: '14px 24px', borderTop: `1px solid ${T.border}`,
          background: T.card, flexShrink: 0,
        }}>
          {error && <div style={{ fontSize: 12, color: T.red, marginBottom: 8 }}>{error}</div>}
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Write a reply…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '10px 12px',
              borderRadius: 8, border: `1px solid ${T.border}`,
              fontSize: 13, fontFamily: T.font, color: T.navy,
              resize: 'vertical', outline: 'none',
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply()
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={sendReply}
              disabled={!reply.trim() || sending}
              style={{
                padding: '7px 20px', background: sending || !reply.trim() ? '#e5e7eb' : '#6366f1',
                color: sending || !reply.trim() ? T.muted : '#fff',
                border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500,
                cursor: sending || !reply.trim() ? 'default' : 'pointer',
                fontFamily: T.font,
              }}
            >
              {sending ? 'Sending…' : 'Send Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Meta({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 12, color: T.navy, marginTop: 1 }}>{value}</div>
    </div>
  )
}

const backBtn = {
  background: 'none', border: 'none', color: '#6366f1',
  fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: T.font,
}
