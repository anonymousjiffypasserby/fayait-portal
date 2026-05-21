import { useState, useRef } from 'react'
import { T, Avatar, isAdmin, fmtDate } from './shared'
import MentionTextarea from './MentionTextarea'
import api from '../../services/api'

function renderBody(body) {
  const parts = body.split(/(@[\w.]+)/g)
  return parts.map((part, i) =>
    /^@[\w.]+$/.test(part)
      ? <span key={i} style={{ color: '#6366f1', fontWeight: 600, background: 'rgba(99,102,241,0.08)', borderRadius: 3, padding: '0 3px' }}>{part}</span>
      : part
  )
}

const textareaStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: `1px solid ${T.border}`, fontSize: 13, resize: 'vertical',
  fontFamily: T.font, boxSizing: 'border-box', marginBottom: 8, outline: 'none',
}

export default function CommentsTab({ project, comments: initialComments, user, users = [], onRefresh }) {
  const [comments, setComments]   = useState(initialComments)
  const [body, setBody]           = useState('')
  const [internal, setInternal]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [editId, setEditId]       = useState(null)
  const [editBody, setEditBody]   = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [hovered, setHovered]     = useState(null)

  // Keep comments in sync when parent refreshes
  if (JSON.stringify(comments.map(c => c.id)) !== JSON.stringify(initialComments.map(c => c.id))) {
    setComments(initialComments)
  }

  const admin = isAdmin(user)

  const canEdit   = (c) => c.user_id === user?.id || c.user_name === user?.name
  const canDelete = (c) => c.user_id === user?.id || c.user_name === user?.name || admin

  const handleSubmit = async () => {
    if (!body.trim()) return
    setSaving(true); setError('')
    try {
      await api.createComment(project.id, { body: body.trim(), is_internal: internal })
      setBody(''); setInternal(false)
      onRefresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (c) => {
    if (!editBody.trim()) return
    setEditSaving(true)
    try {
      const updated = await api.updateComment(project.id, c.id, { body: editBody.trim() })
      setComments(prev => prev.map(x => x.id === c.id ? { ...x, body: editBody.trim(), ...(updated || {}) } : x))
      setEditId(null)
    } catch {}
    setEditSaving(false)
  }

  const handleDelete = async (c) => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await api.deleteComment(project.id, c.id)
      setComments(prev => prev.filter(x => x.id !== c.id))
    } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Comments list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {comments.length === 0 && (
          <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', paddingTop: 32 }}>
            No comments yet
          </div>
        )}
        {comments.map(c => (
          <div
            key={c.id}
            style={{ display: 'flex', gap: 12 }}
            onMouseEnter={() => setHovered(c.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <Avatar name={c.user_name} size={30} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>{c.user_name}</span>
                <span style={{ fontSize: 11, color: T.muted }}>{fmtDate(c.created_at)}</span>
                {c.is_internal && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
                    background: '#fef3c7', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    Internal
                  </span>
                )}
                {hovered === c.id && editId !== c.id && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    {canEdit(c) && (
                      <button
                        onClick={() => { setEditId(c.id); setEditBody(c.body) }}
                        style={{ background: 'none', border: 'none', fontSize: 11, color: T.muted, cursor: 'pointer', padding: '1px 5px', borderRadius: 4, fontFamily: T.font }}
                        title="Edit"
                      >
                        ✎
                      </button>
                    )}
                    {canDelete(c) && (
                      <button
                        onClick={() => handleDelete(c)}
                        style={{ background: 'none', border: 'none', fontSize: 11, color: T.red, cursor: 'pointer', padding: '1px 5px', borderRadius: 4, fontFamily: T.font }}
                        title="Delete"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>

              {editId === c.id ? (
                <div>
                  <MentionTextarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') setEditId(null) }}
                    users={users}
                    rows={3}
                    style={{ ...textareaStyle, marginBottom: 6 }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleEdit(c)}
                      disabled={editSaving || !editBody.trim()}
                      style={{
                        padding: '5px 14px', background: '#6366f1', color: '#fff', border: 'none',
                        borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: T.font,
                      }}
                    >
                      {editSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      style={{
                        padding: '5px 10px', background: '#f1f5f9', border: 'none',
                        borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: T.font,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  fontSize: 13, color: '#374151', lineHeight: 1.55,
                  background: c.is_internal ? '#fffbeb' : '#f8fafc',
                  borderRadius: 8, padding: '10px 14px',
                  borderLeft: c.is_internal ? '3px solid #f59e0b' : 'none',
                }}>
                  {renderBody(c.body)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Compose */}
      <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}`, background: T.card }}>
        <MentionTextarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit() }}
          placeholder="Write a comment… (use @name to mention, Ctrl+Enter to submit)"
          rows={3}
          users={users}
          style={textareaStyle}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {admin && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: T.muted }}>
                <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} />
                Internal note
              </label>
            )}
            {error && <span style={{ fontSize: 12, color: T.red }}>{error}</span>}
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || !body.trim()}
            style={{
              background: '#6366f1', color: '#fff', border: 'none',
              borderRadius: 7, padding: '7px 18px', fontSize: 12, fontWeight: 500,
              cursor: saving || !body.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !body.trim() ? 0.6 : 1, fontFamily: T.font,
            }}
          >
            {saving ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      </div>
    </div>
  )
}
