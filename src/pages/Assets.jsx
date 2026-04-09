import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const STATUS_COLORS = {
  'Ready to Deploy': '#1D9E75',
  'Deployed': '#378ADD',
  'Out for Repair': '#f39c12',
  'Broken': '#e74c3c',
  'Lost/Stolen': '#e74c3c',
  'Archived': '#aaa',
}

const ADMIN_ROLES = ['superadmin', 'admin']

export default function Assets() {
  const { user } = useAuth()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const isAdmin = ADMIN_ROLES.includes(user?.role)

  useEffect(() => {
    api.getAssets()
      .then(data => setAssets(data.rows || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = assets.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.serial?.toLowerCase().includes(search.toLowerCase()) ||
    a.assigned_to?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const handleConnect = (asset) => {
    const id = asset.custom_fields?.rustdesk_id?.value
    const password = asset.custom_fields?.rustdesk_password?.value
    if (id && password) {
      window.open(`rustdesk://${id}:${password}`, '_self')
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', fontSize: 14 }}>
      Loading assets...
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#e74c3c', fontSize: 14 }}>
      {error}
    </div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 28, background: '#f0f2f5' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1f2e', margin: 0 }}>Assets</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>{assets.length} devices registered</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search assets..."
          style={{
            padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
            fontSize: 13, width: 220, outline: 'none', background: '#fff',
          }}
        />
      </div>

      {/* Asset list */}
      {filtered.length === 0 ? (
        <div style={{
          background: '#fff', borderRadius: 12, padding: '48px 24px',
          textAlign: 'center', border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💻</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1f2e', marginBottom: 8 }}>No assets yet</div>
          <div style={{ fontSize: 13, color: '#888' }}>
            {isAdmin ? 'Run the Faya IT installer on your devices to register them here.' : 'No devices have been registered yet.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(asset => {
            const hasRustDesk = asset.custom_fields?.rustdesk_id?.value
            const statusColor = STATUS_COLORS[asset.status?.name] || '#aaa'
            return (
              <div
                key={asset.id}
                style={{
                  background: '#fff', borderRadius: 12, padding: '16px 20px',
                  border: '1px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex', alignItems: 'center', gap: 16,
                  cursor: 'pointer',
                }}
                onClick={() => setSelected(selected?.id === asset.id ? null : asset)}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#f0f2f5', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                }}>
                  {asset.category?.name?.toLowerCase().includes('laptop') ? '💻' :
                   asset.category?.name?.toLowerCase().includes('desktop') ? '🖥️' :
                   asset.category?.name?.toLowerCase().includes('server') ? '🖧' :
                   asset.category?.name?.toLowerCase().includes('printer') ? '🖨️' : '💻'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1f2e', marginBottom: 2 }}>
                    {asset.name || 'Unnamed device'}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {asset.model?.name || '—'} · {asset.serial || 'No serial'}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#888', minWidth: 120 }}>
                  {asset.assigned_to?.name || 'Unassigned'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
                  <span style={{ fontSize: 12, color: statusColor }}>{asset.status?.name || 'Unknown'}</span>
                </div>

                {isAdmin && hasRustDesk && (
                  <button
                    onClick={e => { e.stopPropagation(); handleConnect(asset) }}
                    style={{
                      background: '#ff6b35', color: '#fff', border: 'none',
                      borderRadius: 7, padding: '7px 14px', fontSize: 12,
                      fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    🖥 Connect
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Asset detail panel */}
      {selected && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
          background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
          zIndex: 200, overflowY: 'auto', padding: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1f2e' }}>Asset Details</div>
            <button onClick={() => setSelected(null)} style={{
              background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888',
            }}>✕</button>
          </div>

          {[
            { label: 'Name', value: selected.name },
            { label: 'Model', value: selected.model?.name },
            { label: 'Serial', value: selected.serial },
            { label: 'Category', value: selected.category?.name },
            { label: 'Status', value: selected.status?.name },
            { label: 'Assigned To', value: selected.assigned_to?.name },
            { label: 'Location', value: selected.location?.name },
            { label: 'Purchase Date', value: selected.purchase_date?.formatted },
            { label: 'Warranty', value: selected.warranty_expires?.formatted },
            { label: 'RustDesk ID', value: selected.custom_fields?.rustdesk_id?.value },
          ].map(({ label, value }) => value ? (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#1a1f2e', fontWeight: 500 }}>{value}</div>
            </div>
          ) : null)}

          {isAdmin && selected.custom_fields?.rustdesk_id?.value && (
            <button
              onClick={() => handleConnect(selected)}
              style={{
                width: '100%', background: '#ff6b35', color: '#fff',
                border: 'none', borderRadius: 8, padding: '12px 0',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8,
              }}
            >
              🖥 Connect via RustDesk
            </button>
          )}
        </div>
      )}
    </div>
  )
}
