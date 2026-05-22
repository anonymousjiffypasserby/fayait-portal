import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.07)', muted: '#888', mutedLight: '#bbb',
  orange: '#ff6b35', green: '#1D9E75', red: '#e74c3c',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: 26, height: 26, border: `3px solid ${T.border}`,
        borderTopColor: T.orange, borderRadius: '50%', animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

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
    .replace(/```([\w]*)\n([\s\S]*?)```/g, (_, _lang, code) =>
      `<pre style="background:#1e1e2e;color:#cdd6f4;padding:16px;border-radius:8px;overflow:auto;font-size:13px;margin:12px 0"><code>${code.trimEnd()}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:0.9em;font-family:monospace">$1</code>')
    .replace(/^\| (.+) \|$/gm, (_, row) =>
      `<tr>${row.split(' | ').map(c => `<td style="border:1px solid #e2e8f0;padding:8px 12px">${c.trim()}</td>`).join('')}</tr>`)
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
  return (
    <div
      style={{ lineHeight: 1.75, color: '#2d3748', fontFamily: T.font, fontSize: 15 }}
      dangerouslySetInnerHTML={{ __html: `<p style="margin:10px 0">${renderMarkdown(content)}</p>` }}
    />
  )
}

function TableOfContents({ content }) {
  const headings = []
  const re = /^(#{1,4}) (.+)$/gm
  let m
  while ((m = re.exec(content)) !== null) headings.push({ level: m[1].length, text: m[2] })
  if (headings.length < 2) return null
  return (
    <div style={{
      background: '#f8f9fa', border: `1px solid ${T.border}`, borderRadius: 8,
      padding: '12px 16px', marginBottom: 20, fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, color: T.navy, marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contents</div>
      {headings.map((h, i) => (
        <a key={i} href={`#${h.text}`} style={{
          display: 'block', color: T.navy, textDecoration: 'none', padding: '2px 0',
          paddingLeft: (h.level - 1) * 12, fontSize: 13 - (h.level - 1),
          fontWeight: h.level === 1 ? 600 : 400, opacity: 0.8,
        }}
          onMouseOver={e => e.target.style.color = T.orange}
          onMouseOut={e => e.target.style.color = T.navy}
        >{h.text}</a>
      ))}
    </div>
  )
}

// ── Markdown toolbar ───────────────────────────────────────────────────────────

function MarkdownToolbar({ textareaRef, value, onChange }) {
  const wrap = (before, after = before) => {
    const el = textareaRef.current; if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    onChange(value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e))
    setTimeout(() => { el.focus(); el.setSelectionRange(s + before.length, e + before.length) }, 0)
  }
  const insertLine = (prefix) => {
    const el = textareaRef.current; if (!el) return
    const ls = value.lastIndexOf('\n', el.selectionStart - 1) + 1
    const next = value.slice(0, ls) + prefix + value.slice(ls)
    onChange(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(el.selectionStart + prefix.length, el.selectionStart + prefix.length) }, 0)
  }
  const ins = (tpl, offset) => {
    const el = textareaRef.current; if (!el) return
    const s = el.selectionStart
    onChange(value.slice(0, s) + tpl + value.slice(s))
    setTimeout(() => { el.focus(); el.setSelectionRange(s + offset, s + offset) }, 0)
  }
  const btn = (label, title, action, extra = {}) => (
    <button type="button" title={title} onClick={action} style={{
      background: 'none', border: `1px solid ${T.border}`, borderRadius: 4,
      padding: '3px 7px', fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
      color: T.navy, lineHeight: 1.4, ...extra,
    }}>{label}</button>
  )
  return (
    <div style={{
      display: 'flex', gap: 3, flexWrap: 'wrap', padding: '5px 8px',
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
      {btn('```', 'Code block', () => ins('\n```\n\n```\n', 5))}
      {btn('❝', 'Blockquote', () => insertLine('> '))}
      <span style={{ width: 1, background: T.border, margin: '0 2px' }} />
      {btn('• list', 'Bullet list', () => insertLine('- '))}
      {btn('1. list', 'Numbered list', () => insertLine('1. '))}
      {btn('☑', 'Task list', () => insertLine('- [ ] '))}
      <span style={{ width: 1, background: T.border, margin: '0 2px' }} />
      {btn('🔗', 'Link', () => ins('[link text](url)', 1))}
      {btn('—', 'Divider', () => ins('\n---\n', 5))}
      {btn('⊞', 'Table', () => ins('\n| Column 1 | Column 2 |\n|---|---|\n| Cell | Cell |\n', 3))}
    </div>
  )
}

// ── Editor ─────────────────────────────────────────────────────────────────────

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
    setSaving(true); setError(null)
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
          <button onClick={() => setPreview(p => !p)} style={{
            background: preview ? T.navy : T.card, color: preview ? '#fff' : T.navy,
            border: `1px solid ${T.border}`, borderRadius: 6,
            padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: T.font,
          }}>{preview ? 'Edit only' : 'Split preview'}</button>
          <button onClick={handleSave} disabled={saving} style={{
            background: T.orange, color: '#fff', border: 'none',
            padding: '7px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: T.font, opacity: saving ? 0.7 : 1,
          }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      <div style={{ padding: '10px 16px 0', background: T.card, flexShrink: 0, display: 'flex', gap: 10 }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Page title"
          style={{
            flex: 2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 14px',
            fontSize: 15, fontWeight: 600, fontFamily: T.font, outline: 'none', color: T.navy,
          }} />
        {!page && (
          <input value={path} onChange={e => setPath(e.target.value)} placeholder="URL path (e.g. hr/onboarding)"
            style={{
              flex: 1, border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 14px',
              fontSize: 13, fontFamily: T.font, outline: 'none', color: T.navy,
            }} />
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 12, gap: 12, background: T.card }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <MarkdownToolbar textareaRef={textareaRef} value={content} onChange={setContent} />
          <textarea ref={textareaRef} value={content} onChange={e => setContent(e.target.value)}
            placeholder="Write in Markdown…"
            style={{
              flex: 1, border: `1px solid ${T.border}`, borderRadius: '0 0 8px 8px', padding: '12px 14px',
              fontSize: 13, fontFamily: 'monospace', outline: 'none', color: T.navy,
              resize: 'none', lineHeight: 1.6,
            }} />
        </div>
        {preview && (
          <div style={{
            flex: 1, border: `1px solid ${T.border}`, borderRadius: 8, padding: '16px 20px',
            overflowY: 'auto', background: '#fefefe', minWidth: 0,
          }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preview</div>
            <MarkdownContent content={content} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Assign panel ───────────────────────────────────────────────────────────────

function AssignPanel({ pageId, meta, assignables, onClose, onSaved }) {
  const [userIds, setUserIds] = useState(meta?.assignedUserIds || [])
  const [deptIds, setDeptIds] = useState(meta?.assignedDeptIds || [])
  const [folder, setFolder] = useState(meta?.folder || '')
  const [saving, setSaving] = useState(false)

  const toggle = (list, setList, id) =>
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])

  const save = async () => {
    setSaving(true)
    try {
      await api.patch(`/wiki/pages/${pageId}/meta`, { folder: folder || null, assignedUserIds: userIds, assignedDeptIds: deptIds })
      onSaved({ folder: folder || null, assignedUserIds: userIds, assignedDeptIds: deptIds })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: T.card, borderRadius: 12, padding: 24, width: 420, maxHeight: '80vh',
        overflow: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 16 }}>Assign page</div>

        {assignables?.departments?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Departments</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {assignables.departments.map(d => {
                const on = deptIds.includes(d.id)
                return (
                  <button key={d.id} onClick={() => toggle(deptIds, setDeptIds, d.id)} style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: T.font,
                    background: on ? T.orange : '#f0f2f5', color: on ? '#fff' : T.navy,
                    border: on ? `1px solid ${T.orange}` : `1px solid ${T.border}`, fontWeight: on ? 600 : 400,
                  }}>{d.name}</button>
                )
              })}
            </div>
          </div>
        )}

        {assignables?.users?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Users</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {assignables.users.map(u => {
                const on = userIds.includes(u.id)
                return (
                  <button key={u.id} onClick={() => toggle(userIds, setUserIds, u.id)} style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: T.font,
                    background: on ? T.navy : '#f0f2f5', color: on ? '#fff' : T.navy,
                    border: on ? `1px solid ${T.navy}` : `1px solid ${T.border}`, fontWeight: on ? 600 : 400,
                  }}>{u.name}</button>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button onClick={onClose} style={{
            background: 'none', border: `1px solid ${T.border}`, borderRadius: 7,
            padding: '7px 16px', fontSize: 13, cursor: 'pointer', fontFamily: T.font,
          }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{
            background: T.orange, color: '#fff', border: 'none', borderRadius: 7,
            padding: '7px 18px', fontSize: 13, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: T.font, opacity: saving ? 0.7 : 1,
          }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Move-to-folder popover ─────────────────────────────────────────────────────

function MovePopover({ page, folders, meta, onMove, onClose }) {
  const current = meta?.folder || null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
    }} onClick={onClose}>
      <div style={{
        position: 'absolute', background: T.card, borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.16)',
        border: `1px solid ${T.border}`, minWidth: 180, padding: 6, zIndex: 9001,
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 11, color: T.muted, padding: '4px 10px 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Move "{page.title}" to
        </div>
        <button onClick={() => onMove(null)} style={{
          display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
          padding: '7px 12px', borderRadius: 6, fontFamily: T.font, fontSize: 13,
          background: !current ? 'rgba(255,107,53,0.1)' : 'none',
          color: !current ? T.orange : T.navy, fontWeight: !current ? 600 : 400,
        }}>📄 No folder (root)</button>
        {folders.map(f => (
          <button key={f} onClick={() => onMove(f)} style={{
            display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
            padding: '7px 12px', borderRadius: 6, fontFamily: T.font, fontSize: 13,
            background: current === f ? 'rgba(255,107,53,0.1)' : 'none',
            color: current === f ? T.orange : T.navy, fontWeight: current === f ? 600 : 400,
          }}>📁 {f}</button>
        ))}
      </div>
    </div>
  )
}

// ── Sidebar page row ───────────────────────────────────────────────────────────

function PageRow({ page, isActive, onClick, isAdmin, onRename, onMove, onDelete, indent = false }) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState(page.title)
  const inputRef = useRef(null)

  const startRename = (e) => {
    e.stopPropagation()
    setMenuOpen(false)
    setRenameVal(page.title)
    setRenaming(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }
  const commitRename = () => {
    setRenaming(false)
    if (renameVal.trim() && renameVal !== page.title) onRename(page, renameVal.trim())
  }

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false) }}
    >
      <div
        onClick={renaming ? undefined : onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: isActive ? 'rgba(255,107,53,0.08)' : 'transparent',
          borderLeft: isActive ? `3px solid ${T.orange}` : '3px solid transparent',
          padding: `6px ${indent ? 20 : 12}px 6px ${indent ? 28 : 14}px`,
          cursor: renaming ? 'default' : 'pointer',
        }}
      >
        <span style={{ fontSize: 13, opacity: 0.5, flexShrink: 0 }}>📄</span>
        {renaming ? (
          <input
            ref={inputRef}
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false) }}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, border: `1px solid ${T.orange}`, borderRadius: 4, padding: '2px 6px',
              fontSize: 13, fontFamily: T.font, outline: 'none', color: T.navy,
            }}
          />
        ) : (
          <span style={{
            flex: 1, fontSize: 13, fontWeight: 500, minWidth: 0,
            color: isActive ? T.orange : T.navy, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{page.title}</span>
        )}
        {isAdmin && hovered && !renaming && (
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(m => !m) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
              color: T.muted, padding: '0 2px', lineHeight: 1, flexShrink: 0,
            }}
          >⋯</button>
        )}
      </div>

      {/* Context menu */}
      {menuOpen && (
        <div style={{
          position: 'absolute', right: 6, top: '100%', zIndex: 9000,
          background: T.card, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
          border: `1px solid ${T.border}`, minWidth: 140, padding: 4,
        }}>
          <button onClick={startRename} style={menuItemStyle}>✎ Rename</button>
          <button onClick={e => { e.stopPropagation(); setMenuOpen(false); onMove(page) }} style={menuItemStyle}>📁 Move to folder</button>
          <button onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete(page) }} style={{ ...menuItemStyle, color: T.red }}>🗑 Delete</button>
        </div>
      )}
    </div>
  )
}

const menuItemStyle = {
  display: 'block', width: '100%', textAlign: 'left', border: 'none',
  background: 'none', padding: '7px 12px', fontSize: 13, cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif", color: '#1a1f2e', borderRadius: 5,
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function Wiki() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const [pages, setPages] = useState([])
  const [meta, setMeta] = useState({})          // pageId → { folder, assignedUserIds, assignedDeptIds }
  const [folders, setFolders] = useState([])
  const [assignables, setAssignables] = useState(null)
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
  const [copyDone, setCopyDone] = useState(false)

  const [expandedFolders, setExpandedFolders] = useState({})
  const [newFolderName, setNewFolderName] = useState('')
  const [addingFolder, setAddingFolder] = useState(false)
  const [savingFolder, setSavingFolder] = useState(false)
  const newFolderRef = useRef(null)

  const [movingPage, setMovingPage] = useState(null)
  const [assignPanelPage, setAssignPanelPage] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pagesRes, metaRes, foldersRes] = await Promise.all([
        api.get('/wiki/pages'),
        api.get('/wiki/meta'),
        api.get('/wiki/folders'),
      ])
      setPages(pagesRes.data)
      setMeta(metaRes.data)
      setFolders(foldersRes.data)
    } catch {
      setPages([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (isAdmin && !assignables) {
      api.get('/wiki/assignables').then(r => setAssignables(r.data)).catch(() => {})
    }
  }, [isAdmin, assignables])

  const openPage = async (page) => {
    setActivePage(page)
    setEditMode(false)
    setPageLoading(true)
    setPageContent(null)
    try {
      const { data } = await api.get(`/wiki/pages/${page.id}`)
      setPageContent(data)
    } catch { setPageContent(null) }
    finally { setPageLoading(false) }
  }

  const handleSearch = async () => {
    if (!searchQ.trim()) { setSearchResults(null); return }
    setSearching(true)
    try {
      const { data } = await api.get(`/wiki/search?q=${encodeURIComponent(searchQ)}`)
      setSearchResults(data)
    } catch { setSearchResults([]) }
    finally { setSearching(false) }
  }

  const handleDelete = async (page = activePage) => {
    if (!page || !window.confirm(`Delete "${page.title}"?`)) return
    setDeleting(true)
    try {
      await api.delete(`/wiki/pages/${page.id}`)
      if (activePage?.id === page.id) { setActivePage(null); setPageContent(null) }
      loadAll()
    } catch (err) { alert(err.response?.data?.error || 'Delete failed') }
    finally { setDeleting(false) }
  }

  const handleRename = async (page, newTitle) => {
    try {
      await api.patch(`/wiki/pages/${page.id}/rename`, { title: newTitle })
      setPages(prev => prev.map(p => p.id === page.id ? { ...p, title: newTitle } : p))
      if (activePage?.id === page.id) setActivePage(prev => ({ ...prev, title: newTitle }))
    } catch (err) { alert(err.response?.data?.error || 'Rename failed') }
  }

  const handleMove = async (page, folder) => {
    setMovingPage(null)
    const pageMeta = meta[page.id] || {}
    try {
      await api.patch(`/wiki/pages/${page.id}/meta`, {
        folder,
        assignedUserIds: pageMeta.assignedUserIds || [],
        assignedDeptIds: pageMeta.assignedDeptIds || [],
      })
      setMeta(prev => ({ ...prev, [page.id]: { ...(prev[page.id] || {}), folder } }))
    } catch (err) { alert(err.response?.data?.error || 'Move failed') }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setSavingFolder(true)
    try {
      await api.post('/wiki/folders', { name: newFolderName.trim() })
      setFolders(prev => [...prev, newFolderName.trim()].sort())
      setExpandedFolders(prev => ({ ...prev, [newFolderName.trim()]: true }))
      setNewFolderName('')
      setAddingFolder(false)
    } catch (err) { alert(err.response?.data?.error || 'Could not create folder') }
    finally { setSavingFolder(false) }
  }

  const handleDeleteFolder = async (name) => {
    if (!window.confirm(`Delete folder "${name}"? Pages inside will move to root.`)) return
    try {
      await api.delete(`/wiki/folders/${encodeURIComponent(name)}`)
      setFolders(prev => prev.filter(f => f !== name))
      setMeta(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(id => { if (next[id]?.folder === name) next[id] = { ...next[id], folder: null } })
        return next
      })
    } catch (err) { alert(err.response?.data?.error || 'Delete failed') }
  }

  const toggleFolder = (name) => setExpandedFolders(prev => ({ ...prev, [name]: !prev[name] }))

  // Group pages by folder
  const pagesByFolder = {}
  const rootPages = []
  for (const p of pages) {
    const f = meta[p.id]?.folder || null
    if (f) { if (!pagesByFolder[f]) pagesByFolder[f] = []; pagesByFolder[f].push(p) }
    else rootPages.push(p)
  }

  const pageRowProps = (page, indent) => ({
    key: page.id, page, isActive: activePage?.id === page.id, indent,
    onClick: () => openPage(page),
    isAdmin,
    onRename: handleRename,
    onMove: (p) => setMovingPage(p),
    onDelete: handleDelete,
  })

  const pageMeta = activePage ? (meta[activePage.id] || {}) : {}
  const assignedUsers = (pageMeta.assignedUserIds || []).map(id => assignables?.users?.find(u => u.id === id)).filter(Boolean)
  const assignedDepts = (pageMeta.assignedDeptIds || []).map(id => assignables?.departments?.find(d => d.id === id)).filter(Boolean)

  if (newPage) {
    return (
      <div style={{ height: '100%', background: T.bg }}>
        <PageEditor onSave={() => { setNewPage(false); loadAll() }} onCancel={() => setNewPage(false)} />
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
        @media print { aside, .wiki-actions { display: none !important; } main { overflow: visible !important; } }
        .menu-item:hover { background: #f0f2f5 !important; }
        .folder-row:hover .folder-del { display: inline-block !important; }
      `}</style>

      {/* Sidebar */}
      <aside style={{
        width: 265, flexShrink: 0, borderRight: `1px solid ${T.border}`,
        background: T.card, display: 'flex', flexDirection: 'column',
      }}>
        {/* Search */}
        <div style={{ padding: '14px 12px 10px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
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
            <button onClick={handleSearch} style={{
              background: T.navy, color: '#fff', border: 'none', borderRadius: 6,
              padding: '6px 10px', fontSize: 12, cursor: 'pointer',
            }}>{searching ? '…' : '⌕'}</button>
          </div>
          {searchResults !== null && (
            <button onClick={() => { setSearchQ(''); setSearchResults(null) }} style={{
              marginTop: 6, background: 'none', border: 'none', color: T.muted,
              fontSize: 11, cursor: 'pointer', padding: 0,
            }}>✕ Clear ({searchResults.length} result{searchResults.length !== 1 ? 's' : ''})</button>
          )}
        </div>

        {/* Page tree */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? <Spinner /> : searchResults !== null ? (
            searchResults.length === 0 ? (
              <div style={{ padding: '16px 14px', color: T.muted, fontSize: 13, textAlign: 'center' }}>No results</div>
            ) : searchResults.map(p => (
              <PageRow {...pageRowProps(p, false)} key={p.id}
                onClick={() => { openPage(p); setSearchResults(null); setSearchQ('') }} />
            ))
          ) : (
            <>
              {/* Folders */}
              {folders.map(f => {
                const fps = pagesByFolder[f] || []
                const expanded = expandedFolders[f] !== false  // default open
                return (
                  <div key={f}>
                    <div className="folder-row" style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 12px', cursor: 'pointer', userSelect: 'none',
                    }} onClick={() => toggleFolder(f)}>
                      <span style={{ fontSize: 11, color: T.muted, width: 10 }}>{expanded ? '▼' : '▶'}</span>
                      <span style={{ fontSize: 13 }}>📁</span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f}</span>
                      <span style={{ fontSize: 11, color: T.mutedLight }}>{fps.length}</span>
                      {isAdmin && (
                        <button className="folder-del" onClick={e => { e.stopPropagation(); handleDeleteFolder(f) }}
                          style={{
                            display: 'none', background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 12, color: T.red, padding: '0 2px', lineHeight: 1,
                          }} title="Delete folder">✕</button>
                      )}
                    </div>
                    {expanded && fps.map(p => <PageRow {...pageRowProps(p, true)} key={p.id} />)}
                    {expanded && fps.length === 0 && (
                      <div style={{ padding: '4px 28px 8px', fontSize: 12, color: T.mutedLight, fontStyle: 'italic' }}>Empty folder</div>
                    )}
                  </div>
                )
              })}

              {/* Root pages */}
              {rootPages.length > 0 && (
                <>
                  {folders.length > 0 && (
                    <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Other pages
                    </div>
                  )}
                  {rootPages.map(p => <PageRow {...pageRowProps(p, false)} key={p.id} />)}
                </>
              )}

              {pages.length === 0 && (
                <div style={{ padding: '20px 14px', color: T.muted, fontSize: 13, textAlign: 'center' }}>No pages yet</div>
              )}
            </>
          )}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isAdmin && (
            addingFolder ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  ref={newFolderRef}
                  autoFocus
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setAddingFolder(false) }}
                  placeholder="Folder name"
                  style={{
                    flex: 1, border: `1px solid ${T.orange}`, borderRadius: 6, padding: '6px 10px',
                    fontSize: 12, fontFamily: T.font, outline: 'none',
                  }}
                />
                <button onClick={handleCreateFolder} disabled={savingFolder} style={{
                  background: T.orange, color: '#fff', border: 'none', borderRadius: 6,
                  padding: '6px 10px', fontSize: 12, cursor: 'pointer',
                }}>✓</button>
                <button onClick={() => setAddingFolder(false)} style={{
                  background: 'none', border: `1px solid ${T.border}`, borderRadius: 6,
                  padding: '6px 8px', fontSize: 12, cursor: 'pointer', color: T.muted,
                }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setAddingFolder(true)} style={{
                width: '100%', background: 'none', color: T.muted,
                border: `1px dashed ${T.border}`, borderRadius: 7, padding: '7px',
                fontSize: 12, cursor: 'pointer', fontFamily: T.font,
              }}>📁 New folder</button>
            )
          )}
          <button onClick={() => setNewPage(true)} style={{
            width: '100%', background: T.orange, color: '#fff', border: 'none',
            borderRadius: 7, padding: '8px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: T.font,
          }}>+ New Page</button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
        {!activePage ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.muted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📖</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.navy }}>Company Wiki</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>Select a page from the sidebar</div>
            <div style={{ fontSize: 13, color: T.mutedLight, marginTop: 8 }}>{pages.length} page{pages.length !== 1 ? 's' : ''} · {folders.length} folder{folders.length !== 1 ? 's' : ''}</div>
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
                  {pageMeta.folder && <span>📁 {pageMeta.folder}</span>}
                  <span>/{activePage.path}</span>
                  {pageContent?.updatedAt && (
                    <span>Updated {new Date(pageContent.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  )}
                  {pageContent?.content && (
                    <span>{pageContent.content.trim().split(/\s+/).filter(Boolean).length} words</span>
                  )}
                </div>

                {/* Assigned chips */}
                {(assignedDepts.length > 0 || assignedUsers.length > 0) && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {assignedDepts.map(d => (
                      <span key={d.id} style={{
                        background: 'rgba(255,107,53,0.1)', color: T.orange, border: `1px solid rgba(255,107,53,0.25)`,
                        borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 500,
                      }}>🏢 {d.name}</span>
                    ))}
                    {assignedUsers.map(u => (
                      <span key={u.id} style={{
                        background: 'rgba(26,31,46,0.07)', color: T.navy, border: `1px solid rgba(26,31,46,0.12)`,
                        borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 500,
                      }}>👤 {u.name}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="wiki-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopyDone(true); setTimeout(() => setCopyDone(false), 2000) }}
                  style={{
                    background: copyDone ? 'rgba(29,158,117,0.1)' : T.card,
                    border: `1px solid ${copyDone ? T.green : T.border}`, borderRadius: 7,
                    padding: '7px 12px', fontSize: 13, cursor: 'pointer', fontFamily: T.font,
                    color: copyDone ? T.green : T.navy, fontWeight: 500,
                  }}>{copyDone ? '✓ Copied' : '🔗 Copy link'}</button>
                <button onClick={() => window.print()} style={{
                  background: T.card, border: `1px solid ${T.border}`, borderRadius: 7,
                  padding: '7px 12px', fontSize: 13, cursor: 'pointer', fontFamily: T.font,
                  color: T.navy, fontWeight: 500,
                }}>🖨 Print</button>
                {isAdmin && (
                  <>
                    <button onClick={() => setAssignPanelPage(activePage)} style={{
                      background: T.card, border: `1px solid ${T.border}`, borderRadius: 7,
                      padding: '7px 12px', fontSize: 13, cursor: 'pointer', fontFamily: T.font,
                      color: T.navy, fontWeight: 500,
                    }}>👥 Assign</button>
                    <button onClick={() => setEditMode(true)} style={{
                      background: T.card, border: `1px solid ${T.border}`, borderRadius: 7,
                      padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: T.font,
                      color: T.navy, fontWeight: 500,
                    }}>✎ Edit</button>
                    <button onClick={() => handleDelete()} disabled={deleting} style={{
                      background: 'rgba(231,76,60,0.08)', border: `1px solid rgba(231,76,60,0.2)`,
                      borderRadius: 7, padding: '7px 14px', fontSize: 13,
                      cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: T.font,
                      color: T.red, fontWeight: 500,
                    }}>{deleting ? '…' : 'Delete'}</button>
                  </>
                )}
              </div>
            </div>

            {/* TOC */}
            {pageContent?.content && <TableOfContents content={pageContent.content} />}

            {/* Content */}
            <div style={{ background: T.card, borderRadius: 12, padding: '24px 28px', border: `1px solid ${T.border}` }}>
              {pageContent ? <MarkdownContent content={pageContent.content} /> : (
                <p style={{ color: T.muted }}>Could not load page content.</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Move popover */}
      {movingPage && (
        <MovePopover
          page={movingPage}
          folders={folders}
          meta={meta[movingPage.id]}
          onMove={(folder) => handleMove(movingPage, folder)}
          onClose={() => setMovingPage(null)}
        />
      )}

      {/* Assign panel */}
      {assignPanelPage && (
        <AssignPanel
          pageId={assignPanelPage.id}
          meta={meta[assignPanelPage.id]}
          assignables={assignables}
          onClose={() => setAssignPanelPage(null)}
          onSaved={(updated) => setMeta(prev => ({ ...prev, [assignPanelPage.id]: { ...(prev[assignPanelPage.id] || {}), ...updated } }))}
        />
      )}
    </div>
  )
}
