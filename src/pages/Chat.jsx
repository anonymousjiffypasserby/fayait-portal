import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { useAuth } from '../context/AuthContext'

// ── MeetingRoomEmbed — Jitsi panel used inside Chat ────────────────────────────
function MeetingRoomEmbed({ domain, roomName, displayName, jwt, audioOnly, onLeave }) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !window.JitsiMeetExternalAPI) return
    const toolbarButtons = audioOnly
      ? ['microphone', 'hangup', 'raisehand', 'settings', 'fodeviceselection']
      : ['microphone', 'camera', 'desktop', 'fullscreen', 'hangup', 'raisehand', 'settings', 'tileview', 'fodeviceselection']

    apiRef.current = new window.JitsiMeetExternalAPI(domain, {
      roomName,
      parentNode: containerRef.current,
      userInfo: { displayName },
      ...(jwt ? { jwt } : {}),
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: audioOnly,
        disableDeepLinking: true,
        prejoinPageEnabled: false,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: toolbarButtons,
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        MOBILE_APP_PROMO: false,
      },
      width: '100%',
      height: '100%',
    })
    apiRef.current.addEventListener('videoConferenceLeft', onLeave)
    return () => { apiRef.current?.dispose() }
  }, [domain, roomName, displayName, jwt, audioOnly, onLeave])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

const BASE     = import.meta.env.VITE_API_URL || 'https://api.fayait.com'
const getToken = () => localStorage.getItem('faya_token')
const authHdr  = () => ({ 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) })

async function cx(method, path, body, params) {
  let url = `${BASE}/api${path}`
  if (params) {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null))
    if (q.toString()) url += `?${q}`
  }
  const res = await fetch(url, { method, headers: authHdr(), ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.06)', muted: '#888',
  orange: '#f97316', blue: '#2563eb', green: '#1D9E75',
  red: '#e74c3c', yellow: '#d97706',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
  sb:     '#1B2A4A',
  sbLine: 'rgba(255,255,255,0.07)',
  sbText: 'rgba(255,255,255,0.75)',
  sbMute: 'rgba(255,255,255,0.35)',
}
const SIDEBAR_W  = 268
const MEMBERS_W  = 216
const POLL_MS    = 4000
const GROUP_MS   = 5 * 60 * 1000
const QUICK_EMOJIS = ['👍','👎','❤️','😂','🎉','😮','😢','😡','🔥','✅','🙏','💯','🚀','🤔','👏','💪']

// ── utils ──────────────────────────────────────────────────────────────────────
function slugifyRoom(name) {
  return 'chat-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function ts2time(ts) {
  if (!ts) return ''
  const d = new Date(ts), now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function ts2full(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function ts2date(ts) {
  const d = new Date(ts), now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  if (d.toDateString() === new Date(now - 86400000).toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result.split(',')[1])
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

// ── Av ────────────────────────────────────────────────────────────────────────
function Av({ name, size = 32 }) {
  const ini = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const hue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: `hsl(${hue},50%,44%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.37, fontWeight: 700, userSelect: 'none' }}>{ini}</div>
  )
}

// ── AuthImage — fetches Matrix media via portal-api proxy ─────────────────────
function AuthImage({ mxc, style, alt = '' }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    if (!mxc) return
    let blobUrl
    fetch(`${BASE}/api/chat/media?mxc=${encodeURIComponent(mxc)}`, { headers: authHdr() })
      .then(r => r.blob())
      .then(b => { blobUrl = URL.createObjectURL(b); setSrc(blobUrl) })
      .catch(() => setSrc('error'))
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [mxc])

  if (!src) return <div style={{ width: 200, height: 120, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 11 }}>Loading…</div>
  if (src === 'error') return <div style={{ color: T.muted, fontSize: 11 }}>Image unavailable</div>
  return <img src={src} alt={alt} style={{ maxWidth: 320, maxHeight: 240, borderRadius: 8, display: 'block', ...style }} />
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function MarkdownText({ text }) {
  if (!text) return null
  const parts = text.split(/(```[\s\S]*?```)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\n/, '').replace(/\n$/, '')
          return (
            <pre key={i} style={{ background: '#f3f4f6', padding: '8px 12px', borderRadius: 6, fontSize: 12, overflowX: 'auto', margin: '4px 0', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <code>{code}</code>
            </pre>
          )
        }
        return <InlineMd key={i} text={part} />
      })}
    </>
  )
}

function InlineMd({ text }) {
  const tokens = []
  const re = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`|\bhttps?:\/\/[^\s<>]+|@[\w.]+)/g
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ t: 'txt', v: text.slice(last, m.index) })
    const s = m[0]
    if (s.startsWith('**')) tokens.push({ t: 'bold', v: s.slice(2, -2) })
    else if (s.startsWith('*') || (s.startsWith('_') && s.endsWith('_'))) tokens.push({ t: 'italic', v: s.slice(1, -1) })
    else if (s.startsWith('`')) tokens.push({ t: 'code', v: s.slice(1, -1) })
    else if (s.startsWith('http')) tokens.push({ t: 'link', v: s })
    else tokens.push({ t: 'mention', v: s })
    last = m.index + s.length
  }
  if (last < text.length) tokens.push({ t: 'txt', v: text.slice(last) })

  return (
    <>
      {tokens.map((tk, i) => {
        if (tk.t === 'txt') {
          return (
            <Fragment key={i}>
              {tk.v.split('\n').map((l, j) => (
                <Fragment key={j}>{j > 0 && <br />}{l}</Fragment>
              ))}
            </Fragment>
          )
        }
        if (tk.t === 'bold')    return <strong key={i}>{tk.v}</strong>
        if (tk.t === 'italic')  return <em key={i}>{tk.v}</em>
        if (tk.t === 'code')    return <code key={i} style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 4, fontSize: '0.9em', fontFamily: 'monospace' }}>{tk.v}</code>
        if (tk.t === 'link')    return <a key={i} href={tk.v} target="_blank" rel="noopener noreferrer" style={{ color: T.blue }}>{tk.v}</a>
        if (tk.t === 'mention') return <span key={i} style={{ color: T.blue, fontWeight: 500 }}>{tk.v}</span>
        return tk.v
      })}
    </>
  )
}

// ── EmojiPicker ───────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return (
    <div ref={ref} style={{ position: 'absolute', bottom: '100%', right: 0, background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10, padding: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 200, display: 'flex', flexWrap: 'wrap', width: 180, gap: 2 }}>
      {QUICK_EMOJIS.map(e => (
        <button key={e} onClick={() => { onSelect(e); onClose() }}
          style={{ width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={el => el.currentTarget.style.background = '#f3f4f6'}
          onMouseLeave={el => el.currentTarget.style.background = 'none'}>
          {e}
        </button>
      ))}
    </div>
  )
}

// ── UserPickerModal ───────────────────────────────────────────────────────────
function UserPickerModal({ title, onClose, onSelect, exclude = [] }) {
  const [users, setUsers]   = useState([])
  const [q, setQ]           = useState('')
  const [loading, setLoad]  = useState(true)
  const [busy, setBusy]     = useState(null)

  useEffect(() => {
    cx('GET', '/chat/users').then(d => setUsers(d.users || [])).catch(() => {}).finally(() => setLoad(false))
  }, [])

  const list = users.filter(u => !exclude.includes(u.matrix_username) &&
    (u.name?.toLowerCase().includes(q.toLowerCase()) || u.matrix_username?.toLowerCase().includes(q.toLowerCase()))
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: T.card, borderRadius: 12, padding: '22px 26px', width: 400, maxHeight: '60vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.navy }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: T.muted, cursor: 'pointer' }}>×</button>
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people…" autoFocus
          style={{ width: '100%', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 7, outline: 'none', marginBottom: 10, fontFamily: T.font }} />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? <div style={{ padding: 20, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
            : list.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: T.muted, fontSize: 13 }}>No users found</div>
            : list.map(u => (
              <div key={u.id} onClick={() => { if (busy !== u.id) { setBusy(u.id); onSelect(u).finally(() => setBusy(null)) } }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <Av name={u.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>{u.name}</div>
                  {u.department_name && <div style={{ fontSize: 11, color: T.muted }}>{u.department_name}</div>}
                </div>
                {busy === u.id && <div style={{ fontSize: 11, color: T.muted }}>…</div>}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// ── CreateChannelModal ────────────────────────────────────────────────────────
function CreateChannelModal({ onClose, onCreated }) {
  const [name, setName]       = useState('')
  const [topic, setTopic]     = useState('')
  const [users, setUsers]     = useState([])
  const [invited, setInvited] = useState([])
  const [q, setQ]             = useState('')
  const [loading, setLoad]    = useState(false)
  const [err, setErr]         = useState('')

  useEffect(() => { cx('GET', '/chat/users').then(d => setUsers(d.users || [])).catch(() => {}) }, [])
  const sugg = users.filter(u => !invited.find(i => i.id === u.id) && u.name?.toLowerCase().includes(q.toLowerCase())).slice(0, 6)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoad(true); setErr('')
    try {
      const data = await cx('POST', '/chat/rooms', { name: name.trim(), topic: topic.trim(), inviteUsernames: invited.map(u => u.matrix_username) })
      onCreated(data.roomId)
    } catch (e) { setErr(e.message) } finally { setLoad(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: T.card, borderRadius: 12, padding: '24px 28px', width: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.navy }}>Create Channel</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: T.muted, cursor: 'pointer' }}>×</button>
        </div>
        <form onSubmit={submit}>
          {[['Channel Name', name, setName, 'e.g. general', true], ['Topic (optional)', topic, setTopic, 'What\'s this channel about?', false]].map(([lbl, val, set, ph, af]) => (
            <div key={lbl}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', marginBottom: 5 }}>{lbl}</label>
              <input value={val} onChange={e => set(e.target.value)} placeholder={ph} autoFocus={af}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 7, outline: 'none', marginBottom: 12, fontFamily: T.font }} />
            </div>
          ))}
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', marginBottom: 5 }}>Invite People</label>
          {invited.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {invited.map(u => (
                <span key={u.id} style={{ background: '#eef2ff', color: T.blue, fontSize: 12, padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {u.name}<span onClick={() => setInvited(p => p.filter(i => i.id !== u.id))} style={{ cursor: 'pointer', fontSize: 14 }}>×</span>
                </span>
              ))}
            </div>
          )}
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people to add…"
            style={{ width: '100%', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 7, outline: 'none', marginBottom: 4, fontFamily: T.font }} />
          {q && sugg.length > 0 && (
            <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
              {sugg.map(u => (
                <div key={u.id} onClick={() => { setInvited(p => [...p, u]); setQ('') }}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: T.navy }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >{u.name}{u.department_name ? ` · ${u.department_name}` : ''}</div>
              ))}
            </div>
          )}
          {err && <div style={{ color: T.red, fontSize: 12, marginBottom: 10 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 18px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 7, background: 'none', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button type="submit" disabled={loading || !name.trim()} style={{ padding: '8px 18px', background: T.orange, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500, opacity: loading || !name.trim() ? 0.6 : 1 }}>
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── MembersPanel ──────────────────────────────────────────────────────────────
function MembersPanel({ roomId, memberCount, onClose }) {
  const [members, setMembers] = useState([])
  const [loading, setLoad]    = useState(true)
  useEffect(() => {
    if (!roomId) return
    setLoad(true)
    cx('GET', `/chat/rooms/${encodeURIComponent(roomId)}/members`)
      .then(d => setMembers(d.members || []))
      .catch(() => {})
      .finally(() => setLoad(false))
  }, [roomId])
  return (
    <div style={{ width: MEMBERS_W, flexShrink: 0, background: T.bg, borderLeft: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>Members ({memberCount || members.length})</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: T.muted, cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {loading ? <div style={{ padding: 16, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
          : members.map(m => (
            <div key={m.mxid} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 4px', borderRadius: 6 }}>
              <Av name={m.displayName} size={28} />
              <div style={{ fontSize: 13, color: T.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.displayName}</div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ── SideSection ───────────────────────────────────────────────────────────────
function SideSection({ label, action, collapsed, onToggle, children }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 4px', cursor: 'pointer' }}
        onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 9, color: T.sbMute, transition: 'transform 0.15s', display: 'inline-block', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.sbMute, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
        </div>
        {action && (
          <button onClick={e => { e.stopPropagation(); action.onClick() }} title={action.title}
            style={{ background: 'none', border: 'none', color: T.sbMute, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>+</button>
        )}
      </div>
      {!collapsed && children}
    </div>
  )
}

// ── RoomItem ──────────────────────────────────────────────────────────────────
function RoomItem({ room, active, isDm, muted, onClick }) {
  const hasUnread = room.unread_count > 0 && !muted
  return (
    <div onClick={onClick}
      style={{ padding: '5px 10px', cursor: 'pointer', borderRadius: 6, margin: '1px 6px', background: active ? 'rgba(249,115,22,0.2)' : 'transparent', display: 'flex', alignItems: 'center', gap: 9, transition: 'background 0.12s' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
      {isDm
        ? <div style={{ position: 'relative', flexShrink: 0 }}><Av name={room.dm_partner_name || room.name} size={26} /></div>
        : <span style={{ color: active ? '#fff' : T.sbMute, fontSize: 14, fontWeight: 500, width: 20, textAlign: 'center', flexShrink: 0 }}>#</span>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: active ? '#fff' : (hasUnread ? '#fff' : T.sbText), fontWeight: hasUnread ? 600 : 400 }}>{room.name}</div>
        {room.lastMessage && (
          <div style={{ fontSize: 11, color: T.sbMute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {room.lastMessage.senderName ? `${room.lastMessage.senderName}: ` : ''}{room.lastMessage.body}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        {room.lastMessage && <span style={{ fontSize: 10, color: T.sbMute }}>{ts2time(room.lastMessage.ts)}</span>}
        {muted && <span style={{ fontSize: 10, color: T.sbMute }}>🔕</span>}
        {hasUnread && <span style={{ background: T.orange, color: '#fff', fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{room.unread_count > 99 ? '99+' : room.unread_count}</span>}
      </div>
    </div>
  )
}

// ── MessageRow ────────────────────────────────────────────────────────────────
function MessageRow({ msg, grouped, myMxid, messages, onReply, onEdit, onDelete, onReact, onUnreact }) {
  const [hovered, setHovered]   = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const isMe    = msg.sender === myMxid
  const isImage = msg.msgtype === 'm.image'
  const isFile  = !isImage && msg.msgtype !== 'm.text' && msg.msgtype !== 'm.notice'
  const replyCtx = msg.replyToEventId ? messages.find(m => m.eventId === msg.replyToEventId) : null

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmoji(false) }}
      style={{ position: 'relative', padding: grouped ? '1px 20px 1px 20px' : '8px 20px 1px 20px', background: hovered ? 'rgba(0,0,0,0.02)' : 'transparent' }}>

      {/* Reply context */}
      {replyCtx && (
        <div style={{ marginLeft: 46, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.muted }}>
          <span style={{ color: T.blue }}>↩</span>
          <span style={{ fontWeight: 500, color: T.navy }}>{replyCtx.senderName}:</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{replyCtx.body.slice(0, 80)}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Avatar or spacer */}
        <div style={{ width: 36, flexShrink: 0, marginTop: 2 }}>
          {!grouped ? <Av name={msg.senderName} size={34} /> : null}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + time */}
          {!grouped && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>{isMe ? 'You' : msg.senderName}</span>
              <span style={{ fontSize: 10, color: T.muted }}>{ts2full(msg.ts)}</span>
              {msg.isEdited && <span style={{ fontSize: 10, color: T.muted, fontStyle: 'italic' }}>(edited)</span>}
            </div>
          )}

          {/* Content */}
          {isImage && msg.url ? (
            <div style={{ marginBottom: 2 }}>
              <AuthImage mxc={msg.url} alt={msg.filename || 'image'} />
            </div>
          ) : isFile && msg.url ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f3f4f6', padding: '8px 12px', borderRadius: 8, marginBottom: 2, fontSize: 13 }}>
              <span>📎</span>
              <span style={{ color: T.navy, fontWeight: 500 }}>{msg.filename || 'File'}</span>
              <a href={`${BASE}/api/chat/media?mxc=${encodeURIComponent(msg.url)}&_t=${getToken()}`}
                download={msg.filename}
                onClick={e => { e.preventDefault(); downloadMedia(msg.url, msg.filename) }}
                style={{ color: T.blue, fontSize: 12 }}>Download</a>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, wordBreak: 'break-word' }}>
              <MarkdownText text={msg.body} />
              {grouped && msg.isEdited && <span style={{ fontSize: 10, color: T.muted, fontStyle: 'italic', marginLeft: 6 }}>(edited)</span>}
            </div>
          )}

          {/* Reactions */}
          {Object.keys(msg.reactions || {}).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {Object.entries(msg.reactions).map(([key, data]) => (
                <button key={key}
                  onClick={() => data.reacted ? onUnreact(data.myEventId, msg.eventId, key) : onReact(msg.eventId, key)}
                  style={{ padding: '2px 8px', borderRadius: 12, fontSize: 14, background: data.reacted ? '#eef2ff' : 'rgba(0,0,0,0.05)', border: data.reacted ? '1px solid #c7d2fe' : '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.1s' }}>
                  {key}<span style={{ fontSize: 11, color: T.muted, lineHeight: 1 }}>{data.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hover timestamp for grouped messages */}
        {grouped && hovered && (
          <div style={{ fontSize: 10, color: T.muted, flexShrink: 0, paddingTop: 2, whiteSpace: 'nowrap' }}>{ts2full(msg.ts)}</div>
        )}
      </div>

      {/* Hover toolbar */}
      {hovered && (
        <div style={{ position: 'absolute', right: 16, top: grouped ? -2 : -16, background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, display: 'flex', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 10 }}>
          <div style={{ position: 'relative' }}>
            <ToolBtn emoji="😊" title="React" onClick={() => setShowEmoji(v => !v)} />
            {showEmoji && <EmojiPicker onSelect={key => { onReact(msg.eventId, key); setShowEmoji(false) }} onClose={() => setShowEmoji(false)} />}
          </div>
          <ToolBtn emoji="↩" title="Reply" onClick={() => onReply(msg)} />
          {isMe && <ToolBtn emoji="✏️" title="Edit" onClick={() => onEdit(msg)} />}
          {isMe && <ToolBtn emoji="🗑" title="Delete" onClick={() => onDelete(msg.eventId)} />}
        </div>
      )}
    </div>
  )
}

function ToolBtn({ emoji, title, onClick }) {
  return (
    <button onClick={onClick} title={title}
      style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
      {emoji}
    </button>
  )
}

async function downloadMedia(mxc, filename) {
  try {
    const r = await fetch(`${BASE}/api/chat/media?mxc=${encodeURIComponent(mxc)}`, { headers: authHdr() })
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename || 'file'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {}
}

// ── MessageList ───────────────────────────────────────────────────────────────
function MessageList({ messages, myMxid, onReply, onEdit, onDelete, onReact, onUnreact }) {
  const els = []
  let prevDate = null, prevSender = null, prevTs = 0

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const dateStr = new Date(msg.ts).toDateString()

    if (dateStr !== prevDate) {
      els.push(
        <div key={`d-${msg.ts}`} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 20px 8px' }}>
          <div style={{ flex: 1, height: 1, background: T.border }} />
          <span style={{ fontSize: 11, color: T.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>{ts2date(msg.ts)}</span>
          <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>
      )
      prevDate = dateStr
      prevSender = null
    }

    const grouped = prevSender === msg.sender && (msg.ts - prevTs) < GROUP_MS && !msg.replyToEventId
    prevSender = msg.sender
    prevTs = msg.ts

    els.push(
      <MessageRow
        key={msg.eventId || i}
        msg={msg}
        grouped={grouped}
        myMxid={myMxid}
        messages={messages}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onReact={onReact}
        onUnreact={onUnreact}
      />
    )
  }
  return <>{els}</>
}

// ── Main Chat component ───────────────────────────────────────────────────────
export default function Chat() {
  const { user, serviceUrls, jitsiToken, jitsiUrl } = useAuth()
  const isAdmin      = ['admin', 'superadmin'].includes(user?.role)
  const matrixServer = serviceUrls?.matrixServerName || 'matrix.fayait.com'
  const myMxid       = user?.matrix_username ? `@${user.matrix_username}:${matrixServer}` : null
  const workspaceName = serviceUrls?.companyName || 'Chat'
  const jitsiDomain   = (jitsiUrl || serviceUrls?.meetings || '').replace(/^https?:\/\//, '').replace(/\/$/, '')

  // ─── core state ────────────────────────────────────────────────────────────
  const [rooms, setRooms]               = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messages, setMessages]         = useState([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingMsgs, setLoadingMsgs]   = useState(false)
  const [draft, setDraft]               = useState('')
  const [sending, setSending]           = useState(false)
  const [nextBatch, setNextBatch]       = useState(null)
  const [msgsEnd, setMsgsEnd]           = useState(null)
  const [roomSearch, setRoomSearch]     = useState('')
  const [noAccount, setNoAccount]       = useState(false)
  const [globalErr, setGlobalErr]       = useState('')

  // ─── UI panels ─────────────────────────────────────────────────────────────
  const [showMembers, setShowMembers]   = useState(false)
  const [showNewDm, setShowNewDm]       = useState(false)
  const [showCreate, setShowCreate]     = useState(false)
  const [showInvite, setShowInvite]     = useState(false)
  const [showRoomMenu, setShowRoomMenu] = useState(false)
  const [collapsed, setCollapsed]       = useState({ dms: false, channels: false })
  const [mutedRooms, setMutedRooms]     = useState(() => new Set(JSON.parse(localStorage.getItem('chat_muted') || '[]')))
  const [atBottom, setAtBottom]         = useState(true)
  const atBottomRef = useRef(true)

  // ─── message interactions ───────────────────────────────────────────────────
  const [replyTo, setReplyTo]       = useState(null)  // { eventId, senderName, body }
  const [editingMsg, setEditingMsg] = useState(null)  // { eventId, body }
  const [editText, setEditText]     = useState('')

  // ─── file upload ────────────────────────────────────────────────────────────
  const [uploadFile, setUploadFile] = useState(null)  // { file, preview, name, type }
  const [uploading, setUploading]   = useState(false)
  const fileInputRef = useRef(null)

  // ─── typing indicators ──────────────────────────────────────────────────────
  const [typingUsers, setTypingUsers]   = useState({})  // roomId -> [displayName]
  const [userMap, setUserMap]           = useState({})  // matrix_username -> name
  const [mentionUsers, setMentionUsers] = useState([])
  const typingTimerRef = useRef(null)
  const isTypingRef    = useRef(false)

  // ─── @mention autocomplete ──────────────────────────────────────────────────
  const [mentionQ, setMentionQ]   = useState(null)  // string or null

  // ─── search ─────────────────────────────────────────────────────────────────
  const [showSearch, setShowSearch]   = useState(false)
  const [searchQ, setSearchQ]         = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]     = useState(false)

  // ─── call ────────────────────────────────────────────────────────────────────
  const [activeCall, setActiveCall]   = useState(null)  // null | { slug, mode }
  const [jitsiLoaded, setJitsiLoaded] = useState(!!window.JitsiMeetExternalAPI)

  // ─── refs ───────────────────────────────────────────────────────────────────
  const bottomRef       = useRef(null)
  const textareaRef     = useRef(null)
  const editTextareaRef = useRef(null)
  const syncRef         = useRef(null)
  const scrollRef       = useRef(null)
  const selectedRoomRef = useRef(null)
  selectedRoomRef.current = selectedRoom

  // ─── scroll helpers ─────────────────────────────────────────────────────────
  const scrollBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }
  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const ab = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    atBottomRef.current = ab
    setAtBottom(ab)
  }

  // ─── load users for mentions + typing ───────────────────────────────────────
  useEffect(() => {
    cx('GET', '/chat/users').then(d => {
      const users = d.users || []
      setMentionUsers(users)
      const map = {}
      for (const u of users) { if (u.matrix_username) map[u.matrix_username] = u.name }
      setUserMap(map)
    }).catch(() => {})
  }, [])

  // ─── load rooms ─────────────────────────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    try {
      const data = await cx('GET', '/chat/rooms')
      setRooms(data.rooms || [])
      setNextBatch(prev => prev || data.nextBatch)
      setLoadingRooms(false)
      requestNotifPermission()
    } catch (err) {
      const msg = err.message
      if (msg?.includes('Matrix account') || msg?.includes('not provisioned')) setNoAccount(true)
      else setGlobalErr(msg)
      setLoadingRooms(false)
    }
  }, [])

  // ─── load messages ───────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (roomId) => {
    setLoadingMsgs(true)
    setMessages([])
    setReplyTo(null)
    setEditingMsg(null)
    try {
      const data = await cx('GET', `/chat/rooms/${encodeURIComponent(roomId)}/messages`, undefined, { limit: 50 })
      setMessages(data.messages || [])
      setMsgsEnd(data.end || null)
      const latest = data.messages?.at(-1)
      if (latest?.eventId) {
        cx('POST', `/chat/rooms/${encodeURIComponent(roomId)}/read`, { eventId: latest.eventId }).catch(() => {})
        setRooms(prev => prev.map(r => r.roomId === roomId ? { ...r, unread_count: 0 } : r))
      }
      setTimeout(() => scrollBottom(false), 40)
    } catch (err) {
      console.error('[chat] loadMessages:', err.message)
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  // ─── typing ─────────────────────────────────────────────────────────────────
  function sendTyping(typing) {
    const room = selectedRoomRef.current
    if (!room) return
    if (typing && !isTypingRef.current) {
      isTypingRef.current = true
      cx('PUT', `/chat/rooms/${encodeURIComponent(room.roomId)}/typing`, { typing: true }).catch(() => {})
    }
    clearTimeout(typingTimerRef.current)
    if (typing) {
      typingTimerRef.current = setTimeout(() => {
        isTypingRef.current = false
        cx('PUT', `/chat/rooms/${encodeURIComponent(room.roomId)}/typing`, { typing: false }).catch(() => {})
      }, 3000)
    } else {
      isTypingRef.current = false
      cx('PUT', `/chat/rooms/${encodeURIComponent(room.roomId)}/typing`, { typing: false }).catch(() => {})
    }
  }

  // ─── browser notifications ──────────────────────────────────────────────────
  function requestNotifPermission() {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
  }
  function showNotif(msg, roomName) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    if (document.hasFocus()) return
    const n = new Notification(`${msg.senderName} in ${roomName}`, { body: msg.body.slice(0, 100), icon: '/favicon.ico' })
    n.onclick = () => window.focus()
  }

  // ─── load Jitsi script ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!jitsiDomain || window.JitsiMeetExternalAPI) return
    const script = document.createElement('script')
    script.src = `https://${jitsiDomain}/external_api.js`
    script.async = true
    script.onload = () => setJitsiLoaded(true)
    document.head.appendChild(script)
    return () => { if (document.head.contains(script)) document.head.removeChild(script) }
  }, [jitsiDomain])

  // ─── init ────────────────────────────────────────────────────────────────────
  useEffect(() => { loadRooms() }, [loadRooms])
  useEffect(() => { if (rooms.length && !selectedRoom) setSelectedRoom(rooms[0]) }, [rooms, selectedRoom])
  useEffect(() => {
    if (selectedRoom?.roomId) { setShowMembers(false); setActiveCall(null); loadMessages(selectedRoom.roomId) }
  }, [selectedRoom?.roomId, loadMessages])

  // ─── sync poll ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!nextBatch) return
    const poll = async () => {
      try {
        const { nextBatch: nb, rooms: updates, unread, typing } = await cx('GET', '/chat/sync', undefined, { since: nextBatch })
        if (nb) setNextBatch(nb)

        // Typing updates
        if (typing && Object.keys(typing).length) {
          setTypingUsers(prev => {
            const next = { ...prev }
            for (const [roomId, mxids] of Object.entries(typing)) {
              const names = mxids
                .filter(id => id !== myMxid)
                .map(id => { const u = id.split(':')[0].slice(1); return userMap[u] || u })
              if (names.length) next[roomId] = names
              else delete next[roomId]
            }
            return next
          })
        }

        // Unread counts
        if (unread && Object.keys(unread).length) {
          setRooms(prev => prev.map(r => {
            if (r.roomId === selectedRoomRef.current?.roomId) return { ...r, unread_count: 0 }
            return unread[r.roomId] !== undefined ? { ...r, unread_count: unread[r.roomId] } : r
          }))
        }

        // Room content updates
        if (updates && Object.keys(updates).length) {
          const cur = selectedRoomRef.current

          for (const [roomId, roomData] of Object.entries(updates)) {
            const { messages: newMsgs = [], edits = [], reactions: newReacts = [], redactions = [] } = roomData

            if (cur && roomId === cur.roomId) {
              // New messages
              if (newMsgs.length) {
                setMessages(prev => {
                  const ids = new Set(prev.map(m => m.eventId))
                  const fresh = newMsgs.filter(m => !ids.has(m.eventId))
                  if (!fresh.length) return prev
                  setTimeout(() => { if (atBottomRef.current) scrollBottom(true) }, 40)
                  for (const m of fresh) {
                    if (m.sender !== myMxid) showNotif(m, cur.name)
                  }
                  return [...prev, ...fresh]
                })
                const lastEvt = newMsgs.at(-1)?.eventId
                if (lastEvt) cx('POST', `/chat/rooms/${encodeURIComponent(cur.roomId)}/read`, { eventId: lastEvt }).catch(() => {})
              }
              // Edits
              if (edits.length) {
                setMessages(prev => prev.map(m => {
                  const edit = edits.find(e => e.originalEventId === m.eventId)
                  return edit ? { ...m, body: edit.newBody, isEdited: true } : m
                }))
              }
              // Reactions
              if (newReacts.length) {
                setMessages(prev => prev.map(m => {
                  const rel = newReacts.filter(r => r.targetEventId === m.eventId)
                  if (!rel.length) return m
                  const reactions = { ...m.reactions }
                  for (const r of rel) {
                    if (!reactions[r.key]) reactions[r.key] = { count: 0, reacted: false, myEventId: null }
                    reactions[r.key] = {
                      count: reactions[r.key].count + 1,
                      reacted: r.reacted || reactions[r.key].reacted,
                      myEventId: r.reacted ? r.eventId : reactions[r.key].myEventId,
                    }
                  }
                  return { ...m, reactions }
                }))
              }
              // Redactions
              if (redactions.length) {
                setMessages(prev => prev.filter(m => !redactions.includes(m.eventId)))
              }
            }

            // Update sidebar last message
            if (newMsgs.length) {
              const last = newMsgs.at(-1)
              setRooms(prev => prev.map(r => {
                if (r.roomId !== roomId) return r
                return { ...r, lastMessage: { senderName: last.senderName, body: last.body, ts: last.ts } }
              }))
            }
          }
        }
      } catch { /* transient sync errors */ }
    }
    syncRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(syncRef.current)
  }, [nextBatch, myMxid, userMap])

  // ─── send message ────────────────────────────────────────────────────────────
  async function send() {
    if ((!draft.trim() && !uploadFile) || !selectedRoom || sending) return
    if (uploadFile) { await uploadAndSend(); return }
    setSending(true)
    const body = draft.trim()
    const curReply = replyTo
    setDraft('')
    setReplyTo(null)
    sendTyping(false)
    try {
      const data = await cx('POST', `/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/send`, {
        body,
        replyToEventId: curReply?.eventId || undefined,
      })
      setMessages(prev => [...prev, {
        eventId: data.eventId, sender: myMxid || '', senderName: user?.name || 'You',
        body, msgtype: 'm.text', ts: Date.now(), reactions: {}, isEdited: false,
        replyToEventId: curReply?.eventId || null,
      }])
      setTimeout(() => scrollBottom(true), 40)
    } catch (err) {
      console.error('[chat] send:', err.message)
      setDraft(body); setReplyTo(curReply)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  // ─── upload + send file ──────────────────────────────────────────────────────
  async function uploadAndSend() {
    if (!uploadFile || !selectedRoom) return
    setUploading(true)
    try {
      const base64 = await toBase64(uploadFile.file)
      const upData = await cx('POST', `/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/upload`, {
        filename: uploadFile.name, contentType: uploadFile.type, data: base64,
      })
      const msgtype = uploadFile.type.startsWith('image/') ? 'm.image' : 'm.file'
      const data = await cx('POST', `/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/send`, {
        msgtype, url: upData.mxcUrl, filename: uploadFile.name, mimeType: uploadFile.type,
        fileSize: uploadFile.file.size, replyToEventId: replyTo?.eventId || undefined,
      })
      setMessages(prev => [...prev, {
        eventId: data.eventId, sender: myMxid || '', senderName: user?.name || 'You',
        body: uploadFile.name, msgtype, ts: Date.now(), reactions: {}, isEdited: false,
        url: upData.mxcUrl, filename: uploadFile.name, mimeType: uploadFile.type,
      }])
      setUploadFile(null); setReplyTo(null)
      setTimeout(() => scrollBottom(true), 40)
    } catch (err) {
      console.error('[chat] upload:', err.message)
    } finally {
      setUploading(false)
      textareaRef.current?.focus()
    }
  }

  // ─── edit message ────────────────────────────────────────────────────────────
  async function submitEdit() {
    if (!editText.trim() || !editingMsg || !selectedRoom) return
    const { eventId, body: oldBody } = editingMsg
    setEditingMsg(null)
    try {
      await cx('PUT', `/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/messages/${encodeURIComponent(eventId)}`, { body: editText.trim() })
      setMessages(prev => prev.map(m => m.eventId === eventId ? { ...m, body: editText.trim(), isEdited: true } : m))
    } catch (err) {
      console.error('[chat] edit:', err.message)
      setEditingMsg({ eventId, body: oldBody }); setEditText(oldBody)
    }
  }

  // ─── delete message ──────────────────────────────────────────────────────────
  async function deleteMessage(eventId) {
    if (!selectedRoom || !confirm('Delete this message?')) return
    try {
      await cx('DELETE', `/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/messages/${encodeURIComponent(eventId)}`)
      setMessages(prev => prev.filter(m => m.eventId !== eventId))
    } catch (err) {
      console.error('[chat] delete:', err.message)
    }
  }

  // ─── reactions ───────────────────────────────────────────────────────────────
  async function reactToMessage(eventId, key) {
    if (!selectedRoom) return
    try {
      const data = await cx('POST', `/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/react`, { eventId, key })
      setMessages(prev => prev.map(m => {
        if (m.eventId !== eventId) return m
        const reactions = { ...m.reactions }
        if (!reactions[key]) reactions[key] = { count: 0, reacted: false, myEventId: null }
        reactions[key] = { count: reactions[key].count + 1, reacted: true, myEventId: data.reactionEventId }
        return { ...m, reactions }
      }))
    } catch (err) {
      console.error('[chat] react:', err.message)
    }
  }
  async function unreactMessage(reactionEventId, targetEventId, key) {
    if (!selectedRoom || !reactionEventId) return
    try {
      await cx('DELETE', `/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/react/${encodeURIComponent(reactionEventId)}`)
      setMessages(prev => prev.map(m => {
        if (m.eventId !== targetEventId) return m
        const reactions = { ...m.reactions }
        if (reactions[key]) {
          const count = reactions[key].count - 1
          if (count <= 0) delete reactions[key]
          else reactions[key] = { count, reacted: false, myEventId: null }
        }
        return { ...m, reactions }
      }))
    } catch (err) {
      console.error('[chat] unreact:', err.message)
    }
  }

  // ─── leave / mute ────────────────────────────────────────────────────────────
  async function leaveRoom() {
    if (!selectedRoom || !confirm(`Leave "${selectedRoom.name}"?`)) return
    try {
      await cx('POST', `/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/leave`)
      const roomId = selectedRoom.roomId
      setSelectedRoom(null)
      setRooms(prev => prev.filter(r => r.roomId !== roomId))
    } catch (err) { alert(err.message) }
  }
  function toggleMute(roomId) {
    setMutedRooms(prev => {
      const next = new Set(prev)
      if (next.has(roomId)) next.delete(roomId); else next.add(roomId)
      localStorage.setItem('chat_muted', JSON.stringify([...next]))
      return next
    })
  }

  // ─── call ────────────────────────────────────────────────────────────────────
  function startCall(mode) {
    if (!selectedRoom || !jitsiDomain) return
    const slug = slugifyRoom(selectedRoom.name)
    setActiveCall({ slug, mode })
    const body = mode === 'video'
      ? `📹 Video call started — click the call button to join`
      : `📞 Voice call started — click the call button to join`
    cx('POST', `/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/send`, { body }).catch(() => {})
  }

  // ─── load older ──────────────────────────────────────────────────────────────
  async function loadOlder() {
    if (!msgsEnd || !selectedRoom) return
    try {
      const data = await cx('GET', `/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/messages`, undefined, { from: msgsEnd, limit: 50 })
      setMessages(prev => [...(data.messages || []), ...prev])
      setMsgsEnd(data.end || null)
    } catch (err) { console.error('[chat] loadOlder:', err.message) }
  }

  // ─── search ──────────────────────────────────────────────────────────────────
  async function doSearch() {
    if (!searchQ.trim()) return
    setSearching(true)
    try {
      const data = await cx('GET', '/chat/search', undefined, { q: searchQ, roomId: selectedRoom?.roomId })
      setSearchResults(data.results || [])
    } catch { setSearchResults([]) } finally { setSearching(false) }
  }

  // ─── textarea handlers ───────────────────────────────────────────────────────
  function onDraftChange(e) {
    const val = e.target.value
    setDraft(val)
    // @mention detection
    const cursor = e.target.selectionStart
    const before = val.slice(0, cursor)
    const match = before.match(/@([\w\s.]*)$/)
    setMentionQ(match ? match[1] : null)
    // typing
    sendTyping(true)
    // auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }
  function insertMention(u) {
    const cursor = textareaRef.current?.selectionStart || draft.length
    const before = draft.slice(0, cursor)
    const after  = draft.slice(cursor)
    const match  = before.match(/@[\w\s.]*$/)
    const newBefore = match ? before.slice(0, before.length - match[0].length) + `@${u.name} ` : before + `@${u.name} `
    setDraft(newBefore + after)
    setMentionQ(null)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }
  function onKeyDown(e) {
    if (e.key === 'Escape') { setMentionQ(null); setReplyTo(null); return }
    if (mentionQ !== null && mentionSuggs.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); return }
      if (e.key === 'Enter' && mentionSuggs.length) { e.preventDefault(); insertMention(mentionSuggs[0]); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // ─── derived ─────────────────────────────────────────────────────────────────
  const sq          = roomSearch.toLowerCase()
  const visibleRooms = sq ? rooms.filter(r => r.name?.toLowerCase().includes(sq)) : rooms
  const dms         = visibleRooms.filter(r => r.is_dm)
  const channels    = visibleRooms.filter(r => !r.is_dm)
  const totalUnread = rooms.reduce((n, r) => n + (mutedRooms.has(r.roomId) ? 0 : (r.unread_count || 0)), 0)
  const mentionSuggs = mentionQ !== null
    ? mentionUsers.filter(u => u.name?.toLowerCase().includes(mentionQ.toLowerCase())).slice(0, 5)
    : []
  const curTyping = selectedRoom ? (typingUsers[selectedRoom.roomId] || []) : []

  // ─── error / no account screens ──────────────────────────────────────────────
  if (noAccount) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: T.bg, fontFamily: T.font }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>💬</div>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.navy, marginBottom: 6 }}>Chat not set up</div>
        <div style={{ fontSize: 13, color: T.muted, maxWidth: 320 }}>Your account doesn't have a chat profile yet. Ask your administrator to provision Matrix access.</div>
      </div>
    </div>
  )
  if (globalErr) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: T.bg, fontFamily: T.font }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.navy, marginBottom: 6 }}>Chat unavailable</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>{globalErr}</div>
        <button onClick={() => { setGlobalErr(''); loadRooms() }} style={{ padding: '9px 22px', background: T.orange, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Retry</button>
      </div>
    </div>
  )

  // ─── render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', background: T.bg, fontFamily: T.font, overflow: 'hidden' }} onClick={() => { if (showRoomMenu) setShowRoomMenu(false) }}>

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <div style={{ width: SIDEBAR_W, flexShrink: 0, background: T.sb, display: 'flex', flexDirection: 'column' }}>

        {/* Workspace header */}
        <div style={{ padding: '14px 14px 8px', borderBottom: `1px solid ${T.sbLine}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {workspaceName}
              {totalUnread > 0 && <span style={{ marginLeft: 8, background: T.orange, color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{totalUnread}</span>}
            </div>
          </div>
          <button onClick={() => setShowSearch(v => !v)} title="Search messages"
            style={{ background: showSearch ? 'rgba(255,255,255,0.15)' : 'none', border: 'none', color: T.sbMute, cursor: 'pointer', fontSize: 14, borderRadius: 6, padding: '4px 6px' }}>🔍</button>
        </div>

        {/* Search bar (when open) */}
        {showSearch && (
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${T.sbLine}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
                placeholder="Search messages…" autoFocus
                style={{ flex: 1, padding: '6px 10px', fontSize: 12, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', outline: 'none', fontFamily: T.font }} />
              <button onClick={doSearch} disabled={searching}
                style={{ padding: '6px 10px', background: T.orange, border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12 }}>
                {searching ? '…' : 'Go'}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
                {searchResults.map(r => (
                  <div key={r.eventId}
                    onClick={() => {
                      const room = rooms.find(rm => rm.roomId === r.roomId)
                      if (room) { setSelectedRoom(room); setShowSearch(false); setSearchResults([]) }
                    }}
                    style={{ padding: '6px 4px', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: T.sbText }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontWeight: 500 }}>{r.senderName}</div>
                    <div style={{ color: T.sbMute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Room search */}
        {!showSearch && (
          <div style={{ padding: '8px 10px 4px', flexShrink: 0 }}>
            <input value={roomSearch} onChange={e => setRoomSearch(e.target.value)} placeholder="Find a conversation…"
              style={{ width: '100%', padding: '6px 10px', fontSize: 12, boxSizing: 'border-box', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, color: '#fff', outline: 'none', fontFamily: T.font }} />
          </div>
        )}

        {/* Room list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingRooms ? (
            <div style={{ padding: '16px 14px', color: T.sbMute, fontSize: 12 }}>Loading…</div>
          ) : (
            <>
              <SideSection label="Direct Messages" collapsed={collapsed.dms} onToggle={() => setCollapsed(p => ({ ...p, dms: !p.dms }))}
                action={{ title: 'New DM', onClick: () => setShowNewDm(true) }}>
                {dms.length === 0 && !sq && <div style={{ padding: '4px 14px 8px', color: T.sbMute, fontSize: 11 }}>No direct messages yet</div>}
                {dms.map(r => <RoomItem key={r.roomId} room={r} active={selectedRoom?.roomId === r.roomId} isDm muted={mutedRooms.has(r.roomId)} onClick={() => setSelectedRoom(r)} />)}
              </SideSection>
              <SideSection label="Channels" collapsed={collapsed.channels} onToggle={() => setCollapsed(p => ({ ...p, channels: !p.channels }))}
                action={isAdmin ? { title: 'New Channel', onClick: () => setShowCreate(true) } : null}>
                {channels.length === 0 && !sq && <div style={{ padding: '4px 14px 8px', color: T.sbMute, fontSize: 11 }}>No channels yet</div>}
                {channels.map(r => <RoomItem key={r.roomId} room={r} active={selectedRoom?.roomId === r.roomId} muted={mutedRooms.has(r.roomId)} onClick={() => setSelectedRoom(r)} />)}
              </SideSection>
            </>
          )}
        </div>

        {/* Current user */}
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.sbLine}`, display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Av name={user?.name} size={30} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: T.green, border: '2px solid ' + T.sb }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ color: T.sbMute, fontSize: 10 }}>Online</div>
          </div>
        </div>
      </div>

      {/* ── MAIN AREA ────────────────────────────────────────────── */}
      {selectedRoom ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: T.card }}>

          {/* Room header */}
          <div style={{ padding: '0 16px', height: 52, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, position: 'relative' }}>
            {selectedRoom.is_dm
              ? <Av name={selectedRoom.dm_partner_name || selectedRoom.name} size={32} />
              : <div style={{ width: 32, height: 32, borderRadius: 8, background: T.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>#</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: T.navy }}>{selectedRoom.name}</div>
              {selectedRoom.topic && <div style={{ fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedRoom.topic}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {!selectedRoom.is_dm && selectedRoom.member_count > 0 && (
                <button onClick={() => setShowMembers(v => !v)} title="Members"
                  style={{ padding: '5px 10px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, background: showMembers ? '#f0f2f5' : 'none', cursor: 'pointer', fontSize: 12, color: T.muted }}>
                  👥 {selectedRoom.member_count}
                </button>
              )}
              {/* Call buttons */}
              <button
                onClick={() => activeCall ? setActiveCall(null) : startCall('audio')}
                title={activeCall?.mode === 'audio' ? 'End voice call' : 'Start voice call'}
                style={{ width: 32, height: 32, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, background: activeCall?.mode === 'audio' ? T.red : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: activeCall?.mode === 'audio' ? '#fff' : T.muted }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
              </button>
              <button
                onClick={() => activeCall ? setActiveCall(null) : startCall('video')}
                title={activeCall?.mode === 'video' ? 'End video call' : 'Start video call'}
                style={{ width: 32, height: 32, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, background: activeCall?.mode === 'video' ? T.red : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: activeCall?.mode === 'video' ? '#fff' : T.muted }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
              </button>
              {/* ⋯ dropdown */}
              <div style={{ position: 'relative' }}>
                <button onClick={e => { e.stopPropagation(); setShowRoomMenu(v => !v) }}
                  style={{ padding: '5px 10px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, background: showRoomMenu ? '#f0f2f5' : 'none', cursor: 'pointer', fontSize: 16, color: T.muted }}>⋯</button>
                {showRoomMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 190, padding: '4px 0' }}
                    onClick={e => e.stopPropagation()}>
                    {!selectedRoom.is_dm && isAdmin && (
                      <MenuItem onClick={() => { setShowInvite(true); setShowRoomMenu(false) }}>Invite people</MenuItem>
                    )}
                    {!selectedRoom.is_dm && (
                      <MenuItem onClick={() => { setShowMembers(v => !v); setShowRoomMenu(false) }}>
                        {showMembers ? 'Hide members' : 'Show members'}
                      </MenuItem>
                    )}
                    <MenuItem onClick={() => { toggleMute(selectedRoom.roomId); setShowRoomMenu(false) }}>
                      {mutedRooms.has(selectedRoom.roomId) ? '🔔 Unmute notifications' : '🔕 Mute notifications'}
                    </MenuItem>
                    <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
                    <MenuItem onClick={() => { leaveRoom(); setShowRoomMenu(false) }} red>Leave room</MenuItem>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active call panel */}
          {activeCall && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000' }}>
              <div style={{ padding: '0 16px', height: 40, background: T.navy, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, flex: 1 }}>
                  {activeCall.mode === 'video' ? '📹' : '📞'} {selectedRoom.name}
                </span>
                <button onClick={() => setActiveCall(null)}
                  style={{ background: T.red, color: '#fff', border: 'none', padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: T.font }}>
                  Leave
                </button>
              </div>
              <div style={{ flex: 1 }}>
                {jitsiLoaded
                  ? <MeetingRoomEmbed
                      domain={jitsiDomain}
                      roomName={activeCall.slug}
                      displayName={user?.name || 'User'}
                      jwt={jitsiToken}
                      audioOnly={activeCall.mode === 'audio'}
                      onLeave={() => setActiveCall(null)}
                    />
                  : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 13, fontFamily: T.font }}>Connecting to call server…</div>
                }
              </div>
            </div>
          )}

          {/* Messages area */}
          <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', display: activeCall ? 'none' : 'flex', flexDirection: 'column', position: 'relative' }}>
            {msgsEnd && (
              <div style={{ textAlign: 'center', padding: '12px 20px 0' }}>
                <button onClick={loadOlder} style={{ padding: '4px 14px', border: `1px solid ${T.border}`, borderRadius: 20, background: 'none', cursor: 'pointer', fontSize: 11, color: T.muted }}>Load older messages</button>
              </div>
            )}

            {loadingMsgs ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
            ) : messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: T.muted, padding: 40 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{selectedRoom.is_dm ? '👋' : '💬'}</div>
                <div style={{ fontSize: 13 }}>{selectedRoom.is_dm ? `Start a conversation with ${selectedRoom.name}` : 'No messages yet — be the first!'}</div>
              </div>
            ) : (
              <div style={{ paddingBottom: 8 }}>
                <MessageList
                  messages={messages}
                  myMxid={myMxid}
                  onReply={msg => { setReplyTo({ eventId: msg.eventId, senderName: msg.senderName, body: msg.body }); textareaRef.current?.focus() }}
                  onEdit={msg => { setEditingMsg(msg); setEditText(msg.body); setTimeout(() => editTextareaRef.current?.focus(), 50) }}
                  onDelete={deleteMessage}
                  onReact={reactToMessage}
                  onUnreact={unreactMessage}
                />
              </div>
            )}

            {/* Typing indicator */}
            {curTyping.length > 0 && (
              <div style={{ padding: '4px 20px 6px 20px', fontSize: 12, color: T.muted, fontStyle: 'italic' }}>
                {curTyping.slice(0, 3).join(', ')} {curTyping.length === 1 ? 'is' : 'are'} typing…
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Jump to latest */}
          {!atBottom && (
            <div style={{ position: 'absolute', bottom: 80, right: showMembers ? MEMBERS_W + 16 : 16, zIndex: 10 }}>
              <button onClick={() => scrollBottom(true)}
                style={{ padding: '6px 14px', background: T.navy, color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                ↓ Latest
              </button>
            </div>
          )}

          {/* Edit mode banner */}
          {!activeCall && editingMsg && (
            <div style={{ padding: '8px 16px', borderTop: `1px solid ${T.border}`, background: '#fffbeb', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.yellow, fontWeight: 500 }}>✏️ Editing message</span>
                <button onClick={() => setEditingMsg(null)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: T.muted }}>×</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(0,0,0,0.12)' }}>
                <textarea ref={editTextareaRef} value={editText} onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit() } if (e.key === 'Escape') setEditingMsg(null) }}
                  rows={1} style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', fontSize: 13, fontFamily: T.font, lineHeight: 1.5, outline: 'none', maxHeight: 120, overflowY: 'auto', color: T.navy }} />
                <button onClick={submitEdit} disabled={!editText.trim()}
                  style={{ padding: '6px 14px', background: T.orange, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, opacity: editText.trim() ? 1 : 0.5 }}>Save</button>
              </div>
            </div>
          )}

          {/* Input area */}
          {!activeCall && !editingMsg && (
            <div style={{ padding: '8px 16px 12px', borderTop: `1px solid ${T.border}`, flexShrink: 0, position: 'relative' }}>
              {/* Reply bar */}
              {replyTo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '6px 10px', background: '#f0f7ff', borderRadius: 6, borderLeft: `3px solid ${T.blue}` }}>
                  <span style={{ fontSize: 12, color: T.blue, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>{replyTo.senderName}:</strong> {replyTo.body.slice(0, 80)}
                  </span>
                  <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', fontSize: 14, color: T.muted, cursor: 'pointer', flexShrink: 0 }}>×</button>
                </div>
              )}

              {/* Upload preview */}
              {uploadFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 12px', background: '#f3f4f6', borderRadius: 8, position: 'relative' }}>
                  {uploadFile.preview
                    ? <img src={uploadFile.preview} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                    : <span style={{ fontSize: 24 }}>📎</span>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadFile.name}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{Math.round(uploadFile.file.size / 1024)} KB</div>
                  </div>
                  <button onClick={() => setUploadFile(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: T.muted, cursor: 'pointer' }}>×</button>
                </div>
              )}

              {/* @mention suggestions */}
              {mentionSuggs.length > 0 && mentionQ !== null && (
                <div style={{ position: 'absolute', bottom: '100%', left: 16, right: 16, background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden', marginBottom: 4 }}>
                  {mentionSuggs.map(u => (
                    <div key={u.id} onClick={() => insertMention(u)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <Av name={u.name} size={28} />
                      <div>
                        <div style={{ fontWeight: 500, color: T.navy }}>{u.name}</div>
                        {u.department_name && <div style={{ fontSize: 11, color: T.muted }}>{u.department_name}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: '#fff', borderRadius: 10, padding: '8px 10px', border: '1px solid rgba(0,0,0,0.12)' }}>
                {/* Attachment button */}
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
                  setUploadFile({ file, preview, name: file.name, type: file.type })
                  e.target.value = ''
                }} />
                <button onClick={() => fileInputRef.current?.click()} title="Attach file"
                  style={{ width: 30, height: 30, border: 'none', background: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  📎
                </button>

                <textarea ref={textareaRef} value={draft} onChange={onDraftChange} onKeyDown={onKeyDown}
                  placeholder={replyTo ? `Reply to ${replyTo.senderName}…` : `Message ${selectedRoom.name}…`}
                  rows={1}
                  style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', fontSize: 13, fontFamily: T.font, lineHeight: 1.5, outline: 'none', maxHeight: 120, overflowY: 'auto', color: T.navy }} />

                <button onClick={send} disabled={(!draft.trim() && !uploadFile) || sending || uploading}
                  style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: (draft.trim() || uploadFile) ? T.orange : 'rgba(0,0,0,0.12)', border: 'none', cursor: (draft.trim() || uploadFile) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'background 0.15s' }}>
                  {uploading ? '…' : <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.card }}>
          {loadingRooms ? <div style={{ color: T.muted, fontSize: 13 }}>Loading…</div> : (
            <div style={{ textAlign: 'center', color: T.muted }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
              <div style={{ fontSize: 13 }}>Select a conversation to start</div>
              <button onClick={() => setShowNewDm(true)} style={{ marginTop: 16, padding: '8px 20px', background: T.orange, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                Start a conversation
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MEMBERS PANEL ─────────────────────────────────────────── */}
      {showMembers && selectedRoom && (
        <MembersPanel roomId={selectedRoom.roomId} memberCount={selectedRoom.member_count} onClose={() => setShowMembers(false)} />
      )}

      {/* ── MODALS ───────────────────────────────────────────────── */}
      {showNewDm && (
        <UserPickerModal title="New Direct Message"
          exclude={myMxid ? [myMxid.split(':')[0].slice(1)] : []}
          onClose={() => setShowNewDm(false)}
          onSelect={async (u) => {
            const data = await cx('POST', '/chat/dm', { matrixUsername: u.matrix_username })
            setShowNewDm(false)
            await loadRooms()
            setSelectedRoom(prev => rooms.find(r => r.roomId === data.roomId) || { roomId: data.roomId, name: u.name, is_dm: true, dm_partner_name: u.name, unread_count: 0, member_count: 2 })
          }}
        />
      )}
      {showCreate && (
        <CreateChannelModal onClose={() => setShowCreate(false)}
          onCreated={async (roomId) => { setShowCreate(false); await loadRooms(); setSelectedRoom(rooms.find(r => r.roomId === roomId) || null) }}
        />
      )}
      {showInvite && selectedRoom && (
        <UserPickerModal title={`Invite to #${selectedRoom.name}`}
          onClose={() => setShowInvite(false)}
          onSelect={async (u) => {
            await cx('POST', `/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/invite`, { matrixUsername: u.matrix_username })
            setShowInvite(false)
            setSelectedRoom(prev => prev ? { ...prev, member_count: (prev.member_count || 0) + 1 } : prev)
          }}
        />
      )}
    </div>
  )
}

// ── MenuItem helper ───────────────────────────────────────────────────────────
function MenuItem({ onClick, red, children }) {
  return (
    <div onClick={onClick}
      style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: red ? T.red : T.navy, display: 'flex', alignItems: 'center', gap: 8 }}
      onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {children}
    </div>
  )
}
