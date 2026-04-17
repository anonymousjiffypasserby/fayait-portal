import { useState, useEffect } from 'react'
import { T, fmtDate } from './shared'
import api from '../../services/api'

const ACTION_ICONS = {
  create:           { icon: '✨', label: 'Created project' },
  status_changed:   { icon: '↔', label: 'Changed status' },
  task_added:       { icon: '➕', label: 'Added task' },
  task_completed:   { icon: '✅', label: 'Completed task' },
  comment_added:    { icon: '💬', label: 'Added comment' },
  signed_off:       { icon: '✍', label: 'Signed off' },
  task_assigned:    { icon: '👤', label: 'Assigned task' },
  project_assigned: { icon: '👤', label: 'Assigned project' },
}

function formatDetails(action, details) {
  if (!details) return null
  try {
    const d = typeof details === 'string' ? JSON.parse(details) : details
    if (action === 'status_changed') return `${d.from} → ${d.to}`
    if (action === 'task_added' || action === 'task_completed') return `"${d.title}"`
    if (action === 'comment_added' && d.preview) return `"${d.preview}${d.preview.length >= 60 ? '…' : ''}"`
    return null
  } catch { return null }
}

export default function ActivityTab({ projectId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getProjectActivity(projectId)
      .then(data => setRows(data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) return (
    <div style={{ padding: 24, color: T.muted, fontSize: 13 }}>Loading activity…</div>
  )

  if (!rows.length) return (
    <div style={{ padding: 24, color: T.muted, fontSize: 13, textAlign: 'center' }}>
      No activity recorded yet
    </div>
  )

  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', height: '100%' }}>
      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: 15, top: 8, bottom: 8,
          width: 1, background: T.border,
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {rows.map((row, i) => {
            const meta = ACTION_ICONS[row.action] || { icon: '•', label: row.action }
            const detail = formatDetails(row.action, row.details)
            return (
              <div key={row.id} style={{ display: 'flex', gap: 14, paddingBottom: 18, position: 'relative' }}>
                {/* Icon bubble */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: '#f1f5f9',
                  border: `2px solid ${T.border}`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 13, flexShrink: 0, zIndex: 1,
                }}>
                  {meta.icon}
                </div>

                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>
                      {row.performed_by_name || 'System'}
                    </span>
                    <span style={{ fontSize: 12, color: T.muted }}>{meta.label}</span>
                    {detail && (
                      <span style={{ fontSize: 12, color: '#6366f1', fontStyle: 'italic' }}>{detail}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: T.mutedLight, marginTop: 2 }}>
                    {fmtDate(row.created_at)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
