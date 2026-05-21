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
  const timeSpent = article.time_unit ? Number(article.time_unit) : 0

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
          {timeSpent > 0 && (
            <span style={{ color: T.muted }}>· ⏱ {timeSpent}m</span>
          )}
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
          wordBreak: 'break-word',
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

// Minimal WYSIWYG toolbar button
function FmtBtn({ title, onClick, children }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      style={{
        background: 'none', border: `1px solid ${T.border}`, borderRadius: 4,
        padding: '2px 7px', fontSize: 13, cursor: 'pointer', color: T.navy,
        fontFamily: 'inherit', lineHeight: 1.4,
      }}
    >
      {children}
    </button>
  )
}

function Toolbar({ onLink }) {
  const fmt = (cmd, val) => document.execCommand(cmd, false, val)
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
      <FmtBtn title="Bold (Ctrl+B)"     onClick={() => fmt('bold')}><strong>B</strong></FmtBtn>
      <FmtBtn title="Italic (Ctrl+I)"   onClick={() => fmt('italic')}><em>I</em></FmtBtn>
      <FmtBtn title="Underline (Ctrl+U)"onClick={() => fmt('underline')}><u>U</u></FmtBtn>
      <FmtBtn title="Bullet list"       onClick={() => fmt('insertUnorderedList')}>• List</FmtBtn>
      <FmtBtn title="Numbered list"     onClick={() => fmt('insertOrderedList')}>1. List</FmtBtn>
      <FmtBtn title="Insert link"       onClick={onLink}>🔗 Link</FmtBtn>
      <FmtBtn title="Clear formatting"  onClick={() => fmt('removeFormat')}>✕ Clear</FmtBtn>
    </div>
  )
}

export default function ConversationTab({ ticketId, ticket, customerUser, onReplySent, isAgent, insertText, onInsertConsumed, isActive }) {
  const [articles,    setArticles]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [isEmpty,     setIsEmpty]     = useState(true)
  const [replyType,   setReplyType]   = useState('public')
  const [emailTo,     setEmailTo]     = useState('')
  const [emailCc,     setEmailCc]     = useState('')
  const [emailSubject,setEmailSubject]= useState('')
  const [sending,     setSending]     = useState(false)
  const [error,       setError]       = useState(null)
  const [file,        setFile]        = useState(null)
  const [timeSpent,   setTimeSpent]   = useState('')
  const bottomRef       = useRef(null)
  const fileRef         = useRef(null)
  const editorRef       = useRef(null)
  const autoDetectedRef = useRef(false)

  const isEmail    = replyType === 'email'
  const isInternal = replyType === 'internal'

  // Auto-detect reply channel from the first external article
  useEffect(() => {
    if (autoDetectedRef.current || articles.length === 0) return
    autoDetectedRef.current = true
    const firstExternal = articles.find(a => !a.internal)
    if (firstExternal?.type === 'email') setReplyType('email')
  }, [articles])

  // Pre-fill To / Subject in email mode
  useEffect(() => {
    if (replyType !== 'email') return
    if (!emailTo && customerUser?.email) setEmailTo(customerUser.email)
    if (!emailSubject && ticket?.title)  setEmailSubject(`Re: ${ticket.title}`)
  }, [replyType, customerUser])

  const clearEditor = () => {
    if (editorRef.current) editorRef.current.innerHTML = ''
    setIsEmpty(true)
  }

  const load = () => {
    setLoading(true)
    zammadApi.getTicketArticles(ticketId)
      .then(a => setArticles(Array.isArray(a) ? a : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    autoDetectedRef.current = false
    setReplyType('public')
    setEmailTo(''); setEmailCc(''); setEmailSubject('')
    setTimeSpent('')
    clearEditor()
    load()
  }, [ticketId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [articles])

  useEffect(() => {
    if (isActive) requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }))
  }, [isActive])

  // Insert KB text into editor
  useEffect(() => {
    if (!insertText) return
    const el = editorRef.current
    if (el) {
      const current = el.innerHTML
      el.innerHTML = current && current !== '' ? current + '<br><br>' + insertText : insertText
      setIsEmpty(false)
    }
    setReplyType('public')
    onInsertConsumed?.()
  }, [insertText])

  const handleLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) document.execCommand('createLink', false, url)
  }

  const getEditorBody = () => {
    const el = editorRef.current
    if (!el) return ''
    const html = el.innerHTML.trim()
    if (html === '' || html === '<br>') return ''
    return html
  }

  const sendReply = async () => {
    const body = getEditorBody()
    if (!body || sending) return
    setSending(true)
    setError(null)
    try {
      const payload = {
        ticket_id: ticketId,
        body,
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

      const mins = parseInt(timeSpent, 10)
      if (mins > 0) payload.time_unit = mins

      if (file) {
        const data = await readFileAsBase64(file)
        payload.attachments = [{ filename: file.name, data, 'mime-type': file.type || 'application/octet-stream' }]
      }
      await zammadApi.createArticle(payload)
      clearEditor()
      setFile(null)
      setTimeSpent('')
      if (isEmail) { setEmailCc(''); setEmailSubject(''); setEmailTo('') }
      load()
      onReplySent?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const editorBg = isInternal ? '#fffef7' : isEmail ? '#f0f9ff' : '#fafafa'
  const editorBorder = isInternal ? '#fef08a' : isEmail ? '#bae6fd' : T.border

  if (loading) {
    return <div style={{ padding: 32, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
  }

  // Total time on ticket
  const totalTime = articles.reduce((sum, a) => sum + (Number(a.time_unit) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Thread header with total time */}
      {totalTime > 0 && (
        <div style={{ padding: '4px 20px', background: '#f8f9fb', borderBottom: `1px solid ${T.border}`, fontSize: 11, color: T.muted }}>
          ⏱ Total time logged: {totalTime}m
        </div>
      )}

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

        {/* WYSIWYG toolbar */}
        <Toolbar onLink={handleLink} />

        {/* Contenteditable editor */}
        <div style={{ position: 'relative' }}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={() => {
              const el = editorRef.current
              if (!el) return
              const html = el.innerHTML
              setIsEmpty(html === '' || html === '<br>')
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                sendReply()
              }
            }}
            style={{
              minHeight: 72, maxHeight: 200, overflowY: 'auto',
              padding: '9px 12px', borderRadius: 7,
              border: `1px solid ${editorBorder}`,
              fontSize: 13, fontFamily: T.font, color: T.navy,
              background: editorBg, outline: 'none',
              lineHeight: 1.6,
            }}
          />
          {isEmpty && (
            <div style={{
              position: 'absolute', top: '9px', left: '13px',
              fontSize: 13, color: '#bbb', pointerEvents: 'none', fontFamily: T.font,
            }}>
              {isInternal ? 'Write an internal note…' : isEmail ? 'Compose email…' : 'Write a reply…'}
            </div>
          )}
        </div>

        {/* File preview */}
        {file && (
          <div style={{ marginTop: 6, fontSize: 12, color: T.muted }}>
            📎 {file.name}
            <button onClick={() => setFile(null)} style={{ marginLeft: 6, background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 11 }}>✕</button>
          </div>
        )}

        {error && <div style={{ fontSize: 11, color: T.red, marginTop: 6 }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 13, padding: '4px 8px' }}
              title="Attach file"
            >
              📎
            </button>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0] || null)} />

            {/* Time tracking */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: T.muted }}>⏱</span>
              <input
                type="number"
                min="0"
                step="1"
                value={timeSpent}
                onChange={e => setTimeSpent(e.target.value)}
                placeholder="min"
                style={{
                  width: 54, padding: '4px 6px', borderRadius: 5,
                  border: `1px solid ${T.border}`, fontSize: 12,
                  fontFamily: T.font, color: T.navy, outline: 'none',
                  background: '#fafafa',
                }}
              />
            </div>
          </div>

          <button
            onClick={sendReply}
            disabled={isEmpty || sending}
            style={{
              padding: '7px 20px', borderRadius: 7, border: 'none',
              fontSize: 13, fontWeight: 600, fontFamily: T.font, cursor: 'pointer',
              background: isEmpty || sending
                ? '#e5e7eb'
                : isInternal ? '#f59e0b' : isEmail ? '#0ea5e9' : '#6366f1',
              color: isEmpty || sending ? T.muted : '#fff',
            }}
          >
            {sending ? 'Sending…' : isInternal ? 'Add Note' : isEmail ? 'Send Email' : 'Send Reply'}
          </button>
        </div>
      </div>
    </div>
  )
}
