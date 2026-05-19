import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.07)', muted: '#888', mutedLight: '#bbb',
  orange: '#ff6b35', green: '#1D9E75', red: '#e74c3c',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const PAGE_SIZE = 24

function Spinner({ size = 28 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: size }}>
      <div style={{
        width: size, height: size, border: `3px solid ${T.border}`,
        borderTopColor: T.orange, borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function DocCard({ doc, onClick }) {
  const ext = (doc.original_file_name || '').split('.').pop()?.toLowerCase()
  const icon = { pdf: '📄', docx: '📝', doc: '📝', xlsx: '📊', xls: '📊', png: '🖼', jpg: '🖼', jpeg: '🖼' }[ext] || '📁'

  return (
    <button
      onClick={onClick}
      style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
        padding: 16, cursor: 'pointer', textAlign: 'left', fontFamily: T.font,
        transition: 'box-shadow 0.15s', display: 'flex', flexDirection: 'column', gap: 8,
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, lineHeight: 1.3 }}>{doc.title}</div>
      {doc.original_file_name && (
        <div style={{ fontSize: 11, color: T.muted }}>{doc.original_file_name}</div>
      )}
      {doc.tags_full?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {doc.tags_full.slice(0, 3).map(tag => (
            <span key={tag.id} style={{
              background: 'rgba(255,107,53,0.08)', color: T.orange,
              borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 600,
            }}>
              {tag.name}
            </span>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: T.mutedLight, marginTop: 'auto' }}>
        {doc.added ? new Date(doc.added).toLocaleDateString() : ''}
      </div>
    </button>
  )
}

function DocPreview({ doc, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let url
    api.get(`/documents/${doc.id}/preview`, { responseType: 'blob' })
      .then(res => {
        url = window.URL.createObjectURL(res.data)
        setBlobUrl(url)
      })
      .catch(() => setBlobUrl(null))
      .finally(() => setLoading(false))
    return () => { if (url) window.URL.revokeObjectURL(url) }
  }, [doc.id])

  const handleDownload = async () => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.original_file_name || `document-${doc.id}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Download failed')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
        background: T.navy, color: '#fff', flexShrink: 0,
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{doc.title}</span>
        <button
          onClick={handleDownload}
          style={{
            background: T.orange, color: '#fff', border: 'none',
            padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: T.font,
          }}
        >
          ↓ Download
        </button>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
            width: 32, height: 32, borderRadius: 6, fontSize: 18, cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e1e2e' }}>
            <Spinner />
          </div>
        )}
        {!loading && !blobUrl && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', background: '#1e1e2e' }}>
            Preview not available
          </div>
        )}
        {blobUrl && (
          <iframe
            src={blobUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={doc.title}
          />
        )}
      </div>
    </div>
  )
}

function UploadModal({ types, correspondents, onClose, onUploaded }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [typeId, setTypeId] = useState('')
  const [corrId, setCorrId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  const handleUpload = async () => {
    if (!file) return setError('Choose a file')
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('document', file, file.name)
      if (title) form.append('title', title)
      if (typeId) form.append('document_type', typeId)
      if (corrId) form.append('correspondent', corrId)
      await api.post('/documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      onUploaded()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: T.card, borderRadius: 12, padding: 28, width: 440, fontFamily: T.font }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: T.navy }}>Upload Document</h3>

        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${file ? T.orange : T.border}`, borderRadius: 10,
            padding: 28, textAlign: 'center', cursor: 'pointer', marginBottom: 16,
            background: file ? 'rgba(255,107,53,0.04)' : 'transparent',
          }}
        >
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { setFile(e.target.files[0]); setTitle(t => t || e.target.files[0]?.name.replace(/\.[^.]+$/, '') || '') }} />
          {file ? (
            <div>
              <div style={{ fontSize: 20 }}>📎</div>
              <div style={{ fontSize: 13, color: T.navy, fontWeight: 500, marginTop: 4 }}>{file.name}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{(file.size / 1024).toFixed(0)} KB</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 28 }}>⬆</div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Click to choose file</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)"
            style={{ border: `1px solid ${T.border}`, borderRadius: 7, padding: '8px 12px', fontSize: 13, fontFamily: T.font, outline: 'none' }}
          />
          {types.length > 0 && (
            <select
              value={typeId}
              onChange={e => setTypeId(e.target.value)}
              style={{ border: `1px solid ${T.border}`, borderRadius: 7, padding: '8px 12px', fontSize: 13, fontFamily: T.font, outline: 'none', background: '#fff' }}
            >
              <option value="">Document type (optional)</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {correspondents.length > 0 && (
            <select
              value={corrId}
              onChange={e => setCorrId(e.target.value)}
              style={{ border: `1px solid ${T.border}`, borderRadius: 7, padding: '8px 12px', fontSize: 13, fontFamily: T.font, outline: 'none', background: '#fff' }}
            >
              <option value="">Correspondent (optional)</option>
              {correspondents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {error && <div style={{ marginTop: 12, fontSize: 12, color: T.red }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, border: `1px solid ${T.border}`, background: 'none', borderRadius: 7, padding: 10, fontSize: 13, cursor: 'pointer', fontFamily: T.font }}>
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              flex: 1, background: T.orange, color: '#fff', border: 'none',
              borderRadius: 7, padding: 10, fontSize: 13, fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: T.font, opacity: uploading ? 0.7 : 1,
            }}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Documents() {
  const [docs, setDocs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [tags, setTags] = useState([])
  const [types, setTypes] = useState([])
  const [correspondents, setCorrespondents] = useState([])
  const [activeTag, setActiveTag] = useState(null)
  const [activeType, setActiveType] = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async (pg = 1, q = search, tagId = activeTag, typeId = activeType) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: pg, page_size: PAGE_SIZE })
      if (q) params.set('search', q)
      if (tagId) params.set('tags', tagId)
      if (typeId) params.set('type', typeId)
      const { data } = await api.get(`/documents?${params}`)
      setDocs(data.results || [])
      setTotal(data.count || 0)
      setPage(pg)
    } catch {
      setDocs([])
    } finally {
      setLoading(false)
    }
  }, [search, activeTag, activeType])

  useEffect(() => {
    load()
    Promise.all([
      api.get('/documents/tags').then(r => setTags(r.data)).catch(() => {}),
      api.get('/documents/types').then(r => setTypes(r.data)).catch(() => {}),
      api.get('/documents/correspondents').then(r => setCorrespondents(r.data)).catch(() => {}),
    ])
  }, [load])

  const handleSearch = () => {
    setSearch(searchInput)
    load(1, searchInput, activeTag, activeType)
  }

  const handleTagClick = (id) => {
    const next = activeTag === id ? null : id
    setActiveTag(next)
    load(1, search, next, activeType)
  }

  const handleTypeClick = (id) => {
    const next = activeType === id ? null : id
    setActiveType(next)
    load(1, search, activeTag, next)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: T.font }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, borderRight: `1px solid ${T.border}`,
        background: T.card, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 12 }}>Documents</div>
          <button
            onClick={() => setUploading(true)}
            style={{
              width: '100%', background: T.orange, color: '#fff', border: 'none',
              borderRadius: 7, padding: '8px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: T.font,
            }}
          >
            ⬆ Upload
          </button>
        </div>

        {types.length > 0 && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{ fontSize: 10, color: T.mutedLight, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Types</div>
            {types.map(t => (
              <button
                key={t.id}
                onClick={() => handleTypeClick(t.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: activeType === t.id ? 'rgba(255,107,53,0.08)' : 'transparent',
                  border: 'none', borderRadius: 6, padding: '6px 8px', marginBottom: 2,
                  fontSize: 13, cursor: 'pointer', fontFamily: T.font,
                  color: activeType === t.id ? T.orange : T.navy, fontWeight: activeType === t.id ? 600 : 400,
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div style={{ padding: '12px 16px 12px' }}>
            <div style={{ fontSize: 10, color: T.mutedLight, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag.id)}
                  style={{
                    background: activeTag === tag.id ? T.orange : 'rgba(255,107,53,0.08)',
                    color: activeTag === tag.id ? '#fff' : T.orange,
                    border: 'none', borderRadius: 5, padding: '3px 8px',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: T.font,
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: T.bg }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px',
          background: T.card, borderBottom: `1px solid ${T.border}`, flexShrink: 0,
        }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search documents…"
            style={{
              flex: 1, maxWidth: 320, border: `1px solid ${T.border}`, borderRadius: 7,
              padding: '8px 12px', fontSize: 13, fontFamily: T.font, outline: 'none',
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              background: T.navy, color: '#fff', border: 'none',
              borderRadius: 7, padding: '8px 14px', fontSize: 13, cursor: 'pointer',
            }}
          >
            Search
          </button>
          {(search || activeTag || activeType) && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setActiveTag(null); setActiveType(null); load(1, '', null, null) }}
              style={{ background: 'none', border: 'none', color: T.muted, fontSize: 12, cursor: 'pointer' }}
            >
              ✕ Clear
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: T.muted }}>
            {total} document{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, padding: 20 }}>
          {loading ? <Spinner /> : docs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: T.muted }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗂️</div>
              <div style={{ fontSize: 14 }}>No documents found</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 14,
            }}>
              {docs.map(doc => (
                <DocCard key={doc.id} doc={doc} onClick={() => setPreviewDoc(doc)} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button
                disabled={page <= 1}
                onClick={() => load(page - 1)}
                style={{
                  border: `1px solid ${T.border}`, background: T.card, borderRadius: 6,
                  padding: '6px 14px', fontSize: 13, cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                ← Prev
              </button>
              <span style={{ padding: '6px 14px', fontSize: 13, color: T.muted }}>
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => load(page + 1)}
                style={{
                  border: `1px solid ${T.border}`, background: T.card, borderRadius: 6,
                  padding: '6px 14px', fontSize: 13, cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.5 : 1,
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </main>

      {previewDoc && (
        <DocPreview
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {uploading && (
        <UploadModal
          types={types}
          correspondents={correspondents}
          onClose={() => setUploading(false)}
          onUploaded={() => { setUploading(false); load() }}
        />
      )}
    </div>
  )
}
