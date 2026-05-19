import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.07)', muted: '#888', mutedLight: '#bbb',
  orange: '#ff6b35', green: '#1D9E75', red: '#e74c3c',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: 28, height: 28, border: `3px solid ${T.border}`,
        borderTopColor: T.orange, borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function MarkdownContent({ content }) {
  // Simple markdown renderer — headings, bold, italic, code, links, lists
  if (!content) return <p style={{ color: T.muted, fontStyle: 'italic' }}>Empty page</p>

  const html = content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:0.9em">$1</code>')
    .replace(/```[\s\S]*?```/g, m => `<pre style="background:#1e1e2e;color:#cdd6f4;padding:16px;border-radius:8px;overflow:auto;font-size:13px">${m.slice(3, -3)}</pre>`)
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul style="padding-left:20px">${m}</ul>`)
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#ff6b35">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|u|p|l|c|s|a|b|e|i])(.+)$/gm, '$1')

  return (
    <div
      style={{ lineHeight: 1.7, color: '#2d3748', fontFamily: T.font, fontSize: 15 }}
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  )
}

function PageEditor({ page, onSave, onCancel }) {
  const [title, setTitle] = useState(page?.title || '')
  const [content, setContent] = useState(page?.content || '')
  const [path, setPath] = useState(page?.path || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    if (!title.trim()) return setError('Title is required')
    if (!page && !path.trim()) return setError('Path is required')
    setSaving(true)
    setError(null)
    try {
      if (page) {
        await api.put(`/wiki/pages/${page.id}`, { title, content })
      } else {
        await api.post('/wiki/pages', { title, content, path: path.replace(/^\//, ''), description: '' })
      }
      onSave()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
        borderBottom: `1px solid ${T.border}`, background: T.card, flexShrink: 0,
      }}>
        <button onClick={onCancel} style={{
          background: 'none', border: `1px solid ${T.border}`, borderRadius: 6,
          padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: T.font,
        }}>Cancel</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.navy }}>
          {page ? `Edit: ${page.title}` : 'New Page'}
        </span>
        {error && <span style={{ color: T.red, fontSize: 13 }}>{error}</span>}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            marginLeft: 'auto', background: T.orange, color: '#fff', border: 'none',
            padding: '7px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: T.font,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, gap: 12, overflowY: 'auto' }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Page title"
          style={{
            border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 14px',
            fontSize: 16, fontWeight: 600, fontFamily: T.font, outline: 'none', color: T.navy,
          }}
        />
        {!page && (
          <input
            value={path}
            onChange={e => setPath(e.target.value)}
            placeholder="URL path (e.g. getting-started/overview)"
            style={{
              border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 14px',
              fontSize: 13, fontFamily: T.font, outline: 'none', color: T.navy,
            }}
          />
        )}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write in Markdown…"
          style={{
            flex: 1, border: `1px solid ${T.border}`, borderRadius: 8, padding: '12px 14px',
            fontSize: 13, fontFamily: 'monospace', outline: 'none', color: T.navy,
            resize: 'none', lineHeight: 1.6, minHeight: 400,
          }}
        />
      </div>
    </div>
  )
}

export default function Wiki() {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePage, setActivePage] = useState(null)
  const [pageContent, setPageContent] = useState(null)
  const [pageLoading, setPageLoading] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [newPage, setNewPage] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadPages = useCallback(async () => {
    try {
      const { data } = await api.get('/wiki/pages')
      setPages(data)
    } catch {
      setPages([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPages() }, [loadPages])

  const openPage = async (page) => {
    setActivePage(page)
    setEditMode(false)
    setPageLoading(true)
    setPageContent(null)
    try {
      const { data } = await api.get(`/wiki/pages/${page.id}`)
      setPageContent(data)
    } catch {
      setPageContent(null)
    } finally {
      setPageLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQ.trim()) { setSearchResults(null); return }
    setSearching(true)
    try {
      const { data } = await api.get(`/wiki/search?q=${encodeURIComponent(searchQ)}`)
      setSearchResults(data)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleDelete = async () => {
    if (!activePage || !window.confirm(`Delete "${activePage.title}"?`)) return
    setDeleting(true)
    try {
      await api.delete(`/wiki/pages/${activePage.id}`)
      setActivePage(null)
      setPageContent(null)
      loadPages()
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const displayList = searchResults !== null ? searchResults : pages

  if (newPage) {
    return (
      <div style={{ height: '100%', background: T.bg }}>
        <PageEditor
          onSave={() => { setNewPage(false); loadPages() }}
          onCancel={() => setNewPage(false)}
        />
      </div>
    )
  }

  if (editMode && activePage) {
    return (
      <div style={{ height: '100%', background: T.bg }}>
        <PageEditor
          page={{ ...activePage, content: pageContent?.content || '' }}
          onSave={() => { setEditMode(false); openPage(activePage) }}
          onCancel={() => setEditMode(false)}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: T.font }}>
      {/* Sidebar */}
      <aside style={{
        width: 260, flexShrink: 0, borderRight: `1px solid ${T.border}`,
        background: T.card, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        <div style={{ padding: '16px 16px 8px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 10 }}>Wiki</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search…"
              style={{
                flex: 1, border: `1px solid ${T.border}`, borderRadius: 6,
                padding: '6px 10px', fontSize: 12, fontFamily: T.font, outline: 'none',
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                background: T.navy, color: '#fff', border: 'none',
                borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer',
              }}
            >
              {searching ? '…' : '⌕'}
            </button>
          </div>
          {searchResults !== null && (
            <button
              onClick={() => { setSearchQ(''); setSearchResults(null) }}
              style={{
                marginTop: 6, background: 'none', border: 'none', color: T.muted,
                fontSize: 11, cursor: 'pointer', padding: 0,
              }}
            >
              ✕ Clear search
            </button>
          )}
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? <Spinner /> : displayList.length === 0 ? (
            <div style={{ padding: '20px 16px', color: T.muted, fontSize: 13, textAlign: 'center' }}>
              {searchResults !== null ? 'No results' : 'No pages yet'}
            </div>
          ) : displayList.map(p => (
            <button
              key={p.id}
              onClick={() => openPage(p)}
              style={{
                width: '100%', textAlign: 'left', border: 'none',
                background: activePage?.id === p.id ? 'rgba(255,107,53,0.08)' : 'transparent',
                borderLeft: activePage?.id === p.id ? `3px solid ${T.orange}` : '3px solid transparent',
                padding: '8px 16px', cursor: 'pointer', fontFamily: T.font,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: activePage?.id === p.id ? T.orange : T.navy }}>
                {p.title}
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>/{p.path}</div>
            </button>
          ))}
        </nav>

        <div style={{ padding: 12, borderTop: `1px solid ${T.border}` }}>
          <button
            onClick={() => setNewPage(true)}
            style={{
              width: '100%', background: T.orange, color: '#fff', border: 'none',
              borderRadius: 7, padding: '8px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: T.font,
            }}
          >
            + New Page
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
        {!activePage ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.muted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📖</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.navy }}>Company Wiki</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>Select a page from the sidebar</div>
          </div>
        ) : pageLoading ? <Spinner /> : (
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: T.navy, margin: 0 }}>
                  {pageContent?.title || activePage.title}
                </h1>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>
                  /{activePage.path}
                  {pageContent?.updatedAt && ` · Updated ${new Date(pageContent.updatedAt).toLocaleDateString()}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    background: T.card, border: `1px solid ${T.border}`, borderRadius: 7,
                    padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: T.font,
                    color: T.navy, fontWeight: 500,
                  }}
                >
                  ✎ Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    background: 'rgba(231,76,60,0.08)', border: `1px solid rgba(231,76,60,0.2)`,
                    borderRadius: 7, padding: '7px 14px', fontSize: 13,
                    cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: T.font,
                    color: T.red, fontWeight: 500,
                  }}
                >
                  {deleting ? '…' : 'Delete'}
                </button>
              </div>
            </div>

            <div style={{
              background: T.card, borderRadius: 12, padding: 28,
              border: `1px solid ${T.border}`,
            }}>
              {pageContent ? (
                <MarkdownContent content={pageContent.content} />
              ) : (
                <p style={{ color: T.muted }}>Could not load page content.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
