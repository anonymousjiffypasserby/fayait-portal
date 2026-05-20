import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Passwords() {
  const { user } = useAuth()
  const iframeRef = useRef()

  const vaultUrl = user?.serviceUrls?.passwords || ''

  useEffect(() => {
    if (iframeRef.current && vaultUrl) {
      iframeRef.current.src = vaultUrl
    }
  }, [vaultUrl])

  if (!vaultUrl) {
    return (
      <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 12, color: '#888' }}>
        <div style={{ fontSize: 32 }}>🔑</div>
        <div style={{ fontWeight: 600, color: '#1a1f2e', fontSize: 15 }}>Passwords not configured</div>
        <div style={{ fontSize: 13 }}>Set VAULTWARDEN_URL in the environment to enable this module.</div>
      </div>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1f2e', margin: 0 }}>Passwords</h1>
        <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>Secure password vault powered by Vaultwarden</p>
      </div>
      <div style={{ flex: 1, borderRadius: 10, overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.08)' }}>
        <iframe
          ref={iframeRef}
          src={vaultUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Password Vault"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  )
}
