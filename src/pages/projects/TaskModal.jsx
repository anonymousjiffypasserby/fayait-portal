import { useState, useEffect, useRef } from 'react'
import { T, STATUSES, PRIORITIES, STATUS_COLORS, PRIORITY_COLORS, fmtDate, Avatar, isAdmin } from './shared'
import MentionTextarea from './MentionTextarea'
import api from '../../services/api'

const fmtSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1048576).toFixed(1)}MB`
}

const fileIcon = (filename) => {
  const ext = (filename || '').split('.').pop().toLowerCase()
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼'
  if (['pdf'].includes(ext)) return '📄'
  if (['doc','docx'].includes(ext)) return '📝'
  if (['xls','xlsx','csv'].includes(ext)) return '📊'
  if (['zip','tar','gz'].includes(ext)) return '📦'
  return '📎'
}

function renderBody(body) {
  const parts = body.split(/(@[\w.]+)/g)
  return parts.map((part, i) =>
    /^@[\w.]+$/.test(part)
      ? <span key={i} style={{ color: '#6366f1', fontWeight: 600, background: 'rgba(99,102,241,0.08)', borderRadius: 3, padding: '0 3px' }}>{part}</span>
      : part
  )
}

const inp = {
  width: '100%', padding: '8px 12px', borderRadius: 7,
  border: `1px solid rgba(0,0,0,0.12)`, fontSize: 13,
  fontFamily: T.font, boxSizing: 'border-box', outline: 'none',
}
const lbl = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }

// ── Details tab ───────────────────────────────────────────────────────────────

function DetailsTab({ form, set, task, projectId, users, saving, error, onClose, onSave }) {
  const [newSubtask, setNewSubtask]   = useState('')
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading]     = useState(false)
  const [attachError, setAttachError] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (task?.id) {
      api.getTaskAttachments(projectId, task.id)
        .then(data => setAttachments(Array.isArray(data) ? data : (data.attachments || [])))
        .catch(() => {})
    }
  }, [task?.id, projectId])

  const toggleSubtask = (idx) => {
    const subs = [...form.subtasks]
    subs[idx] = { ...subs[idx], done: !subs[idx].done }
    set('subtasks', subs)
  }

  const addSubtask = () => {
    if (!newSubtask.trim()) return
    set('subtasks', [...form.subtasks, { text: newSubtask.trim(), done: false }])
    setNewSubtask('')
  }

  const removeSubtask = (idx) => set('subtasks', form.subtasks.filter((_, i) => i !== idx))

  const handleUpload = async (files) => {
    if (!files?.length || !task?.id) return
    setUploading(true); setAttachError('')
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        await api.uploadTaskAttachment(projectId, task.id, fd)
      }
      const data = await api.getTaskAttachments(projectId, task.id)
      setAttachments(Array.isArray(data) ? data : (data.attachments || []))
    } catch (err) {
      setAttachError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Delete this attachment?')) return
    try {
      await api.deleteTaskAttachment(projectId, task.id, attachmentId)
      setAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch (err) {
      setAttachError(err.message)
    }
  }

  return (
    <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
      {/* Title */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Title *</label>
        <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title" autoFocus />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Description</label>
        <textarea
          style={{ ...inp, minHeight: 70, resize: 'vertical' }}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Optional details…"
        />
      </div>

      {/* Status + Priority */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Status</label>
          <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_COLORS[s]?.label || s}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Priority</label>
          <select style={inp} value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Assignee + Due date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Assigned To</label>
          <select style={inp} value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
            <option value=''>Unassigned</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Due Date</label>
          <input type="date" style={inp} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </div>
      </div>

      {/* Subtasks */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Subtasks</label>
        <div style={{ border: `1px solid rgba(0,0,0,0.1)`, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
          {form.subtasks.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: 12, color: T.muted, textAlign: 'center' }}>
              No subtasks
            </div>
          ) : (
            form.subtasks.map((sub, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderBottom: idx < form.subtasks.length - 1 ? `1px solid rgba(0,0,0,0.06)` : 'none',
                background: idx % 2 === 0 ? '#fafafa' : '#fff',
              }}>
                <input type="checkbox" checked={sub.done} onChange={() => toggleSubtask(idx)} />
                <span style={{ flex: 1, fontSize: 13, color: T.navy, textDecoration: sub.done ? 'line-through' : 'none', opacity: sub.done ? 0.55 : 1 }}>
                  {sub.text}
                </span>
                <button onClick={() => removeSubtask(idx)} style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: T.muted }}>×</button>
              </div>
            ))
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            style={{ ...inp, flex: 1 }}
            value={newSubtask}
            onChange={e => setNewSubtask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSubtask()}
            placeholder="Add subtask… (Enter)"
          />
          <button onClick={addSubtask} style={{
            padding: '8px 14px', background: '#6366f1', color: '#fff',
            border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: T.font,
          }}>Add</button>
        </div>
      </div>

      {/* Attachments — existing tasks only */}
      {task?.id && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={lbl}>Attachments{attachments.length > 0 && ` (${attachments.length})`}</span>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 5,
                border: `1px solid rgba(0,0,0,0.12)`, background: '#f8fafc',
                color: T.navy, cursor: uploading ? 'wait' : 'pointer', fontFamily: T.font,
              }}
            >
              {uploading ? 'Uploading…' : '+ Attach'}
            </button>
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
              onChange={e => handleUpload(e.target.files)} />
          </div>

          {attachError && (
            <div style={{ background: '#fef2f2', color: T.red, fontSize: 11, padding: '6px 10px', borderRadius: 5, marginBottom: 8 }}>
              {attachError}
            </div>
          )}

          {attachments.length === 0 ? (
            <div style={{
              border: `1px dashed rgba(0,0,0,0.1)`, borderRadius: 7,
              padding: '12px', textAlign: 'center', fontSize: 12, color: T.muted, cursor: 'pointer',
            }} onClick={() => fileRef.current?.click()}>
              No attachments — click to upload
            </div>
          ) : (
            <div style={{ border: `1px solid rgba(0,0,0,0.08)`, borderRadius: 8, overflow: 'hidden' }}>
              {attachments.map((a, idx) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderBottom: idx < attachments.length - 1 ? `1px solid rgba(0,0,0,0.06)` : 'none',
                  background: idx % 2 === 0 ? '#fafafa' : '#fff',
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{fileIcon(a.filename)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: T.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.filename}
                    </div>
                    {a.filesize && <div style={{ fontSize: 10, color: T.muted }}>{fmtSize(a.filesize)}</div>}
                  </div>
                  <button onClick={() => api.downloadTaskAttachment(projectId, task.id, a.id, a.filename)}
                    style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}>↓</button>
                  <button onClick={() => handleDeleteAttachment(a.id)}
                    style={{ background: 'none', border: 'none', fontSize: 13, color: T.muted, cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div style={{ color: T.red, fontSize: 12, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{
          padding: '8px 18px', background: '#f1f5f9', border: 'none',
          borderRadius: 7, fontSize: 13, cursor: 'pointer', color: T.navy, fontFamily: T.font,
        }}>Cancel</button>
        <button onClick={onSave} disabled={saving} style={{
          padding: '8px 18px', background: '#6366f1', color: '#fff',
          border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500,
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: T.font,
        }}>
          {saving ? 'Saving…' : (task?.id ? 'Save Changes' : 'Create Task')}
        </button>
      </div>
    </div>
  )
}

// ── Comments tab ──────────────────────────────────────────────────────────────

function TaskCommentsTab({ task, projectId, user, users }) {
  const [comments, setComments]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [body, setBody]             = useState('')
  const [saving, setSaving]         = useState(false)
  const [editId, setEditId]         = useState(null)
  const [editBody, setEditBody]     = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [hovered, setHovered]       = useState(null)
  const [error, setError]           = useState('')

  const admin     = isAdmin(user)
  const canEdit   = (c) => c.user_id === user?.id || c.user_name === user?.name
  const canDelete = (c) => c.user_id === user?.id || c.user_name === user?.name || admin

  const load = async () => {
    try {
      const data = await api.getTaskComments(projectId, task.id)
      setComments(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { if (task?.id) load() }, [task?.id])

  const handleSubmit = async () => {
    if (!body.trim()) return
    setSaving(true); setError('')
    try {
      await api.createTaskComment(projectId, task.id, { body: body.trim() })
      setBody('')
      await load()
    } catch (err) { setError(err.message) }
    setSaving(false)
  }

  const handleEdit = async (c) => {
    if (!editBody.trim()) return
    setEditSaving(true)
    try {
      await api.updateTaskComment(projectId, task.id, c.id, { body: editBody.trim() })
      setComments(prev => prev.map(x => x.id === c.id ? { ...x, body: editBody.trim() } : x))
      setEditId(null)
    } catch {}
    setEditSaving(false)
  }

  const handleDelete = async (c) => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await api.deleteTaskComment(projectId, task.id, c.id)
      setComments(prev => prev.filter(x => x.id !== c.id))
    } catch {}
  }

  const textareaStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${T.border}`, fontSize: 13, resize: 'vertical',
    fontFamily: T.font, boxSizing: 'border-box', marginBottom: 8, outline: 'none',
  }

  if (loading) return (
    <div style={{ padding: 24, color: T.muted, fontSize: 13 }}>Loading…</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {comments.length === 0 && (
          <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', paddingTop: 24 }}>
            No comments yet
          </div>
        )}
        {comments.map(c => (
          <div
            key={c.id}
            style={{ display: 'flex', gap: 10 }}
            onMouseEnter={() => setHovered(c.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <Avatar name={c.user_name} size={28} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.navy }}>{c.user_name}</span>
                <span style={{ fontSize: 11, color: T.muted }}>{fmtDate(c.created_at)}</span>
                {hovered === c.id && editId !== c.id && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    {canEdit(c) && (
                      <button
                        onClick={() => { setEditId(c.id); setEditBody(c.body) }}
                        style={{ background: 'none', border: 'none', fontSize: 11, color: T.muted, cursor: 'pointer', padding: '1px 5px', fontFamily: T.font }}
                        title="Edit"
                      >✎</button>
                    )}
                    {canDelete(c) && (
                      <button
                        onClick={() => handleDelete(c)}
                        style={{ background: 'none', border: 'none', fontSize: 11, color: T.red, cursor: 'pointer', padding: '1px 5px', fontFamily: T.font }}
                        title="Delete"
                      >✕</button>
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
                    rows={2}
                    style={{ ...textareaStyle, marginBottom: 6 }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleEdit(c)} disabled={editSaving || !editBody.trim()} style={{
                      padding: '4px 12px', background: '#6366f1', color: '#fff', border: 'none',
                      borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: T.font,
                    }}>
                      {editSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditId(null)} style={{
                      padding: '4px 10px', background: '#f1f5f9', border: 'none',
                      borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: T.font,
                    }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
                  {renderBody(c.body)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Compose */}
      <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}` }}>
        <MentionTextarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit() }}
          placeholder="Comment on this task… (Ctrl+Enter to post)"
          rows={2}
          users={users}
          style={textareaStyle}
        />
        {error && <div style={{ fontSize: 12, color: T.red, marginBottom: 6 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSubmit}
            disabled={saving || !body.trim()}
            style={{
              background: '#6366f1', color: '#fff', border: 'none',
              borderRadius: 7, padding: '6px 16px', fontSize: 12, fontWeight: 500,
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

// ── Main modal ────────────────────────────────────────────────────────────────

export default function TaskModal({ task, projectId, users, user, onClose, onSaved, onDeleted }) {
  const [tab, setTab]     = useState('details')
  const [form, setForm]   = useState({
    title:       task?.title || '',
    description: task?.description || '',
    status:      task?.status || 'todo',
    priority:    task?.priority || 'medium',
    assigned_to: task?.assigned_to || '',
    due_date:    task?.due_date ? task.due_date.slice(0, 10) : '',
    subtasks:    task?.subtasks || [],
  })
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title required'); return }
    setSaving(true); setError('')
    try {
      const payload = { ...form, assigned_to: form.assigned_to || null, due_date: form.due_date || null }
      if (task?.id) {
        await api.updateTask(projectId, task.id, payload)
      } else {
        await api.createTask(projectId, payload)
      }
      onSaved()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${form.title}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await api.deleteTask(projectId, task.id)
      onDeleted ? onDeleted(task.id) : onSaved()
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  const TABS = task?.id
    ? [['details', 'Details'], ['comments', 'Comments']]
    : [['details', 'Details']]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, width: 540, maxWidth: '95vw',
          height: tab === 'comments' ? 560 : undefined,
          maxHeight: '90vh', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>
            {task?.id ? 'Edit Task' : 'New Task'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {task?.id && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Delete task"
                style={{
                  padding: '4px 10px', background: '#fef2f2', color: T.red,
                  border: '1px solid #fecaca', borderRadius: 6, fontSize: 11,
                  cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: T.font,
                }}
              >
                {deleting ? '…' : '🗑 Delete'}
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: T.muted }}>×</button>
          </div>
        </div>

        {/* Tab bar — only shown for existing tasks */}
        {task?.id && (
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            {TABS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: '9px 16px', border: 'none', background: 'none',
                  fontSize: 12, fontWeight: tab === key ? 600 : 400,
                  color: tab === key ? '#6366f1' : T.muted,
                  borderBottom: tab === key ? '2px solid #6366f1' : '2px solid transparent',
                  cursor: 'pointer', fontFamily: T.font,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        {tab === 'details' ? (
          <DetailsTab
            form={form}
            set={set}
            task={task}
            projectId={projectId}
            users={users}
            saving={saving}
            error={error}
            onClose={onClose}
            onSave={handleSave}
          />
        ) : (
          <TaskCommentsTab
            task={task}
            projectId={projectId}
            user={user}
            users={users}
          />
        )}
      </div>
    </div>
  )
}
