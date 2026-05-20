import { useState, useEffect, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'https://api.fayait.com'

const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.06)', muted: '#888',
  orange: '#f97316', font: "'DM Sans','Helvetica Neue',sans-serif",
}

function fileIcon(item) {
  if (item.isDir) return '📁'
  const ext = item.name.split('.').pop().toLowerCase()
  if (['jpg','jpeg','png','gif','svg','webp'].includes(ext)) return '🖼️'
  if (['pdf'].includes(ext)) return '📄'
  if (['doc','docx'].includes(ext)) return '📝'
  if (['xls','xlsx'].includes(ext)) return '📊'
  if (['ppt','pptx'].includes(ext)) return '📑'
  if (['zip','tar','gz','rar'].includes(ext)) return '🗜️'
  if (['mp4','mov','avi','mkv'].includes(ext)) return '🎬'
  if (['mp3','wav','aac'].includes(ext)) return '🎵'
  return '📄'
}

function fmtSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Files() {
  const [path, setPath] = useState('/')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [newFolder, setNewFolder] = useState('')
  const [showMkdir, setShowMkdir] = useState(false)
  const fileRef = useRef()
  const token = localStorage.getItem('token')

  function browse(p) {
    setPath(p)
    setLoading(true)
    setError(null)
    fetch(`${API}/api/files/browse?path=${encodeURIComponent(p)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setItems(d.items || []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { browse('/') }, [])

  function breadcrumbs() {
    const parts = path.split('/').filter(Boolean)
    return [{ label: 'Home', path: '/' }, ...parts.map((p, i) => ({
      label: p,
      path: '/' + parts.slice(0, i + 1).join('/'),
    }))]
  }

  async function download(item) {
    const url = `${API}/api/files/download?path=${encodeURIComponent(item.path)}`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const blob = await r.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = item.name
    a.click()
  }

  async function deleteItem(item) {
    if (!confirm(`Delete "${item.name}"?`)) return
    await fetch(`${API}/api/files/delete?path=${encodeURIComponent(item.path)}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    browse(path)
  }

  async function mkdir() {
    if (!newFolder.trim()) return
    const p = path.replace(/\/$/, '') + '/' + newFolder.trim()
    await fetch(`${API}/api/files/mkdir`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: p }),
    })
    setNewFolder(''); setShowMkdir(false); browse(path)
  }

  async function uploadFiles(files) {
    setUploading(true)
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      await fetch(`${API}/api/files/upload?path=${encodeURIComponent(path)}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
    }
    setUploading(false)
    browse(path)
  }

  return (
    <div style={{ fontFamily: T.font }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: T.navy, margin: 0 }}>Files</h1>
          <p style={{ color: T.muted, fontSize: 13, margin: '4px 0 0' }}>Company file storage powered by Nextcloud</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowMkdir(v => !v)} style={{
            padding: '7px 14px', background: '#fff', border: `1px solid rgba(0,0,0,0.12)`,
            borderRadius: 7, fontSize: 13, cursor: 'pointer', color: T.navy, fontWeight: 500,
          }}>+ New Folder</button>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
            padding: '7px 14px', background: T.orange, border: 'none',
            borderRadius: 7, fontSize: 13, cursor: 'pointer', color: '#fff', fontWeight: 500,
          }}>{uploading ? 'Uploading…' : '⬆ Upload'}</button>
          <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
            onChange={e => uploadFiles([...e.target.files])} />
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, marginBottom: 12, flexWrap: 'wrap' }}>
        {breadcrumbs().map((b, i, arr) => (
          <span key={b.path} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => browse(b.path)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: i === arr.length - 1 ? T.navy : T.orange, fontWeight: i === arr.length - 1 ? 600 : 400,
              padding: 0, fontSize: 13,
            }}>{b.label}</button>
            {i < arr.length - 1 && <span style={{ color: T.muted }}>/</span>}
          </span>
        ))}
      </div>

      {/* New folder input */}
      {showMkdir && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={newFolder} onChange={e => setNewFolder(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && mkdir()}
            placeholder="Folder name"
            autoFocus
            style={{ padding: '7px 12px', border: `1px solid rgba(0,0,0,0.15)`, borderRadius: 7, fontSize: 13, flex: 1, maxWidth: 240 }}
          />
          <button onClick={mkdir} style={{ padding: '7px 14px', background: T.orange, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>Create</button>
          <button onClick={() => setShowMkdir(false)} style={{ padding: '7px 14px', background: '#eee', color: T.navy, border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        </div>
      )}

      {/* File list */}
      <div style={{ background: T.card, border: `0.5px solid rgba(0,0,0,0.08)`, borderRadius: 10, overflow: 'hidden' }}>
        {loading && <div style={{ padding: 40, textAlign: 'center', color: T.muted }}>Loading…</div>}
        {!loading && error && <div style={{ padding: 20, color: '#e74c3c', fontSize: 13 }}>Error: {error}</div>}
        {!loading && !error && items.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
            <div style={{ color: T.muted, fontSize: 13 }}>This folder is empty</div>
          </div>
        )}
        {!loading && items.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: `1px solid rgba(0,0,0,0.06)` }}>
                {['Name', 'Size', 'Modified', ''].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 500, color: T.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.sort((a, b) => b.isDir - a.isDir || a.name.localeCompare(b.name)).map((item, i) => (
                <tr key={item.path}
                  style={{ borderBottom: i < items.length - 1 ? `1px solid rgba(0,0,0,0.04)` : 'none', cursor: item.isDir ? 'pointer' : 'default' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                  onClick={() => item.isDir && browse(item.path)}>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 15, marginRight: 8 }}>{fileIcon(item)}</span>
                    <span style={{ color: item.isDir ? T.orange : T.navy, fontWeight: item.isDir ? 500 : 400 }}>{item.name}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: T.muted }}>{item.isDir ? '—' : fmtSize(item.size)}</td>
                  <td style={{ padding: '10px 14px', color: T.muted }}>{fmtDate(item.modified)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {!item.isDir && (
                        <button onClick={() => download(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.orange, fontSize: 12 }}>Download</button>
                      )}
                      <button onClick={() => deleteItem(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: 12 }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
