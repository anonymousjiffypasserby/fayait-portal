import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../api'

const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.06)', muted: '#888',
  orange: '#f97316', blue: '#2563eb', green: '#1D9E75',
  red: '#e74c3c', yellow: '#d97706', purple: '#9b59b6',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const SIDEBAR_W = 260
const POLL_MS = 3000

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function Avatar({ name, size = 32 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const hue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},55%,45%)`, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function CreateRoomModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await api.post('/chat/rooms', { name: name.trim(), topic: topic.trim() })
      onCreated()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: T.card, borderRadius: 12, padding: '28px 32px',
        width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: T.navy }}>Create Room</h3>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: T.navy }}>Room Name</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. General"
              style={{
                width: '100%', padding: '9px 12px', border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none',
              }}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: T.navy }}>Topic (optional)</label>
            <input
              value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="What's this room about?"
              style={{
                width: '100%', padding: '9px 12px', border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>
          {error && <div style={{ color: T.red, fontSize: 13, marginBottom: 14 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '9px 20px', border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 14,
            }}>Cancel</button>
            <button type="submit" disabled={loading || !name.trim()} style={{
              padding: '9px 20px', background: T.orange, color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
              opacity: loading || !name.trim() ? 0.6 : 1,
            }}>
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Chat() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = ['admin', 'superadmin'].includes(user.role)
  const myMxid = user.matrix_username ? `@${user.matrix_username}:${window.location.hostname}` : null

  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [nextBatch, setNextBatch] = useState(null)
  const [messagesEnd, setMessagesEnd] = useState(null)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [error, setError] = useState('')
  const [noAccount, setNoAccount] = useState(false)

  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const syncRef = useRef(null)
  const selectedRoomRef = useRef(null)
  selectedRoomRef.current = selectedRoom

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadRooms = useCallback(async () => {
    try {
      const res = await api.get('/chat/rooms')
      setRooms(res.data.rooms || [])
      setNextBatch(prev => prev || res.data.nextBatch)
      setLoadingRooms(false)
    } catch (err) {
      const msg = err.response?.data?.error || err.message
      if (msg?.includes('Matrix account') || msg?.includes('not provisioned')) {
        setNoAccount(true)
      } else {
        setError(msg)
      }
      setLoadingRooms(false)
    }
  }, [])

  const loadMessages = useCallback(async (roomId, since) => {
    setLoadingMessages(true)
    try {
      const res = await api.get(`/chat/rooms/${encodeURIComponent(roomId)}/messages`, {
        params: { from: since, limit: 50 },
      })
      setMessages(res.data.messages || [])
      setMessagesEnd(res.data.end)
    } catch (err) {
      console.error('[chat] load messages:', err.message)
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  // Auto-select first room when rooms load
  useEffect(() => {
    if (rooms.length && !selectedRoom) {
      setSelectedRoom(rooms[0])
    }
  }, [rooms, selectedRoom])

  // Load messages when room changes
  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.roomId)
    }
  }, [selectedRoom?.roomId, loadMessages])

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length) {
      setTimeout(scrollToBottom, 50)
    }
  }, [messages.length, selectedRoom?.roomId])

  // Incremental sync polling
  useEffect(() => {
    if (!nextBatch) return
    const poll = async () => {
      try {
        const res = await api.get('/chat/sync', { params: { since: nextBatch } })
        const { nextBatch: nb, rooms: roomUpdates } = res.data
        if (nb) setNextBatch(nb)
        if (roomUpdates && Object.keys(roomUpdates).length) {
          const currentRoom = selectedRoomRef.current
          if (currentRoom && roomUpdates[currentRoom.roomId]) {
            const newMsgs = roomUpdates[currentRoom.roomId]
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.eventId))
              const fresh = newMsgs.filter(m => !existingIds.has(m.eventId))
              return fresh.length ? [...prev, ...fresh] : prev
            })
            setTimeout(scrollToBottom, 50)
          }
          // Update last message preview in rooms sidebar
          setRooms(prev => prev.map(r => {
            if (roomUpdates[r.roomId]?.length) {
              const last = roomUpdates[r.roomId].at(-1)
              return { ...r, lastMessage: { sender: last.sender, body: last.body, ts: last.ts } }
            }
            return r
          }))
        }
      } catch (err) {
        // swallow — sync errors are transient
      }
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
      const res = await api.post(`/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/send`, { body })
      // Optimistically add message
      const optimistic = {
        eventId: res.data.eventId,
        sender: myMxid || '',
        senderName: user.name || 'You',
        body,
        msgtype: 'm.text',
        ts: Date.now(),
      }
      setMessages(prev => [...prev, optimistic])
      setTimeout(scrollToBottom, 50)
    } catch (err) {
      console.error('[chat] send:', err.message)
      setDraft(body)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  async function loadMore() {
    if (!messagesEnd || !selectedRoom) return
    try {
      const res = await api.get(`/chat/rooms/${encodeURIComponent(selectedRoom.roomId)}/messages`, {
        params: { from: messagesEnd, limit: 50 },
      })
      const older = res.data.messages || []
      setMessages(prev => [...older, ...prev])
      setMessagesEnd(res.data.end)
    } catch (err) {
      console.error('[chat] load more:', err.message)
    }
  }

  if (noAccount) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: T.bg }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
          <h2 style={{ color: T.navy, marginBottom: 8 }}>Chat not set up</h2>
          <p style={{ color: T.muted, maxWidth: 340 }}>Your account doesn't have a chat profile yet. Contact your administrator to get access.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: T.bg }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: T.navy, marginBottom: 8 }}>Chat unavailable</h2>
          <p style={{ color: T.muted }}>{error}</p>
          <button onClick={loadRooms} style={{
            marginTop: 16, padding: '10px 24px', background: T.orange, color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
          }}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: T.bg, fontFamily: T.font }}>
      {/* Rooms sidebar */}
      <div style={{
        width: SIDEBAR_W, flexShrink: 0, background: '#1B2A4A',
        display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Sidebar header */}
        <div style={{
          padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Chat</span>
          {isAdmin && (
            <button onClick={() => setShowCreateRoom(true)} title="New room" style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6,
              color: '#fff', cursor: 'pointer', width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1,
            }}>+</button>
          )}
        </div>

        {/* Room list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingRooms ? (
            <div style={{ padding: '20px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading rooms…</div>
          ) : rooms.length === 0 ? (
            <div style={{ padding: '20px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No rooms yet</div>
          ) : rooms.map(room => {
            const active = selectedRoom?.roomId === room.roomId
            return (
              <div key={room.roomId} onClick={() => setSelectedRoom(room)} style={{
                padding: '10px 16px', cursor: 'pointer',
                background: active ? 'rgba(249,115,22,0.18)' : 'transparent',
                borderLeft: active ? `3px solid ${T.orange}` : '3px solid transparent',
                transition: 'background 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: active ? T.orange : 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 600, fontSize: 14, flexShrink: 0,
                  }}>
                    {room.name?.[0]?.toUpperCase() || '#'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: active ? '#fff' : 'rgba(255,255,255,0.85)',
                      fontWeight: active ? 600 : 400, fontSize: 14,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{room.name}</div>
                    {room.lastMessage && (
                      <div style={{
                        color: 'rgba(255,255,255,0.4)', fontSize: 12,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {room.lastMessage.body}
                      </div>
                    )}
                  </div>
                  {room.lastMessage && (
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, flexShrink: 0 }}>
                      {formatTime(room.lastMessage.ts)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Current user */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Avatar name={user.name} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Online</div>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      {selectedRoom ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Room header */}
          <div style={{
            padding: '14px 24px', background: T.card, borderBottom: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', background: T.orange,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 16,
            }}>
              {selectedRoom.name?.[0]?.toUpperCase() || '#'}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: T.navy }}>{selectedRoom.name}</div>
              {selectedRoom.topic && (
                <div style={{ fontSize: 12, color: T.muted }}>{selectedRoom.topic}</div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {messagesEnd && (
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <button onClick={loadMore} style={{
                  padding: '6px 16px', border: `1px solid ${T.border}`, borderRadius: 20,
                  background: 'none', cursor: 'pointer', fontSize: 12, color: T.muted,
                }}>Load older messages</button>
              </div>
            )}
            {loadingMessages ? (
              <div style={{ textAlign: 'center', color: T.muted, marginTop: 40 }}>Loading messages…</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: T.muted, marginTop: 60 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
                <div>No messages yet. Be the first to say something!</div>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.sender === myMxid || msg.senderName === user.name
                const prevMsg = messages[i - 1]
                const sameSender = prevMsg?.sender === msg.sender && (msg.ts - prevMsg.ts) < 5 * 60 * 1000
                return (
                  <div key={msg.eventId || i} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    marginTop: sameSender ? 2 : 12,
                    flexDirection: isMe ? 'row-reverse' : 'row',
                  }}>
                    {!sameSender ? (
                      <Avatar name={msg.senderName} size={32} />
                    ) : (
                      <div style={{ width: 32 }} />
                    )}
                    <div style={{ maxWidth: '65%', minWidth: 0 }}>
                      {!sameSender && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 3, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>{msg.senderName}</span>
                          <span style={{ fontSize: 11, color: T.muted }}>{formatTime(msg.ts)}</span>
                        </div>
                      )}
                      <div style={{
                        padding: '8px 12px',
                        background: isMe ? T.orange : T.card,
                        color: isMe ? '#fff' : T.navy,
                        borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                        fontSize: 14, lineHeight: 1.5,
                        border: isMe ? 'none' : `1px solid ${T.border}`,
                        wordBreak: 'break-word',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                      }}>
                        {msg.body}
                      </div>
                      {sameSender && (
                        <div style={{ fontSize: 10, color: T.muted, marginTop: 2, textAlign: isMe ? 'right' : 'left' }}>
                          {formatTime(msg.ts)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Message input */}
          <div style={{
            padding: '12px 24px', background: T.card, borderTop: `1px solid ${T.border}`,
            display: 'flex', gap: 10, alignItems: 'flex-end',
          }}>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Message ${selectedRoom.name}…`}
              rows={1}
              style={{
                flex: 1, resize: 'none', border: `1px solid rgba(0,0,0,0.15)`,
                borderRadius: 10, padding: '10px 14px', fontSize: 14,
                fontFamily: T.font, lineHeight: 1.5, outline: 'none',
                maxHeight: 120, overflowY: 'auto', background: '#f8f9fa',
              }}
            />
            <button onClick={send} disabled={!draft.trim() || sending} style={{
              width: 42, height: 42, borderRadius: 10,
              background: draft.trim() ? T.orange : 'rgba(0,0,0,0.1)',
              border: 'none', cursor: draft.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', transition: 'background 0.15s', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loadingRooms ? (
            <div style={{ color: T.muted }}>Loading…</div>
          ) : (
            <div style={{ textAlign: 'center', color: T.muted }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <div>Select a room to start chatting</div>
            </div>
          )}
        </div>
      )}

      {showCreateRoom && (
        <CreateRoomModal
          onClose={() => setShowCreateRoom(false)}
          onCreated={() => { setShowCreateRoom(false); loadRooms() }}
        />
      )}
    </div>
  )
}
