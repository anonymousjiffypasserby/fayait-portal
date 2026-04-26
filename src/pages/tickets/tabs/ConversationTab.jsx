import { useState, useEffect, useRef, useCallback } from 'react'
import { T, zammadApi, fmtDateTime } from '../shared'

const CHANNEL_ICONS = { email: '✉', phone: '📞', chat: '💬', web: '🌐', note: '📝' }

function ArticleBubble({ article }) {
  const isAgent    = article.sender === 'Agent'
  const isInternal = article.internal
  const channel    = CHANNEL_ICONS[article.type] || '📝'

  const attachments = article.attachments || []

  return (
    <div style={{
      display: 'flex', flexDirection: isAgent ? 'row-reverse' : 'row',
      gap: 10, marginBottom: 18,
    }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: isAgent ? '#6366f1' : '#e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
        color: isAgent ? '#fff' : T.navy,
      }}>
        {(article.from || '?').charAt(0).toUpperCase()}
      </div>

      <div style={{ maxWidth: '75%' }}>
        {/* Meta row */}
        <div style={{
          fontSize: 11, color: T.muted, marginBottom: 4,
          textAlign: isAgent ? 'right' : 'left',
          display: 'flex', gap: 6, alignItems: 'center',
          flexDirection: isAgent ? 'row-reverse' : 'row',
        }}>
          <span title={article.type} style={{ fontSize: 12 }}>{channel}</span>
          <strong style={{ color: T.navy }}>{article.from || 'Unknown'}</strong>
          <span>·</span>
          <span>{fmtDateTime(article.created_at)}</span>
          {isInternal && (
            <span style={{
              background: '#fef9c3', color: '#854d0e',
              borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 600,
            }}>internal</span>
          )}
        </div>

        {/* Body */}
        <div style={{
          background: isAgent ? '#6366f1' : isInternal ? '#fef9c3' : '#f1f5f9',
          color: isAgent ? '#fff' : T.navy,
          borderRadius: isAgent ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
          padding: '10px 14px', fontSize: 13, lineHeight: 1.6,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}
          dangerouslySetInnerHTML={{ __html: article.body || '' }}
        />

        {/* Attachments */}
        {attachments.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {attachments.map((att, i) => (
              <a
                key={i}
                href={att.url || '#'}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 6,
                  background: '#f1f5f9', border: `1px solid ${T.border}`,
                  fontSize: 11, color: '#6366f1', textDecoration: 'none', fontWeight: 500,
                }}
              >
                📎 {att.filename || `Attachment ${i + 1}`}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ConversationTab({ ticketId, onReplySent, isAgent, insertText, onInsertConsumed }) {
  const [articles,   setArticles]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [reply,      setReply]      = useState('')
  const [internal,   setInternal]   = useState(false)
  const [sending,    setSending]    = useState(false)
  const [error,      setError]      = useState(null)
  const [file,       setFile]       = useState(null)
  const bottomRef = useRef(null)
  const fileRef   = useRef(null)

  const load = () => {
    setLoading(true)
    zammadApi.getTicketArticles(ticketId)
      .then(a => setArticles(Array.isArray(a) ? a : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [ticketId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [articles])

  useEffect(() => {
    if (!insertText) return
    setReply(prev => prev ? prev + '\n\n' + insertText : insertText)
    setInternal(false)
    onInsertConsumed?.()
  }, [insertText])

  const sendReply = async () => {
    if (!reply.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      if (file) {
        await zammadApi.uploadAttachment(file)
      }
      await zammadApi.createArticle({
        ticket_id: ticketId,
        body: reply.trim(),
        type: internal ? 'note' : 'web',
        internal,
        sender: isAgent ? 'Agent' : 'Customer',
      })
      setReply('')
      setFile(null)
      load()
      onReplySent?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 32, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {articles.map(a => <ArticleBubble key={a.id} article={a} />)}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: '12px 16px', background: T.card, flexShrink: 0 }}>
        {/* Toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {['Public Reply', 'Internal Note'].map((label, i) => (
            <button
              key={label}
              onClick={() => setInternal(i === 1)}
              style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12, fontFamily: T.font,
                border: `1px solid ${(i === 1) === internal ? '#6366f1' : T.border}`,
                background: (i === 1) === internal ? '#eef2ff' : '#fafafa',
                color: (i === 1) === internal ? '#6366f1' : T.muted,
                cursor: 'pointer', fontWeight: (i === 1) === internal ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          placeholder={internal ? 'Write an internal note…' : 'Write a reply…'}
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '9px 12px',
            borderRadius: 7, border: `1px solid ${internal ? '#fef08a' : T.border}`,
            fontSize: 13, fontFamily: T.font, color: T.navy,
            background: internal ? '#fffef7' : '#fafafa',
            resize: 'vertical', outline: 'none',
          }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }}
        />

        {/* File preview */}
        {file && (
          <div style={{ marginTop: 6, fontSize: 12, color: T.muted }}>
            📎 {file.name}
            <button onClick={() => setFile(null)} style={{ marginLeft: 6, background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 11 }}>✕</button>
          </div>
        )}

        {error && <div style={{ fontSize: 11, color: T.red, marginTop: 6 }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, justifyContent: 'space-between' }}>
          <button
            onClick={() => fileRef.current?.click()}
            style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 13, padding: '4px 8px' }}
            title="Attach file"
          >
            📎
          </button>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0] || null)} />

          <button
            onClick={sendReply}
            disabled={!reply.trim() || sending}
            style={{
              padding: '7px 20px', borderRadius: 7, border: 'none',
              fontSize: 13, fontWeight: 600, fontFamily: T.font, cursor: 'pointer',
              background: !reply.trim() || sending ? '#e5e7eb' : (internal ? '#f59e0b' : '#6366f1'),
              color: !reply.trim() || sending ? T.muted : '#fff',
            }}
          >
            {sending ? 'Sending…' : internal ? 'Add Note' : 'Send Reply'}
          </button>
        </div>
      </div>
    </div>
  )
}
