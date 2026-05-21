import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.07)', muted: '#888', mutedLight: '#bbb',
  orange: '#ff6b35', green: '#1D9E75', red: '#e74c3c',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function MeetingRoom({ domain, roomName, displayName, jwt, onLeave }) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !window.JitsiMeetExternalAPI) return

    apiRef.current = new window.JitsiMeetExternalAPI(domain, {
      roomName,
      parentNode: containerRef.current,
      userInfo: { displayName },
      ...(jwt ? { jwt } : {}),
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        prejoinPageEnabled: false,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'chat', 'recording', 'livestreaming',
          'etherpad', 'sharedvideo', 'settings', 'raisehand', 'videoquality',
          'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts', 'tileview',
        ],
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
  }, [domain, roomName, displayName, onLeave])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

export default function Meetings() {
  const { user, serviceUrls, jitsiToken } = useAuth()
  const [view, setView] = useState('lobby') // lobby | room
  const [roomInput, setRoomInput] = useState('')
  const [activeRoom, setActiveRoom] = useState(null)
  const [jitsiLoaded, setJitsiLoaded] = useState(!!window.JitsiMeetExternalAPI)

  const jitsiDomain = (serviceUrls?.meetings || 'meet.fayait.com').replace(/^https?:\/\//, '')

  // Load Jitsi External API script from our server
  useEffect(() => {
    if (window.JitsiMeetExternalAPI) { setJitsiLoaded(true); return }
    const script = document.createElement('script')
    script.src = `https://${jitsiDomain}/external_api.js`
    script.async = true
    script.onload = () => setJitsiLoaded(true)
    script.onerror = () => console.error('[Meetings] Could not load Jitsi API script')
    document.head.appendChild(script)
    return () => { if (document.head.contains(script)) document.head.removeChild(script) }
  }, [jitsiDomain])

  const joinRoom = (name) => {
    const slug = slugify(name || `room-${Date.now()}`)
    setActiveRoom(slug)
    setView('room')
  }

  if (view === 'room' && activeRoom) {
    if (!jitsiLoaded) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: T.font, color: T.muted }}>
          Loading meeting…
        </div>
      )
    }
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
          background: T.navy, color: '#fff', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>📹 {activeRoom}</span>
          <button
            onClick={() => { setView('lobby'); setActiveRoom(null) }}
            style={{
              marginLeft: 'auto', background: T.red, color: '#fff', border: 'none',
              padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: T.font,
            }}
          >
            Leave
          </button>
        </div>
        <div style={{ flex: 1 }}>
          <MeetingRoom
            domain={jitsiDomain}
            roomName={activeRoom}
            displayName={user?.name || 'User'}
            jwt={jitsiToken}
            onLeave={() => { setView('lobby'); setActiveRoom(null) }}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: T.bg, fontFamily: T.font }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: T.navy, margin: 0 }}>Meetings</h1>
          <p style={{ fontSize: 14, color: T.muted, marginTop: 4 }}>Start or join a video meeting instantly</p>
        </div>

        {/* Start */}
        <div style={{ background: T.card, borderRadius: 12, padding: 28, border: `1px solid ${T.border}`, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: T.navy, marginBottom: 16 }}>Start a new meeting</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={roomInput}
              onChange={e => setRoomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && joinRoom(roomInput)}
              placeholder="Meeting name (optional)"
              style={{
                flex: 1, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: '10px 14px', fontSize: 14, fontFamily: T.font,
                outline: 'none', color: T.navy,
              }}
            />
            <button
              onClick={() => joinRoom(roomInput)}
              style={{
                background: T.orange, color: '#fff', border: 'none',
                padding: '10px 22px', borderRadius: 8, fontSize: 14,
                fontWeight: 600, cursor: 'pointer', fontFamily: T.font,
                whiteSpace: 'nowrap',
              }}
            >
              Start Meeting
            </button>
          </div>
        </div>

        {/* Join */}
        <div style={{ background: T.card, borderRadius: 12, padding: 28, border: `1px solid ${T.border}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: T.navy, marginBottom: 8 }}>Join by room name</h2>
          <p style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
            Enter a room name shared by a colleague to join their meeting.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              placeholder="Room name"
              onKeyDown={e => { if (e.key === 'Enter') joinRoom(e.target.value) }}
              style={{
                flex: 1, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: '10px 14px', fontSize: 14, fontFamily: T.font,
                outline: 'none', color: T.navy,
              }}
            />
            <button
              onClick={e => joinRoom(e.target.previousSibling?.value || '')}
              style={{
                background: T.navy, color: '#fff', border: 'none',
                padding: '10px 22px', borderRadius: 8, fontSize: 14,
                fontWeight: 600, cursor: 'pointer', fontFamily: T.font,
              }}
            >
              Join
            </button>
          </div>
        </div>

        {!jitsiLoaded && (
          <p style={{ marginTop: 16, fontSize: 12, color: T.mutedLight, textAlign: 'center' }}>
            Connecting to meeting server…
          </p>
        )}
      </div>
    </div>
  )
}
