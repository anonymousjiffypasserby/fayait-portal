import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const BASE = import.meta.env.VITE_API_URL || 'https://api.fayait.com'
const getToken = () => localStorage.getItem('faya_token')
const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
})
async function cx(method, path, body, params) {
  let url = `${BASE}/api${path}`
  if (params) {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null))
    if (q.toString()) url += `?${q}`
  }
  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.06)', muted: '#888',
  orange: '#f97316', blue: '#2563eb', green: '#1D9E75',
  red: '#e74c3c', yellow: '#d97706', purple: '#9b59b6',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
  sidebarBg: '#1B2A4A',
  sidebarBorder: 'rgba(255,255,255,0.07)',
  sidebarText: 'rgba(255,255,255,0.75)',
  sidebarMuted: 'rgba(255,255,255,0.35)',
}
const SIDEBAR_W = 268
const MEMBERS_W = 216
const POLL_MS = 5000
const GROUP_MS = 5 * 60 * 1000

function ts2time(ts) {
  if (!ts) return ''
  const d = new Date(ts), now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const yest = new Date(now - 86400000)
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function ts2date(ts) {
  const d = new Date(ts), now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const yest = new Date(now - 86400000)
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

function Av({ name, size = 32 }) {
  const ini = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const hue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},50%,44%)`, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.37, fontWeight: 700, userSelect: 'none',
    }}>{ini}</div>
  )
}

function Input({ value, onChange, placeholder, autoFocus, style }) {
  return (
    <input value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus}
      style={{
        width: '100%', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box',
        border: '1px solid rgba(0,0,0,0.14)', borderRadius: 7, outline: 'none',
        fontFamily: T.font, ...style,
      }}
    />
  )
}

// ── UserPicker modal (shared by New DM + Invite) ─────────────────────────────
function UserPickerModal({ title, onClose, onSelect, exclude = [] }) {
  const [users, setUsers] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    cx('GET', '/chat/users')
      .then(d => setUsers(d.users || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const list = users.filter(u =>
    !exclude.includes(u.matrix_username) &&
    (u.name?.toLowerCase().includes(q.toLowerCase()) || u.matrix_username?.toLowerCase().includes(q.toLowerCase()))
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: T.card, borderRadius: 12, padding: '22px 26px', width: 400, maxHeight: '60vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.navy }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: T.muted, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people…" autoFocus style={{ marginBottom: 10 }} />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
          ) : list.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: T.muted, fontSize: 13 }}>No users found</div>
          ) : list.map(u => (
            <div key={u.id}
              onClick={() => { if (busy !== u.id) { setBusy(u.id); onSelect(u).finally(() => setBusy(null)) } }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderRadius: 8, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Av name={u.name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>{u.name}</div>
                {u.department_name && <div style={{ fontSize: 11, color: T.muted }}>{u.department_name}</div>}
              </div>
              {busy === u.id && <div style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>…</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Create channel modal ──────────────────────────────────────────────────────
function CreateChannelModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [users, setUsers] = useState([])
  const [invited, setInvited] = useState([]) // { id, name, matrix_username }
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    cx('GET', '/chat/users').then(d => setUsers(d.users || [])).catch(() => {})
  }, [])

  const suggestions = users.filter(u =>
    !invited.find(i => i.id === u.id) &&
    (u.name?.toLowerCase().includes(q.toLowerCase()))
  ).slice(0, 6)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true); setErr('')
    try {
      const data = await cx('POST', '/chat/rooms', {
        name: name.trim(),
        topic: topic.trim(),
        inviteUsernames: invited.map(u => u.matrix_username),
      })
      onCreated(data.roomId)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: T.card, borderRadius: 12, padding: '24px 28px', width: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.navy }}>Create Channel</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: T.muted, cursor: 'pointer' }}>×</button>
        </div>
        <form onSubmit={submit}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', marginBottom: 5 }}>Channel Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. general" autoFocus style={{ marginBottom: 12 }} />
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', marginBottom: 5 }}>Topic (optional)</label>
          <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What's this channel about?" style={{ marginBottom: 12 }} />
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', marginBottom: 5 }}>Invite People</label>
          {invited.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {invited.map(u => (
                <span key={u.id} style={{ background: '#eef2ff', color: T.blue, fontSize: 12, padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {u.name}
                  <span onClick={() => setInvited(prev => prev.filter(i => i.id !== u.id))} style={{ cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</span>
                </span>
              ))}
            </div>
          )}
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people to add…" style={{ marginBottom: 4 }} />
          {q && suggestions.length > 0 && (
            <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
              {suggestions.map(u => (
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

// ── Members panel ─────────────────────────────────────────────────────────────
function MembersPanel({ roomId, memberCount, onClose }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomId) return
    setLoading(true)
    cx('GET', `/chat/rooms/${encodeURIComponent(roomId)}/members`)
      .then(d => setMembers(d.members || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [roomId])

  return (
    <div style={{ width: MEMBERS_W, flexShrink: 0, background: T.bg, borderLeft: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>Members ({memberCount || members.length})</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: T.muted, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {loading ? (
          <div style={{ padding: 16, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
        ) : members.map(m => (
          <div key={m.mxid} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 4px', borderRadius: 6 }}>
            <Av name={m.displayName} size={28} />
            <div style={{ fontSize: 13, color: T.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.displayName}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Chat() {
  const { user, serviceUrls } = useAuth()
  const isAdmin = ['admin', 'superadmin'].includes(user?.role)
  const matrixServer = serviceUrls?.matrixServerName || 'matrix.fayait.com'
  const myMxid = user?.matrix_username ? `@${user.matrix_username}:${matrixServer}` : null

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
  const [showMembers, setShowMembers]   = useState(false)
  const [showNewDm, setShowNewDm]       = useState(false)
  const [showCreate, setShowCreate]     = useState(false)
  const [showInvite, setShowInvite]     = useState(false)
  const [noAccount, setNoAccount]       = useState(false)
  const [globalErr, setGlobalErr]       = useState('')

  const bottomRef       = useRef(null)
  const textareaRef     = useRef(null)
  const syncRef         = useRef(null)
  const selectedRoomRef = useRef(null)
  selectedRoomRef.current = selectedRoom

  const scrollBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }

  const loadRooms = useCallback(async () => {
    try {
      const data = await cx('GET', '/chat/rooms')
      setRooms(data.rooms || [])
      setNextBatch(prev => prev || data.nextBatch)
      setLoadingRooms(false)
    } catch (err) {
      const msg = err.message
      if (msg?.includes('Matrix account') || msg?.includes('not provisioned')) setNoAccount(true)
      else setGlobalErr(msg)
      setLoadingRooms(false)
    }
  }, [])

  const loadMessages = useCallback(async (roomId) => {
    setLoadingMsgs(true)
    setMessages([])
    try {
      const data = await cx('GET', `/chat/rooms/${encodeURIComponent(roomId)}/messages`, undefined, { limit: 50 })
      setMessages(data.messages || [])
      setMsgsEnd(data.end || null)
      // Send read receipt for latest message
      const latest = data.messages?.at(-1)
      if (latest?.eventId) {
        cx('POST', `/chat/rooms/${encodeURIComponent(roomId)}/read`, { eventId: latest.eventId }).catch(() => {})
        // Clear unread locally
        setRooms(prev => prev.map(r => r.roomId === roomId ? { ...r, unread_count: 0 } : r))
      }
      setTimeout(() => scrollBottom(false), 40)
    } catch (err) {
      console.error('[chat] loadMessages:', err.message)
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  useEffect(() => { loadRooms() }, [loadRooms])

  useEffect(() => {
    if (rooms.length && !selectedRoom) setSelectedRoom(rooms[0])
  }, [rooms, selectedRoom])

  useEffect(() => {
    if (selectedRoom?.roomId) {
      setShowMembers(false)
      loadMessages(selectedRoom.roomId)
    }
  }, [selectedRoom?.roomId, loadMessages])

  useEffect(() => {
    if (!nextBatch) return
    const poll = async () => {
      try {
        const { nextBatch: nb, rooms: updates, unread } = await cx('GET', '/chat/sync', undefined, { since: nextBatch })
        if (nb) setNextBatch(nb)

        if (unread && Object.keys(unread).length) {
          setRooms(prev => prev.map(r => {
            const roomId = r.roomId
            if (roomId === selectedRoomRef.current?.roomId) return { ...r, unread_count: 0 }
            return unread[roomId] !== undefined ? { ...r, unread_count: unread[roomId] } : r
          }))
        }

        if (updates && Object.keys(updates).length) {
          const cur = selectedRoomRef.current
          if (cur && updates[cur.roomId]) {
            const fresh = updates[cur.roomId]
            setMessages(prev => {
              const ids = new Set(prev.map(m => m.eventId))
              const newMsgs = fresh.filter(m => !ids.has(m.eventId))
              if (!newMsgs.length) return prev
              setTimeout(() => scrollBottom(true), 40)
              return [...prev, ...newMsgs]
            })
            // Mark read on new messages in active room
            const lastEvt = fresh.at(-1)?.eventId
            if (lastEvt) {
              cx('POST', `/chat/rooms/${encodeURIComponent(cur.roomId)}/read`, { eventId: lastEvt }).catch(() => {})
            }
          }
          setRooms(prev => prev.map(r => {
            const newMsgs = updates[r.roomId]
            if (!newMsgs?.length) return r
            const last = newMsgs.at(-1)
            return { ...r, lastMessage: { senderName: last.senderName, body: last.body, ts: last.ts } }
          }))
        }
      } catch { /* transient sync errors are normal */ }
    }
    syncRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(syncRef.current)
  }, [nextBatch])

  async function send() {
    if (!draft.trim() || !selectedRoom || sending) return
    setSending(true)
    const body = draft.trim()
    setDraft('')
    try {
      const data = await cx('POST', `/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/send`, { body })
      const opt = {
        eventId: data.eventId, sender: myMxid || '',
        senderName: user?.name || 'You', body, msgtype: 'm.text', ts: Date.now(),
      }
      setMessages(prev => [...prev, opt])
      setTimeout(() => scrollBottom(true), 40)
    } catch (err) {
      console.error('[chat] send:', err.message)
      setDraft(body)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  async function leaveRoom() {
    if (!selectedRoom || !confirm(`Leave "${selectedRoom.name}"?`)) return
    try {
      await cx('POST', `/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/leave`)
      setSelectedRoom(null)
      setRooms(prev => prev.filter(r => r.roomId !== selectedRoom.roomId))
    } catch (err) {
      alert(err.message)
    }
  }

  async function loadOlder() {
    if (!msgsEnd || !selectedRoom) return
    try {
      const data = await cx('GET', `/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/messages`, undefined, { from: msgsEnd, limit: 50 })
      setMessages(prev => [...(data.messages || []), ...prev])
      setMsgsEnd(data.end || null)
    } catch (err) {
      console.error('[chat] loadOlder:', err.message)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // Filtered + split rooms
  const sq = roomSearch.toLowerCase()
  const visibleRooms = sq ? rooms.filter(r => r.name?.toLowerCase().includes(sq)) : rooms
  const dms       = visibleRooms.filter(r => r.is_dm)
  const channels  = visibleRooms.filter(r => !r.is_dm)
  const totalUnread = rooms.reduce((n, r) => n + (r.unread_count || 0), 0)

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

  return (
    <div style={{ display: 'flex', height: '100%', background: T.bg, fontFamily: T.font, overflow: 'hidden' }}>

      {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
      <div style={{ width: SIDEBAR_W, flexShrink: 0, background: T.sidebarBg, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${T.sidebarBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
            Chat{totalUnread > 0 && <span style={{ marginLeft: 8, background: T.orange, color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{totalUnread}</span>}
          </span>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 10px 6px' }}>
          <input
            value={roomSearch} onChange={e => setRoomSearch(e.target.value)}
            placeholder="Search…"
            style={{
              width: '100%', padding: '6px 10px', fontSize: 12, boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6,
              color: '#fff', outline: 'none', fontFamily: T.font,
            }}
          />
        </div>

        {/* Room list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingRooms ? (
            <div style={{ padding: '16px 14px', color: T.sidebarMuted, fontSize: 12 }}>Loading…</div>
          ) : (
            <>
              {/* Direct Messages */}
              <SideSection
                label="Direct Messages"
                action={{ title: 'New DM', onClick: () => setShowNewDm(true) }}
              >
                {dms.length === 0 && !sq && (
                  <div style={{ padding: '4px 14px 8px', color: T.sidebarMuted, fontSize: 11 }}>No direct messages yet</div>
                )}
                {dms.map(r => (
                  <RoomItem key={r.roomId} room={r} active={selectedRoom?.roomId === r.roomId}
                    isDm onClick={() => setSelectedRoom(r)} />
                ))}
              </SideSection>

              {/* Channels */}
              <SideSection
                label="Channels"
                action={isAdmin ? { title: 'New Channel', onClick: () => setShowCreate(true) } : null}
              >
                {channels.length === 0 && !sq && (
                  <div style={{ padding: '4px 14px 8px', color: T.sidebarMuted, fontSize: 11 }}>No channels yet</div>
                )}
                {channels.map(r => (
                  <RoomItem key={r.roomId} room={r} active={selectedRoom?.roomId === r.roomId}
                    onClick={() => setSelectedRoom(r)} />
                ))}
              </SideSection>
            </>
          )}
        </div>

        {/* Current user */}
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.sidebarBorder}`, display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ position: 'relative' }}>
            <Av name={user?.name} size={30} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: T.green, border: '2px solid ' + T.sidebarBg }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ color: T.sidebarMuted, fontSize: 10 }}>Online</div>
          </div>
        </div>
      </div>

      {/* ── MAIN AREA ─────────────────────────────────────────────────── */}
      {selectedRoom ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: T.card }}>

          {/* Room header */}
          <div style={{ padding: '0 20px', height: 52, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {selectedRoom.is_dm
              ? <Av name={selectedRoom.dm_partner_name || selectedRoom.name} size={32} />
              : <div style={{ width: 32, height: 32, borderRadius: 8, background: T.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>#</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: T.navy }}>{selectedRoom.name}</div>
              {selectedRoom.topic && <div style={{ fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedRoom.topic}</div>}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {!selectedRoom.is_dm && selectedRoom.member_count > 0 && (
                <button onClick={() => setShowMembers(v => !v)} title="Members"
                  style={{ padding: '5px 10px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, background: showMembers ? '#f0f2f5' : 'none', cursor: 'pointer', fontSize: 12, color: T.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
                  👥 {selectedRoom.member_count}
                </button>
              )}
              {isAdmin && !selectedRoom.is_dm && (
                <button onClick={() => setShowInvite(true)} title="Invite people"
                  style={{ padding: '5px 10px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, background: 'none', cursor: 'pointer', fontSize: 12, color: T.muted }}>
                  + Invite
                </button>
              )}
              <button onClick={leaveRoom} title="Leave room"
                style={{ padding: '5px 10px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, background: 'none', cursor: 'pointer', fontSize: 12, color: T.muted }}>
                Leave
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 8px', display: 'flex', flexDirection: 'column' }}>
            {msgsEnd && (
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <button onClick={loadOlder} style={{ padding: '4px 14px', border: `1px solid ${T.border}`, borderRadius: 20, background: 'none', cursor: 'pointer', fontSize: 11, color: T.muted }}>Load older messages</button>
              </div>
            )}

            {loadingMsgs ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
            ) : messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: T.muted }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{selectedRoom.is_dm ? '👋' : '💬'}</div>
                <div style={{ fontSize: 13 }}>
                  {selectedRoom.is_dm ? `Start a conversation with ${selectedRoom.name}` : 'No messages yet — be the first!'}
                </div>
              </div>
            ) : (
              <MessageList messages={messages} myMxid={myMxid} />
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 20px 14px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: '#f4f5f7', borderRadius: 10, padding: '8px 10px', border: '1px solid rgba(0,0,0,0.08)' }}>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={e => {
                  setDraft(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={onKeyDown}
                placeholder={`Message ${selectedRoom.name}…`}
                rows={1}
                style={{
                  flex: 1, resize: 'none', border: 'none', background: 'transparent',
                  fontSize: 13, fontFamily: T.font, lineHeight: 1.5, outline: 'none',
                  maxHeight: 120, overflowY: 'auto', color: T.navy,
                }}
              />
              <button onClick={send} disabled={!draft.trim() || sending}
                style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: draft.trim() ? T.orange : 'rgba(0,0,0,0.12)',
                  border: 'none', cursor: draft.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', transition: 'background 0.15s',
                }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.card }}>
          {loadingRooms ? (
            <div style={{ color: T.muted, fontSize: 13 }}>Loading…</div>
          ) : (
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

      {/* ── MEMBERS PANEL ──────────────────────────────────────────────── */}
      {showMembers && selectedRoom && (
        <MembersPanel
          roomId={selectedRoom.roomId}
          memberCount={selectedRoom.member_count}
          onClose={() => setShowMembers(false)}
        />
      )}

      {/* ── MODALS ─────────────────────────────────────────────────────── */}
      {showNewDm && (
        <UserPickerModal
          title="New Direct Message"
          exclude={myMxid ? [myMxid.split(':')[0].slice(1)] : []}
          onClose={() => setShowNewDm(false)}
          onSelect={async (u) => {
            const data = await cx('POST', '/chat/dm', { matrixUsername: u.matrix_username })
            setShowNewDm(false)
            await loadRooms()
            setSelectedRoom(prev => {
              const found = rooms.find(r => r.roomId === data.roomId) || { roomId: data.roomId, name: u.name, is_dm: true, dm_partner_name: u.name, unread_count: 0, member_count: 2 }
              return found
            })
          }}
        />
      )}

      {showCreate && (
        <CreateChannelModal
          onClose={() => setShowCreate(false)}
          onCreated={async (roomId) => {
            setShowCreate(false)
            await loadRooms()
            setSelectedRoom(rooms.find(r => r.roomId === roomId) || null)
          }}
        />
      )}

      {showInvite && selectedRoom && (
        <UserPickerModal
          title={`Invite to #${selectedRoom.name}`}
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

// ── Sub-components ────────────────────────────────────────────────────────────

function SideSection({ label, action, children }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 4px' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.sidebarMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
        {action && (
          <button onClick={action.onClick} title={action.title}
            style={{ background: 'none', border: 'none', color: T.sidebarMuted, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>+</button>
        )}
      </div>
      {children}
    </div>
  )
}

function RoomItem({ room, active, isDm, onClick }) {
  const hasUnread = room.unread_count > 0
  return (
    <div onClick={onClick}
      style={{
        padding: '5px 10px', cursor: 'pointer', borderRadius: 6, margin: '1px 6px',
        background: active ? 'rgba(249,115,22,0.2)' : 'transparent',
        display: 'flex', alignItems: 'center', gap: 9,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {isDm
        ? <Av name={room.dm_partner_name || room.name} size={26} />
        : <span style={{ color: active ? '#fff' : T.sidebarMuted, fontSize: 14, fontWeight: 500, width: 20, textAlign: 'center', flexShrink: 0 }}>#</span>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: active ? '#fff' : (hasUnread ? '#fff' : T.sidebarText),
          fontWeight: hasUnread ? 600 : 400,
        }}>{room.name}</div>
        {room.lastMessage && (
          <div style={{ fontSize: 11, color: T.sidebarMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {room.lastMessage.body}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        {room.lastMessage && (
          <span style={{ fontSize: 10, color: T.sidebarMuted }}>{ts2time(room.lastMessage.ts)}</span>
        )}
        {hasUnread && (
          <span style={{ background: T.orange, color: '#fff', fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
            {room.unread_count > 99 ? '99+' : room.unread_count}
          </span>
        )}
      </div>
    </div>
  )
}

function MessageList({ messages, myMxid }) {
  const els = []
  let prevDateStr = null
  let prevSender = null
  let prevTs = 0

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const dateStr = new Date(msg.ts).toDateString()
    const isMe = msg.sender === myMxid

    if (dateStr !== prevDateStr) {
      els.push(
        <div key={`d-${msg.ts}`} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 10px' }}>
          <div style={{ flex: 1, height: 1, background: T.border }} />
          <span style={{ fontSize: 11, color: T.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>{ts2date(msg.ts)}</span>
          <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>
      )
      prevDateStr = dateStr
      prevSender = null
    }

    const grouped = prevSender === msg.sender && (msg.ts - prevTs) < GROUP_MS
    prevSender = msg.sender
    prevTs = msg.ts

    els.push(
      <div key={msg.eventId || i} style={{ display: 'flex', gap: 10, marginTop: grouped ? 1 : 10, alignItems: 'flex-start' }}>
        <div style={{ width: 36, flexShrink: 0, marginTop: 2 }}>
          {!grouped ? <Av name={msg.senderName} size={34} /> : null}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {!grouped && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>{isMe ? 'You' : msg.senderName}</span>
              <span style={{ fontSize: 10, color: T.muted }}>{ts2time(msg.ts)}</span>
            </div>
          )}
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, wordBreak: 'break-word' }}>
            {msg.body}
          </div>
        </div>
      </div>
    )
  }
  return <>{els}</>
}
