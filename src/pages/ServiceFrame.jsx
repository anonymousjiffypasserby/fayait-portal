import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

const ELEMENT_WEB = 'https://chat.fayait.com'

const SERVICE_MOBILE_URLS = {
  tickets: 'https://zammad.fayait.com/mobile',
}

const SERVICE_URLS = {
  tickets:  'https://zammad.fayait.com',
  assets:   'https://snipe.fayait.com',
  files:    'https://nextcloud.fayait.com',
  projects: 'https://plane.fayait.com',
  status:   'https://uptime.fayait.com',
  grafana:  'https://grafana.fayait.com',
}

const SERVICE_INFO = {
  tickets: {
    name: 'Helpdesk & Ticketing',
    description: 'Submit and track IT support requests. Your team can create tickets for any IT issue — hardware, software, access requests — and get updates in real time.',
    icon: '🎫',
  },
  assets: {
    name: 'Asset Management',
    description: 'Keep track of all your company devices — laptops, desktops, printers, servers. Know what you own, who has it, and when warranties expire.',
    icon: '💻',
  },
  chat: {
    name: 'Team Chat',
    description: 'A secure, private team messaging platform. Create channels for departments, share files, and collaborate — all hosted on your own infrastructure.',
    icon: '💬',
  },
  files: {
    name: 'File Storage',
    description: 'Secure cloud storage for your company files. Share documents, collaborate in real time with built-in office tools, and control who has access to what.',
    icon: '📁',
  },
  projects: {
    name: 'Project Management',
    description: 'Plan and track projects with boards, timelines, and task assignments. Keep your team aligned and deadlines visible.',
    icon: '📋',
  },
  status: {
    name: 'Service Status',
    description: 'Real-time uptime monitoring for all your services. See what\'s online, get notified of outages, and review historical uptime reports.',
    icon: '🟢',
  },
  grafana: {
    name: 'Analytics',
    description: 'Visual dashboards showing your infrastructure health, performance metrics, and trends. Understand your systems at a glance.',
    icon: '📊',
  },
}

const ADMIN_ROLES = ['superadmin', 'admin']

// ── Mobile: show deep-link card instead of iframe ───────────────────────────
function ChatMobile({ homeserver }) {
  const deepLink = homeserver
    ? `element://vector/login?hs_url=${encodeURIComponent(homeserver)}`
    : 'element://vector/'

  const webUrl = homeserver
    ? `${ELEMENT_WEB}/#/login?defaultHsUrl=${encodeURIComponent(homeserver)}`
    : ELEMENT_WEB

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#f0f2f5', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 28px',
        maxWidth: 360, width: '100%', textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>💬</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1f2e', marginBottom: 8 }}>
          Team Chat
        </div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 28 }}>
          For the best experience, open chat in the Element app.
        </div>

        <a href={deepLink} style={{
          display: 'block', background: '#0dbd8b', color: '#fff',
          padding: '13px 0', borderRadius: 8, fontSize: 14,
          fontWeight: 600, textDecoration: 'none', marginBottom: 12,
        }}>
          Open in Element app
        </a>

        <a href={webUrl} target="_blank" rel="noopener noreferrer" style={{
          display: 'block', background: '#f5f5f5', color: '#444',
          padding: '13px 0', borderRadius: 8, fontSize: 14,
          fontWeight: 600, textDecoration: 'none', marginBottom: 20,
        }}>
          Continue in browser
        </a>

        <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>
          Don&rsquo;t have Element?{' '}
          <a href="https://element.io/download" target="_blank" rel="noopener noreferrer" style={{ color: '#0dbd8b' }}>
            Download free
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Desktop: launcher card — opens Element Web in a new tab ──────────────────
// Element Web cannot be embedded in a cross-origin iframe because it depends on
// localStorage, which Chrome partitions (and in some configs blocks) for iframes.
// Opening as a top-level tab sidesteps this entirely.
function ChatLauncher() {
  const [status, setStatus] = useState('idle') // idle | loading | open | blocked | error
  const [errorMsg, setErrorMsg] = useState(null)
  const winRef = useRef(null)

  function openChat() {
    setStatus('loading')
    api.getMatrixLoginToken()
      .then(({ login_token, homeserver }) => {
        const url = `${ELEMENT_WEB}/bridge.html`
          + `?loginToken=${encodeURIComponent(login_token)}`
          + `&hs_url=${encodeURIComponent(homeserver)}`
        const win = window.open(url, 'faya-chat')
        if (win) {
          winRef.current = win
          setStatus('open')
        } else {
          setStatus('blocked')
        }
      })
      .catch(err => {
        setStatus('error')
        setErrorMsg(err.message)
      })
  }

  function focusOrReset() {
    if (winRef.current && !winRef.current.closed) {
      winRef.current.focus()
    } else {
      winRef.current = null
      setStatus('idle')
    }
  }

  const card = {
    width: '100%', height: '100%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#15191E', padding: 24,
  }
  const box = {
    background: '#21262d', borderRadius: 16, padding: '40px 28px',
    maxWidth: 360, width: '100%', textAlign: 'center',
    boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.06)',
  }
  const primaryBtn = {
    display: 'block', width: '100%', background: '#0dbd8b', color: '#fff',
    padding: '13px 0', borderRadius: 8, fontSize: 14, fontWeight: 600,
    border: 'none', cursor: 'pointer', marginBottom: 12,
  }
  const secondaryBtn = { ...primaryBtn, background: '#2d333b' }

  return (
    <div style={card}>
      <div style={box}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>💬</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#e6edf3', marginBottom: 8 }}>
          Team Chat
        </div>

        {status === 'idle' && (
          <>
            <div style={{ fontSize: 13, color: '#8d96a0', lineHeight: 1.6, marginBottom: 24 }}>
              Opens in a new tab — you&rsquo;ll be signed in automatically.
            </div>
            <button onClick={openChat} style={primaryBtn}>Open Team Chat</button>
          </>
        )}

        {status === 'loading' && (
          <div style={{ fontSize: 13, color: '#8d96a0', marginTop: 16 }}>
            Signing you in&hellip;
          </div>
        )}

        {status === 'open' && (
          <>
            <div style={{ fontSize: 13, color: '#8d96a0', lineHeight: 1.6, marginBottom: 24 }}>
              Chat is open in another tab.
            </div>
            <button onClick={focusOrReset} style={primaryBtn}>Switch to Chat tab</button>
            <button onClick={openChat} style={secondaryBtn}>Open new session</button>
          </>
        )}

        {status === 'blocked' && (
          <>
            <div style={{ fontSize: 13, color: '#f85149', lineHeight: 1.6, marginBottom: 24 }}>
              Your browser blocked the popup. Allow popups for this site and try again.
            </div>
            <button onClick={openChat} style={primaryBtn}>Try Again</button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 13, color: '#f85149', lineHeight: 1.6, marginBottom: 24 }}>
              {errorMsg || 'Could not sign in to chat.'}
            </div>
            <button onClick={openChat} style={primaryBtn}>Try Again</button>
          </>
        )}
      </div>
    </div>
  )
}

const FILES_URL = 'https://files.fayait.com'

// ── Files: auto-login via nc-bridge.html, then iframe shows Nextcloud ────────
// Bridge page is same-origin to Nextcloud so it can set session cookies freely.
function FilesFrame() {
  const [src, setSrc] = useState(null)
  const [error, setError] = useState(null)

  function load() {
    setSrc(null)
    setError(null)
    api.getFilesLoginToken()
      .then(({ token }) => {
        setSrc(`${FILES_URL}/themes/nc-bridge.html?token=${encodeURIComponent(token)}`)
      })
      .catch(err => setError(err.message))
  }

  useEffect(() => { load() }, [])

  if (error) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#0082c9', padding: 24,
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, padding: '40px 28px',
          maxWidth: 360, width: '100%', textAlign: 'center',
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>📁</div>
          <div style={{ fontSize: 14, color: '#c0392b', marginBottom: 20 }}>{error}</div>
          <button onClick={load} style={{
            background: '#0082c9', color: '#fff', border: 'none',
            padding: '12px 28px', borderRadius: 8, fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
          }}>Retry</button>
        </div>
      </div>
    )
  }

  if (!src) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#0082c9', color: '#fff', fontSize: 14,
      }}>
        Opening Files&hellip;
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <iframe
        src={src}
        style={{ flex: 1, width: '100%', border: 'none', display: 'block' }}
        title="files"
        allow="fullscreen"
      />
    </div>
  )
}

export default function ServiceFrame({ service }) {
  const { user } = useAuth()
  const isMobile = window.innerWidth < 768
  const services = user?.services || {}
  const isActive = services[service] === 'active'
  const isAdmin  = ADMIN_ROLES.includes(user?.role)
  const info     = SERVICE_INFO[service] || { name: service, description: '', icon: '⚙️' }

  // ── Chat: launcher card (desktop) or deep-link card (mobile) ────────────────
  if (service === 'chat') {
    if (!isActive) {
      // Fall through to inactive gate below
    } else if (isMobile) {
      return <ChatMobile homeserver={user?.matrix_homeserver} />
    } else {
      return <ChatLauncher />
    }
  }

  // ── Inactive gate ────────────────────────────────────────────────────────────
  if (!isActive) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#f0f2f5', padding: 40,
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, padding: '48px 40px',
          maxWidth: 480, width: '100%', textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>{info.icon}</div>
          <div style={{ fontSize: 11, color: '#ff6b35', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            Not activated
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1f2e', marginBottom: 12 }}>
            {info.name}
          </div>
          <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 28 }}>
            {info.description}
          </div>
          {isAdmin && (
            <div style={{
              background: '#fff8f5', border: '1px solid rgba(255,107,53,0.2)',
              borderRadius: 10, padding: '14px 18px', marginBottom: 24,
              fontSize: 13, color: '#888', textAlign: 'left',
            }}>
              <strong style={{ color: '#1a1f2e' }}>Admin note:</strong> Contact Faya IT to activate this service for your organization.
            </div>
          )}
          <a href="mailto:support@fayait.com" style={{
            display: 'inline-block', background: '#ff6b35', color: '#fff',
            padding: '12px 28px', borderRadius: 8, fontSize: 13,
            fontWeight: 600, textDecoration: 'none',
          }}>
            Contact Faya IT to unlock
          </a>
        </div>
      </div>
    )
  }

  // ── Files: iframe with bridge-page auto-login ────────────────────────────────
  if (service === 'files') {
    return <FilesFrame />
  }

  // ── Iframe services (grafana, status, etc.) ───────────────────────────────────
  const url = (isMobile && SERVICE_MOBILE_URLS[service]) || SERVICE_URLS[service]

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <iframe
        src={url}
        style={{ flex: 1, width: '100%', border: 'none', display: 'block' }}
        title={service}
        allow="fullscreen"
      />
    </div>
  )
}
