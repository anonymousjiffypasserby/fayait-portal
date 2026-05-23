import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { handleOIDCCallback } = useAuth()
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code  = params.get('code')
    const err   = params.get('error')
    const desc  = params.get('error_description')

    if (err) { setError(desc || err); return }
    if (!code) { setError('No authorization code received.'); return }

    handleOIDCCallback(code)
      .then(() => {
        const redirect = sessionStorage.getItem('oidc_redirect') || '/'
        sessionStorage.removeItem('oidc_redirect')
        navigate(redirect, { replace: true })
      })
      .catch(e => setError(e.message))
  }, [])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f0f2f5', fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, padding: '40px 36px',
          width: '100%', maxWidth: 400, textAlign: 'center',
          border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1f2e', marginBottom: 8 }}>Sign-in failed</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>{error}</div>
          <button
            onClick={() => navigate('/login', { replace: true })}
            style={{
              padding: '10px 24px', borderRadius: 8, background: '#ff6b35',
              color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >Back to Login</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f0f2f5', fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, border: '3px solid #f0f2f5', borderTopColor: '#ff6b35',
          borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) }}`}</style>
        <div style={{ fontSize: 14, color: '#888' }}>Completing sign-in…</div>
      </div>
    </div>
  )
}
