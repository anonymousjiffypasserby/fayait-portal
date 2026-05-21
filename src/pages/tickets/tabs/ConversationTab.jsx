import { useState, useEffect, useRef } from 'react'
import { T, zammadApi, fmtDateTime } from '../shared'

async function downloadAttachment(ticketId, articleId, att) {
  try {
    const res = await zammadApi.downloadAttachment(ticketId, articleId, att.id)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = att.filename || `attachment-${att.id}`
    a.click()
    URL.revokeObjectURL(url)
  } catch {}
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const CHANNEL_ICONS = { email: '✉', phone: '📞', chat: '💬', web: '🌐', note: '📝' }

function ArticleBubble({ article }) {
  const isAgent    = article.sender === 'Agent'
  const isInternal = article.internal
  const isEmail    = article.type === 'email'
  const channel    = CHANNEL_ICONS[article.type] || '📝'
  const attachments = (article.attachments || []).filter(a => !a.preferences?.['Content-Disposition']?.includes('inline'))

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

        {/* Email headers (To / CC / Subject) */}
        {isEmail && (article.to || article.cc || article.subject) && (
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 2, textAlign: isAgent ? 'right' : 'left' }}>
            {article.subject && <span><strong style={{ color: T.navy }}>Subject:</strong> {article.subject}</span>}
            {article.to      && <span><strong style={{ color: T.navy }}>To:</strong> {article.to}</span>}
            {article.cc      && <span><strong style={{ color: T.navy }}>CC:</strong> {article.cc}</span>}
          </div>
        )}

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
              <button
                key={i}
                onClick={() => downloadAttachment(article.ticket_id, article.id, att)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 6,
                  background: '#f1f5f9', border: `1px solid ${T.border}`,
                  fontSize: 11, color: '#6366f1', cursor: 'pointer', fontWeight: 500,
                }}
              >
                📎 {att.filename || `Attachment ${i + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Reply type: 'public' | 'email' | 'internal'
const REPLY_TYPES = [
  { key: 'public',   label: 'Reply',         active: '#6366f1', activeText: '#fff' },
  { key: 'email',    label: 'Send Email',     active: '#0ea5e9', activeText: '#fff' },
  { key: 'internal', label: 'Internal Note',  active: '#f59e0b', activeText: '#fff' },
]

export default function ConversationTab({ ticketId, ticket, customerUser, onReplySent, isAgent, insertText, onInsertConsumed, isActive }) {
  const [articles,    setArticles]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [reply,       setReply]       = useState('')
  const [replyType,   setReplyType]   = useState('public')
  const [emailTo,     setEmailTo]     = useState('')
  const [emailCc,     setEmailCc]     = useState('')
  const [emailSubject,setEmailSubject]= useState('')
  const [sending,     setSending]     = useState(false)
  const [error,       setError]       = useState(null)
  const [file,        setFile]        = useState(null)
  const bottomRef       = useRef(null)
  const fileRef         = useRef(null)
  const autoDetectedRef = useRef(false)  // only auto-detect channel once per ticket

  const isEmail    = replyType === 'email'
  const isInternal = replyType === 'internal'

  // Auto-detect reply channel from the first external article.
  // If the ticket came in via email, default compose to email mode.
  useEffect(() => {
    if (autoDetectedRef.current || articles.length === 0) return
    autoDetectedRef.current = true
    const firstExternal = articles.find(a => !a.internal)
    if (firstExternal?.type === 'email') setReplyType('email')
  }, [articles])

  // When email mode is active, pre-fill To / Subject if not already set.
  // To comes from customerUser.email (real address), not ticket.customer (display name).
  useEffect(() => {
    if (replyType !== 'email') return
    if (!emailTo && customerUser?.email) setEmailTo(customerUser.email)
    if (!emailSubject && ticket?.title)  setEmailSubject(`Re: ${ticket.title}`)
  }, [replyType, customerUser])

  const load = () => {
    setLoading(true)
    zammadApi.getTicketArticles(ticketId)
      .then(a => setArticles(Array.isArray(a) ? a : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    autoDetectedRef.current = false  // reset so new ticket re-runs channel detection
    setReplyType('public')
    setEmailTo(''); setEmailCc(''); setEmailSubject('')
    load()
  }, [ticketId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [articles])

  useEffect(() => {
    if (isActive) requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }))
  }, [isActive])

  useEffect(() => {
    if (!insertText) return
    setReply(prev => prev ? prev + '\n\n' + insertText : insertText)
    setReplyType('public')
    onInsertConsumed?.()
  }, [insertText])

  const sendReply = async () => {
    if (!reply.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const payload = {
        ticket_id: ticketId,
        body: reply.trim(),
        internal: isInternal,
        sender: isAgent ? 'Agent' : 'Customer',
      }

      if (isEmail) {
        payload.type = 'email'
        if (emailTo)      payload.to      = emailTo
        if (emailCc)      payload.cc      = emailCc
        if (emailSubject) payload.subject = emailSubject
      } else if (isInternal) {
        payload.type = 'note'
      } else {
        payload.type = 'web'
      }

      if (file) {
        const data = await readFileAsBase64(file)
        payload.attachments = [{ filename: file.name, data, 'mime-type': file.type || 'application/octet-stream' }]
      }
      await zammadApi.createArticle(payload)
      setReply('')
      setFile(null)
      if (isEmail) { setEmailCc(''); setEmailSubject(''); setEmailTo('') }
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
        {/* Type toggle */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {(isAgent ? REPLY_TYPES : REPLY_TYPES.filter(t => t.key !== 'internal')).map(({ key, label, active, activeText }) => (
            <button
              key={key}
              onClick={() => setReplyType(key)}
              style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12, fontFamily: T.font,
                border: `1px solid ${replyType === key ? active : T.border}`,
                background: replyType === key ? active : '#fafafa',
                color: replyType === key ? activeText : T.muted,
                cursor: 'pointer', fontWeight: replyType === key ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Email headers */}
        {isEmail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: T.muted, width: 48, flexShrink: 0 }}>To</span>
              <input
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                placeholder="recipient@example.com"
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 6, border: `1px solid ${T.border}`,
                  fontSize: 12, fontFamily: T.font, color: T.navy, background: '#fafafa', outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: T.muted, width: 48, flexShrink: 0 }}>CC</span>
              <input
                value={emailCc}
                onChange={e => setEmailCc(e.target.value)}
                placeholder="cc@example.com (optional)"
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 6, border: `1px solid ${T.border}`,
                  fontSize: 12, fontFamily: T.font, color: T.navy, background: '#fafafa', outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: T.muted, width: 48, flexShrink: 0 }}>Subject</span>
              <input
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                placeholder="Subject…"
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 6, border: `1px solid ${T.border}`,
                  fontSize: 12, fontFamily: T.font, color: T.navy, background: '#fafafa', outline: 'none',
                }}
              />
            </div>
          </div>
        )}

        <textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          placeholder={isInternal ? 'Write an internal note…' : isEmail ? 'Compose email…' : 'Write a reply…'}
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '9px 12px',
            borderRadius: 7,
            border: `1px solid ${isInternal ? '#fef08a' : isEmail ? '#bae6fd' : T.border}`,
            fontSize: 13, fontFamily: T.font, color: T.navy,
            background: isInternal ? '#fffef7' : isEmail ? '#f0f9ff' : '#fafafa',
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
              background: !reply.trim() || sending
                ? '#e5e7eb'
                : isInternal ? '#f59e0b' : isEmail ? '#0ea5e9' : '#6366f1',
              color: !reply.trim() || sending ? T.muted : '#fff',
            }}
          >
            {sending ? 'Sending…' : isInternal ? 'Add Note' : isEmail ? 'Send Email' : 'Send Reply'}
          </button>
        </div>
      </div>
    </div>
  )
}
