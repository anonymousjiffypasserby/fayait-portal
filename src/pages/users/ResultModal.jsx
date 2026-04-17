import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import ProvisioningBadge from './ProvisioningBadge'
import { T } from './shared'

export default function ResultModal({ userId, tempPassword, initialProvisioningStatus = {}, onClose }) {
  const [copied, setCopied] = useState(false)
  const [provStatus, setProvStatus] = useState(initialProvisioningStatus)
  const intervalRef = useRef(null)

  const isSettled = (status) =>
    Object.keys(status).length > 0 &&
    Object.values(status).every(v => v === 'provisioned' || v === 'failed')

  useEffect(() => {
    if (isSettled(initialProvisioningStatus)) return

    intervalRef.current = setInterval(async () => {
      try {
        const u = await api.getUser(userId)
        const s = u.provisioning_status || {}
        setProvStatus(s)
        if (isSettled(s)) clearInterval(intervalRef.current)
      } catch {}
    }, 2000)

    return () => clearInterval(intervalRef.current)
  }, [userId])

  const copy = () => {
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasProvisioning = Object.keys(provStatus).length > 0

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 12, width: 420, maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>User Created</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 8 }}>Temporary password</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#f4f5f7', borderRadius: 8, padding: '10px 14px',
            fontFamily: 'monospace', fontSize: 14, color: '#111',
            marginBottom: 20,
          }}>
            <span style={{ flex: 1, userSelect: 'all' }}>{tempPassword}</span>
            <button onClick={copy} style={{
              background: copied ? '#EAF3DE' : T.orange,
              color: copied ? '#3B6D11' : '#fff',
              border: 'none', borderRadius: 6,
              padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 500,
              transition: 'background 0.2s',
            }}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {hasProvisioning && (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#111', marginBottom: 10 }}>
                Service provisioning
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(provStatus).map(([svc, status]) => (
                  <div key={svc} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', background: '#f4f5f7', borderRadius: 8,
                  }}>
                    <ProvisioningBadge service={svc} status={status} />
                    {status === 'pending' && (
                      <span style={{ fontSize: 11, color: T.muted, fontStyle: 'italic' }}>provisioning…</span>
                    )}
                  </div>
                ))}
              </div>
              {!isSettled(provStatus) && (
                <div style={{ fontSize: 11, color: T.muted, marginTop: 10, textAlign: 'center' }}>
                  Checking status every 2s…
                </div>
              )}
            </>
          )}

          <button onClick={onClose} style={{
            marginTop: 20, width: '100%', padding: '9px 0', borderRadius: 8,
            background: T.orange, color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
