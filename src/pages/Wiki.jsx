import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

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

// ---------- Markdown renderer ----------
function renderMarkdown(content) {
  if (!content) return ''
  return content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^#{4} (.+)$/gm, '<h4 id="$1">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 id="$1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 id="$1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 id="$1">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/```([\w]*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre style="background:#1e1e2e;color:#cdd6f4;padding:16px;border-radius:8px;overflow:auto;font-size:13px;margin:12px 0"><code>${code.trimEnd()}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:0.9em;font-family:monospace">$1</code>')
    .replace(/^\| (.+) \|$/gm, (_, row) => `<tr>${row.split(' | ').map(c => `<td style="border:1px solid #e2e8f0;padding:8px 12px">${c.trim()}</td>`).join('')}</tr>`)
    .replace(/(<tr>.*<\/tr>\n?)+/g, m => {
      const rows = m.trim().split('\n').filter(r => !r.match(/^<tr><td>[-:| ]+<\/td>/))
      return `<table style="border-collapse:collapse;width:100%;margin:12px 0">${rows.join('')}</table>`
    })
    .replace(/^\- \[x\] (.+)$/gm, '<li style="list-style:none"><input type="checkbox" checked disabled style="margin-right:6px">$1</li>')
    .replace(/^\- \[ \] (.+)$/gm, '<li style="list-style:none"><input type="checkbox" disabled style="margin-right:6px">$1</li>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul style="padding-left:20px;margin:8px 0">${m}</ul>`)
    .replace(/^\> (.+)$/gm, '<blockquote style="border-left:3px solid #ff6b35;margin:8px 0;padding:8px 16px;background:#fff8f5;color:#555">$1</blockquote>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#ff6b35;text-decoration:underline">$1</a>')
    .replace(/\n\n/g, '</p><p style="margin:10px 0">')
}

function MarkdownContent({ content }) {
  if (!content) return <p style={{ color: T.muted, fontStyle: 'italic' }}>Empty page</p>
  const html = renderMarkdown(content)
  return (
    <div
      style={{ lineHeight: 1.75, color: '#2d3748', fontFamily: T.font, fontSize: 15 }}
      dangerouslySetInnerHTML={{ __html: `<p style="margin:10px 0">${html}</p>` }}
    />
  )
}

// ---------- Table of contents ----------
function TableOfContents({ content }) {
  const headings = []
  const re = /^(#{1,4}) (.+)$/gm
  let m
  while ((m = re.exec(content)) !== null) {
    headings.push({ level: m[1].length, text: m[2] })
  }
  if (headings.length < 2) return null
  return (
    <div style={{
      background: '#f8f9fa', border: `1px solid ${T.border}`, borderRadius: 8,
      padding: '12px 16px', marginBottom: 20, fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, color: T.navy, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Contents
      </div>
      {headings.map((h, i) => (
        <a
          key={i}
          href={`#${h.text}`}
          style={{
            display: 'block', color: T.navy, textDecoration: 'none', padding: '2px 0',
            paddingLeft: (h.level - 1) * 12,
            fontSize: 12 + (4 - h.level),
            fontWeight: h.level === 1 ? 600 : 400,
            opacity: 0.8,
          }}
          onMouseOver={e => e.target.style.color = T.orange}
          onMouseOut={e => e.target.style.color = T.navy}
        >
          {h.text}
        </a>
      ))}
    </div>
  )
}

// ---------- Markdown toolbar ----------
function MarkdownToolbar({ textareaRef, value, onChange }) {
  const wrap = (before, after = before) => {
    const el = textareaRef.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    const selected = value.slice(s, e)
    const next = value.slice(0, s) + before + selected + after + value.slice(e)
    onChange(next)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(s + before.length, e + before.length)
    }, 0)
  }
  const insertLine = (prefix) => {
    const el = textareaRef.current
    if (!el) return
    const { selectionStart: s } = el
    const lineStart = value.lastIndexOf('\n', s - 1) + 1
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart)
    onChange(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(s + prefix.length, s + prefix.length) }, 0)
  }
  const insertTemplate = (tpl, cursorOffset) => {
    const el = textareaRef.current
    if (!el) return
    const { selectionStart: s } = el
    const next = value.slice(0, s) + tpl + value.slice(s)
    onChange(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(s + cursorOffset, s + cursorOffset) }, 0)
  }

  const btn = (label, title, action, style = {}) => (
    <button
      type="button"
      title={title}
      onClick={action}
      style={{
        background: 'none', border: `1px solid ${T.border}`, borderRadius: 4,
        padding: '3px 8px', fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
        color: T.navy, lineHeight: 1.4, ...style,
      }}
    >{label}</button>
  )

  return (
    <div style={{
      display: 'flex', gap: 4, flexWrap: 'wrap', padding: '6px 10px',
      background: '#fafafa', border: `1px solid ${T.border}`,
      borderBottom: 'none', borderRadius: '8px 8px 0 0',
    }}>
      {btn('H1', 'Heading 1', () => insertLine('# '), { fontWeight: 700 })}
      {btn('H2', 'Heading 2', () => insertLine('## '), { fontWeight: 700 })}
      {btn('H3', 'Heading 3', () => insertLine('### '), { fontWeight: 700 })}
      <span style={{ width: 1, background: T.border, margin: '0 2px' }} />
      {btn('B', 'Bold', () => wrap('**'), { fontWeight: 700 })}
      {btn('I', 'Italic', () => wrap('*'), { fontStyle: 'italic' })}
      {btn('S̶', 'Strikethrough', () => wrap('~~'))}
      <span style={{ width: 1, background: T.border, margin: '0 2px' }} />
      {btn('`', 'Inline code', () => wrap('`'))}
      {btn('```', 'Code block', () => insertTemplate('\n```\n\n```\n', 5))}
      {btn('> ', 'Blockquote', () => insertLine('> '))}
      <span style={{ width: 1, background: T.border, margin: '0 2px' }} />
      {btn('• list', 'Bullet list', () => insertLine('- '))}
      {btn('1. list', 'Numbered list', () => insertLine('1. '))}
      {btn('☑', 'Task list', () => insertLine('- [ ] '))}
      <span style={{ width: 1, background: T.border, margin: '0 2px' }} />
      {btn('🔗', 'Link', () => insertTemplate('[link text](url)', 1))}
      {btn('—', 'Horizontal rule', () => insertTemplate('\n---\n', 5))}
      {btn('⊞', 'Table', () => insertTemplate('\n| Column 1 | Column 2 |\n|---|---|\n| Cell | Cell |\n', 3))}
    </div>
  )
}

// ---------- Editor ----------
function PageEditor({ page, onSave, onCancel }) {
  const [title, setTitle] = useState(page?.title || '')
  const [content, setContent] = useState(page?.content || '')
  const [path, setPath] = useState(page?.path || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(false)
  const textareaRef = useRef(null)

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

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
      {/* Toolbar bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        borderBottom: `1px solid ${T.border}`, background: T.card, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <button onClick={onCancel} style={{
          background: 'none', border: `1px solid ${T.border}`, borderRadius: 6,
          padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: T.font,
        }}>← Back</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.navy }}>
          {page ? `Edit: ${page.title}` : 'New Page'}
        </span>
        {error && <span style={{ color: T.red, fontSize: 13 }}>{error}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: T.muted }}>{wordCount} words</span>
          <button
            onClick={() => setPreview(p => !p)}
            style={{
              background: preview ? T.navy : T.card,
              color: preview ? '#fff' : T.navy,
              border: `1px solid ${T.border}`, borderRadius: 6,
              padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: T.font,
            }}
          >
            {preview ? 'Edit' : 'Split preview'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: T.orange, color: '#fff', border: 'none',
              padding: '7px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: T.font,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Meta fields */}
      <div style={{ padding: '12px 16px 0', background: T.card, flexShrink: 0, display: 'flex', gap: 10 }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Page title"
          style={{
            flex: 2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 14px',
            fontSize: 15, fontWeight: 600, fontFamily: T.font, outline: 'none', color: T.navy,
          }}
        />
        {!page && (
          <input
            value={path}
            onChange={e => setPath(e.target.value)}
            placeholder="URL path (e.g. hr/onboarding)"
            style={{
              flex: 1, border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 14px',
              fontSize: 13, fontFamily: T.font, outline: 'none', color: T.navy,
            }}
          />
        )}
      </div>

      {/* Editor area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 12, gap: 12, background: T.card }}>
        {/* Left: textarea with toolbar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <MarkdownToolbar textareaRef={textareaRef} value={content} onChange={setContent} />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write in Markdown…"
            style={{
              flex: 1, border: `1px solid ${T.border}`, borderRadius: '0 0 8px 8px', padding: '12px 14px',
              fontSize: 13, fontFamily: 'monospace', outline: 'none', color: T.navy,
              resize: 'none', lineHeight: 1.6,
            }}
          />
        </div>

        {/* Right: live preview */}
        {preview && (
          <div style={{
            flex: 1, border: `1px solid ${T.border}`, borderRadius: 8, padding: '16px 20px',
            overflowY: 'auto', background: '#fefefe', minWidth: 0,
          }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preview</div>
            <MarkdownContent content={content} />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Grouped sidebar ----------
function groupPages(pages) {
  const groups = {}
  for (const p of pages) {
    const parts = (p.path || '').split('/')
    const group = parts.length > 1 ? parts[0] : ''
    if (!groups[group]) groups[group] = []
    groups[group].push(p)
  }
  return groups
}

function SidebarGroup({ group, pages, activePage, onOpen, collapsed, onToggle }) {
  const label = group || 'General'
  return (
    <div>
      {group !== '' && (
        <button
          onClick={onToggle}
          style={{
            width: '100%', textAlign: 'left', border: 'none', background: 'none',
            padding: '5px 16px', cursor: 'pointer', fontFamily: T.font,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 10, color: T.muted }}>{collapsed ? '▶' : '▼'}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        </button>
      )}
      {!collapsed && pages.map(p => (
        <button
          key={p.id}
          onClick={() => onOpen(p)}
          style={{
            width: '100%', textAlign: 'left', border: 'none',
            background: activePage?.id === p.id ? 'rgba(255,107,53,0.08)' : 'transparent',
            borderLeft: activePage?.id === p.id ? `3px solid ${T.orange}` : '3px solid transparent',
            padding: `7px 16px 7px ${group !== '' ? 24 : 16}px`,
            cursor: 'pointer', fontFamily: T.font,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: activePage?.id === p.id ? T.orange : T.navy, lineHeight: 1.3 }}>
            {p.title}
          </div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>/{p.path}</div>
        </button>
      ))}
    </div>
  )
}

// ---------- Main ----------
export default function Wiki() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

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
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [copyDone, setCopyDone] = useState(false)

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 2000)
  }

  const handlePrint = () => window.print()

  const toggleGroup = (g) => setCollapsedGroups(prev => ({ ...prev, [g]: !prev[g] }))

  const displayList = searchResults !== null ? searchResults : null
  const grouped = groupPages(pages)

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
      <style>{`
        @media print {
          aside, .wiki-actions { display: none !important; }
          main { overflow: visible !important; }
        }
      `}</style>

      {/* Sidebar */}
      <aside style={{
        width: 260, flexShrink: 0, borderRight: `1px solid ${T.border}`,
        background: T.card, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 10 }}>📖 Wiki</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSearch()
                if (e.key === 'Escape') { setSearchQ(''); setSearchResults(null) }
              }}
              placeholder="Search pages…"
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
              ✕ Clear search ({searchResults.length} result{searchResults.length !== 1 ? 's' : ''})
            </button>
          )}
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? <Spinner /> : displayList !== null ? (
            displayList.length === 0 ? (
              <div style={{ padding: '20px 16px', color: T.muted, fontSize: 13, textAlign: 'center' }}>No results</div>
            ) : displayList.map(p => (
              <button
                key={p.id}
                onClick={() => { openPage(p); setSearchResults(null); setSearchQ('') }}
                style={{
                  width: '100%', textAlign: 'left', border: 'none',
                  background: activePage?.id === p.id ? 'rgba(255,107,53,0.08)' : 'transparent',
                  borderLeft: activePage?.id === p.id ? `3px solid ${T.orange}` : '3px solid transparent',
                  padding: '7px 16px', cursor: 'pointer', fontFamily: T.font,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: activePage?.id === p.id ? T.orange : T.navy }}>{p.title}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>/{p.path}</div>
              </button>
            ))
          ) : pages.length === 0 ? (
            <div style={{ padding: '20px 16px', color: T.muted, fontSize: 13, textAlign: 'center' }}>No pages yet</div>
          ) : Object.entries(grouped).map(([group, gpages]) => (
            <SidebarGroup
              key={group}
              group={group}
              pages={gpages}
              activePage={activePage}
              onOpen={openPage}
              collapsed={!!collapsedGroups[group]}
              onToggle={() => toggleGroup(group)}
            />
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
            <div style={{ fontSize: 13, color: T.mutedLight, marginTop: 8 }}>{pages.length} page{pages.length !== 1 ? 's' : ''} available</div>
          </div>
        ) : pageLoading ? <Spinner /> : (
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 32px' }}>

            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20, gap: 12 }}>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: T.navy, margin: 0 }}>
                  {pageContent?.title || activePage.title}
                </h1>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>/{activePage.path}</span>
                  {pageContent?.updatedAt && (
                    <span>Updated {new Date(pageContent.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  )}
                  {pageContent?.content && (
                    <span>{pageContent.content.trim().split(/\s+/).filter(Boolean).length} words</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="wiki-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleCopyLink}
                  title="Copy link to clipboard"
                  style={{
                    background: copyDone ? 'rgba(29,158,117,0.1)' : T.card,
                    border: `1px solid ${copyDone ? T.green : T.border}`,
                    borderRadius: 7, padding: '7px 12px', fontSize: 13,
                    cursor: 'pointer', fontFamily: T.font,
                    color: copyDone ? T.green : T.navy, fontWeight: 500,
                  }}
                >
                  {copyDone ? '✓ Copied' : '🔗 Copy link'}
                </button>
                <button
                  onClick={handlePrint}
                  title="Print / Save as PDF"
                  style={{
                    background: T.card, border: `1px solid ${T.border}`, borderRadius: 7,
                    padding: '7px 12px', fontSize: 13, cursor: 'pointer', fontFamily: T.font,
                    color: T.navy, fontWeight: 500,
                  }}
                >
                  🖨 Print
                </button>
                {isAdmin && (
                  <>
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
                  </>
                )}
              </div>
            </div>

            {/* TOC */}
            {pageContent?.content && <TableOfContents content={pageContent.content} />}

            {/* Content card */}
            <div style={{
              background: T.card, borderRadius: 12, padding: '24px 28px',
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
