import { useState, useRef, useEffect } from 'react'
import { T } from './shared'
import api from '../../services/api'

export default function QuickScanCheckin({ assets, onCheckin }) {
  const [query, setQuery]   = useState('')
  const [status, setStatus] = useState(null) // { type: 'success'|'error', message }
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = async (value) => {
    const q = (value || query).trim()
    if (!q) return
    setLoading(true)
    setStatus(null)

    const match = assets.find(a =>
      (a.asset_tag  && a.asset_tag.toLowerCase()  === q.toLowerCase()) ||
      (a.serial     && a.serial.toLowerCase()     === q.toLowerCase())
    )

    if (!match) {
      setStatus({ type: 'error', message: `No asset found for "${q}"` })
      setLoading(false)
      setQuery('')
      inputRef.current?.focus()
      return
    }

    try {
      await api.checkinAsset(match.id, {})
      if (onCheckin) onCheckin(match.id)
      setStatus({ type: 'success', message: `Checked in: ${match.hostname} (${match.asset_tag || match.serial})` })
    } catch (e) {
      setStatus({ type: 'error', message: e.message || 'Checkin failed' })
    } finally {
      setLoading(false)
      setQuery('')
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') submit(e.target.value)
  }

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', fontFamily: T.font }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: T.navy, marginBottom: 6 }}>Quick Scan Checkin</h2>
      <p style={{ fontSize: 13, color: T.muted, marginBottom: 28 }}>
        Scan a barcode or type an asset tag / serial number. Press Enter to check in.
      </p>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Asset tag or serial number…"
          disabled={loading}
          style={{
            width: '100%', padding: '12px 14px', fontSize: 16, borderRadius: 10,
            border: `2px solid ${T.navy}`, outline: 'none', boxSizing: 'border-box',
            fontFamily: 'monospace', background: T.card, color: T.text,
          }}
        />
      </div>

      <button
        onClick={() => submit()}
        disabled={loading || !query.trim()}
        style={{
          width: '100%', padding: '11px 0', borderRadius: 9, border: 'none',
          background: T.navy, color: '#fff', fontSize: 14, fontWeight: 700,
          cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
          opacity: loading || !query.trim() ? 0.6 : 1, fontFamily: T.font,
        }}
      >
        {loading ? 'Checking in…' : 'Check In'}
      </button>

      {status && (
        <div style={{
          marginTop: 20, padding: '12px 16px', borderRadius: 10,
          background: status.type === 'success' ? '#e8f5e9' : '#fdecea',
          color:      status.type === 'success' ? '#2e7d32' : '#c62828',
          fontSize: 13, fontWeight: 600, border: `1px solid ${status.type === 'success' ? '#a5d6a7' : '#ef9a9a'}`,
        }}>
          {status.type === 'success' ? '✓ ' : '✗ '}{status.message}
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: 12, color: T.muted, textAlign: 'center' }}>
        Tip: connect a barcode/QR scanner — it auto-submits on scan.
      </p>
    </div>
  )
}
