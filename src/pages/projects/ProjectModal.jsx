import { useState, useEffect } from 'react'
import { T, PRIORITIES, COVER_COLORS, isAdmin } from './shared'
import api from '../../services/api'

const input = {
  width: '100%', padding: '8px 12px', borderRadius: 7,
  border: `1px solid rgba(0,0,0,0.12)`, fontSize: 13,
  fontFamily: T.font, boxSizing: 'border-box', outline: 'none',
}
const label = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }

export default function ProjectModal({ project, users, user, onClose, onSaved }) {
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState({
    title:           project?.title || '',
    description:     project?.description || '',
    department_id:   project?.department_id || '',
    assigned_to:     project?.assigned_to || '',
    priority:        project?.priority || 'medium',
    start_date:      project?.start_date ? project.start_date.slice(0, 10) : '',
    due_date:        project?.due_date ? project.due_date.slice(0, 10) : '',
    requires_signoff: project?.requires_signoff || false,
    cover_color:     project?.cover_color || '#6366f1',
    tags:            (project?.tags || []).join(', '),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const admin = isAdmin(user)

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title required'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        department_id: form.department_id || null,
        assigned_to:   form.assigned_to || null,
        start_date:    form.start_date || null,
        due_date:      form.due_date || null,
        tags:          form.tags.split(',').map(t => t.trim()).filter(Boolean),
      }
      if (project?.id) {
        await api.updateProject(project.id, payload)
      } else {
        await api.createProject(payload)
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
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, width: 560, maxWidth: '95vw',
          maxHeight: '92vh', overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Cover preview */}
        <div style={{ height: 6, background: form.cover_color }} />

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${T.border}`,
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>
            {project?.id ? 'Edit Project' : 'New Project'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: T.muted }}>×</button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Title *</label>
            <input style={input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Project title" autoFocus />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Description</label>
            <textarea
              style={{ ...input, minHeight: 80, resize: 'vertical' }}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="What is this project about?"
            />
          </div>

          {/* Department + Assignee */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={label}>Department</label>
              <select style={input} value={form.department_id} onChange={e => set('department_id', e.target.value)}>
                <option value=''>— None —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Assigned To</label>
              <select style={input} value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                <option value=''>Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {/* Priority */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Priority</label>
            <select style={input} value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={label}>Start Date</label>
              <input type="date" style={input} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label style={label}>Due Date</label>
              <input type="date" style={input} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>

          {/* Cover color */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Cover Color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COVER_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => set('cover_color', c)}
                  style={{
                    width: 28, height: 28, borderRadius: 6, background: c,
                    border: form.cover_color === c ? `3px solid ${T.navy}` : '3px solid transparent',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Tags (comma separated)</label>
            <input style={input} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="e.g. infrastructure, Q3, urgent" />
          </div>

          {/* Sign-off toggle */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: T.navy }}>
              <input
                type="checkbox"
                checked={form.requires_signoff}
                onChange={e => set('requires_signoff', e.target.checked)}
              />
              Requires sign-off before completion
            </label>
          </div>

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
              {saving ? 'Saving…' : (project?.id ? 'Save Changes' : 'Create Project')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
