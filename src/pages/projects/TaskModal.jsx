import { useState, useEffect, useRef } from 'react'
import { T, STATUSES, PRIORITIES, STATUS_COLORS, PRIORITY_COLORS, fmtDate } from './shared'
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

const input = {
  width: '100%', padding: '8px 12px', borderRadius: 7,
  border: `1px solid rgba(0,0,0,0.12)`, fontSize: 13,
  fontFamily: T.font, boxSizing: 'border-box', outline: 'none',
}
const label = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }

export default function TaskModal({ task, projectId, users, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:       task?.title || '',
    description: task?.description || '',
    status:      task?.status || 'todo',
    priority:    task?.priority || 'medium',
    assigned_to: task?.assigned_to || '',
    due_date:    task?.due_date ? task.due_date.slice(0, 10) : '',
    subtasks:    task?.subtasks || [],
  })
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

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

  const removeSubtask = (idx) => {
    set('subtasks', form.subtasks.filter((_, i) => i !== idx))
  }

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

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title required'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null,
      }
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

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 500,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, width: 520, maxWidth: '95vw',
          maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${T.border}`,
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>
            {task?.id ? 'Edit Task' : 'New Task'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: T.muted }}>×</button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Title *</label>
            <input style={input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title" autoFocus />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Description</label>
            <textarea
              style={{ ...input, minHeight: 80, resize: 'vertical' }}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Optional details…"
            />
          </div>

          {/* Status + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={label}>Status</label>
              <select style={input} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_COLORS[s]?.label || s}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Priority</label>
              <select style={input} value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Assignee + Due date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={label}>Assigned To</label>
              <select style={input} value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                <option value=''>Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Due Date</label>
              <input type="date" style={input} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>

          {/* Subtasks */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Subtasks</label>
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
                    <span style={{
                      flex: 1, fontSize: 13, color: T.navy,
                      textDecoration: sub.done ? 'line-through' : 'none',
                      opacity: sub.done ? 0.55 : 1,
                    }}>
                      {sub.text}
                    </span>
                    <button onClick={() => removeSubtask(idx)} style={{
                      background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: T.muted,
                    }}>×</button>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={{ ...input, flex: 1 }}
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSubtask()}
                placeholder="Add subtask… (Enter)"
              />
              <button
                onClick={addSubtask}
                style={{
                  padding: '8px 14px', background: '#6366f1', color: '#fff',
                  border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer',
                  fontWeight: 500, fontFamily: T.font,
                }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Attachments — existing tasks only */}
          {task?.id && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={label}>Attachments{attachments.length > 0 && ` (${attachments.length})`}</span>
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
                  padding: '12px', textAlign: 'center', fontSize: 12, color: T.muted,
                  cursor: 'pointer',
                }} onClick={() => fileRef.current?.click()}>
                  No attachments — click to upload
                </div>
              ) : (
                <div style={{ border: `1px solid rgba(0,0,0,0.08)`, borderRadius: 8, overflow: 'hidden' }}>
                  {attachments.map((a, idx) => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px',
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
                      <button
                        onClick={() => api.downloadTaskAttachment(projectId, task.id, a.id, a.filename)}
                        style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0 }}
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleDeleteAttachment(a.id)}
                        style={{ background: 'none', border: 'none', fontSize: 13, color: T.muted, cursor: 'pointer', flexShrink: 0 }}
                      >
                        ×
                      </button>
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
            }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '8px 18px', background: '#6366f1', color: '#fff',
              border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: T.font,
            }}>
              {saving ? 'Saving…' : (task?.id ? 'Save Changes' : 'Create Task')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
