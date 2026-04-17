import { useState, useEffect } from 'react'
import { T, STATUS_COLORS, PRIORITY_COLORS, STATUSES, PRIORITIES, ProgressBar, Avatar, fmtDate, fmtDateShort, isOverdue, isAdmin } from './shared'
import TasksTab from './TasksTab'
import CommentsTab from './CommentsTab'
import ActivityTab from './ActivityTab'
import AttachmentsTab from './AttachmentsTab'
import ProjectModal from './ProjectModal'
import api from '../../services/api'

const TABS = ['Overview', 'Tasks', 'Comments', 'Activity', 'Files']

export default function DetailPanel({ projectId, users, user, onClose, onProjectUpdated, onDelete }) {
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')
  const [showEdit, setShowEdit] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState('')

  const admin = isAdmin(user)
  const canEdit = admin || project?.created_by === user?.id || project?.assigned_to === user?.id
  const canDelete = admin || project?.created_by === user?.id
  const canSignoff = admin && project?.status === 'review' && project?.requires_signoff

  const load = async () => {
    try {
      const data = await api.getProject(projectId)
      setProject(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setLoading(true); setError(''); load() }, [projectId])

  const handleStatusChange = async (newStatus) => {
    setActionLoading('status')
    try {
      await api.updateProject(project.id, { status: newStatus })
      setProject(p => ({ ...p, status: newStatus }))
      onProjectUpdated()
    } catch (err) { setError(err.message) }
    setActionLoading(null)
  }

  const handleFollow = async () => {
    setActionLoading('follow')
    try {
      if (project.is_following) {
        await api.unfollowProject(project.id)
        setProject(p => ({ ...p, is_following: false, follower_count: p.follower_count - 1 }))
      } else {
        await api.followProject(project.id)
        setProject(p => ({ ...p, is_following: true, follower_count: p.follower_count + 1 }))
      }
    } catch (err) { setError(err.message) }
    setActionLoading(null)
  }

  const handleSignoff = async () => {
    if (!window.confirm('Sign off on this project? This will mark it as Done.')) return
    setActionLoading('signoff')
    try {
      const updated = await api.signoffProject(project.id)
      setProject(p => ({ ...p, ...updated }))
      onProjectUpdated()
    } catch (err) { setError(err.message) }
    setActionLoading(null)
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return
    setActionLoading('delete')
    try {
      await api.deleteProject(project.id)
      onDelete(project.id)
      onClose()
    } catch (err) {
      setError(err.message)
      setActionLoading(null)
    }
  }

  const isMobile = window.innerWidth <= 768

  return (
    <>
      {/* Backdrop (mobile only) */}
      {isMobile && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
        />
      )}

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: isMobile ? '100vw' : 540,
        background: '#fff',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        zIndex: 201,
        display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.2s ease',
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13 }}>
            Loading…
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: 20, color: T.red, fontSize: 13 }}>{error}</div>
        )}

        {!loading && project && (
          <>
            {/* Cover bar */}
            <div style={{ height: 5, background: project.cover_color || '#6366f1', flexShrink: 0 }} />

            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.navy, flex: 1, marginRight: 12, lineHeight: 1.3 }}>
                  {project.title}
                </h2>
                <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: T.muted, flexShrink: 0 }}>×</button>
              </div>

              {/* Status + Priority */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <select
                  value={project.status}
                  onChange={e => handleStatusChange(e.target.value)}
                  disabled={!canEdit || actionLoading === 'status'}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 8,
                    background: STATUS_COLORS[project.status]?.bg || '#f1f5f9',
                    color: STATUS_COLORS[project.status]?.color || T.muted,
                    border: 'none', cursor: canEdit ? 'pointer' : 'default', fontFamily: T.font,
                  }}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_COLORS[s]?.label || s}</option>)}
                </select>

                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                  background: PRIORITY_COLORS[project.priority]?.bg || '#fefce8',
                  color: PRIORITY_COLORS[project.priority]?.color || '#ca8a04',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  {project.priority}
                </span>

                {project.due_date && (
                  <span style={{
                    fontSize: 11, color: isOverdue(project.due_date, project.status) ? T.red : T.muted,
                    fontWeight: isOverdue(project.due_date, project.status) ? 600 : 400,
                  }}>
                    {isOverdue(project.due_date, project.status) ? '⚠ Overdue · ' : ''}
                    Due {fmtDateShort(project.due_date)}
                  </span>
                )}

                {project.requires_signoff && project.status !== 'done' && (
                  <span style={{ fontSize: 10, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 500 }}>
                    Sign-off required
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={handleFollow} disabled={actionLoading === 'follow'} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  background: project.is_following ? '#eff6ff' : '#f1f5f9',
                  color: project.is_following ? '#2563eb' : T.muted,
                  border: `1px solid ${project.is_following ? '#bfdbfe' : T.border}`,
                  fontFamily: T.font,
                }}>
                  {project.is_following ? '👁 Following' : '+ Follow'} ({project.follower_count})
                </button>

                {canEdit && (
                  <button onClick={() => setShowEdit(true)} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                    background: '#f1f5f9', color: T.navy, border: `1px solid ${T.border}`, fontFamily: T.font,
                  }}>
                    ✎ Edit
                  </button>
                )}

                {canSignoff && (
                  <button onClick={handleSignoff} disabled={actionLoading === 'signoff'} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                    background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontFamily: T.font,
                  }}>
                    ✍ Sign Off
                  </button>
                )}

                {canDelete && (
                  <button onClick={handleDelete} disabled={actionLoading === 'delete'} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                    background: '#fef2f2', color: T.red, border: '1px solid #fecaca', fontFamily: T.font,
                  }}>
                    🗑 Delete
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex', gap: 0, borderBottom: `1px solid ${T.border}`,
              flexShrink: 0, overflowX: 'auto',
            }}>
              {TABS.map(t => {
                const count = t === 'Tasks' ? project.task_count
                  : t === 'Comments' ? project.comments?.length
                  : t === 'Files' ? project.attachments?.length
                  : null
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: '10px 14px', border: 'none', background: 'none',
                      fontSize: 12, fontWeight: tab === t ? 600 : 400,
                      color: tab === t ? '#6366f1' : T.muted,
                      borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
                      cursor: 'pointer', fontFamily: T.font, whiteSpace: 'nowrap',
                    }}
                  >
                    {t}
                    {count > 0 && (
                      <span style={{
                        marginLeft: 5, fontSize: 10, background: '#f1f5f9',
                        borderRadius: 8, padding: '1px 5px', color: T.muted,
                      }}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {tab === 'Overview' && (
                <OverviewTab project={project} />
              )}
              {tab === 'Tasks' && (
                <TasksTab
                  project={project}
                  tasks={project.tasks || []}
                  users={users}
                  onRefresh={() => { load(); onProjectUpdated() }}
                />
              )}
              {tab === 'Comments' && (
                <CommentsTab
                  project={project}
                  comments={project.comments || []}
                  user={user}
                  onRefresh={load}
                />
              )}
              {tab === 'Activity' && <ActivityTab projectId={project.id} />}
              {tab === 'Files' && (
                <AttachmentsTab
                  project={project}
                  attachments={project.attachments || []}
                  onRefresh={load}
                />
              )}
            </div>
          </>
        )}
      </div>

      {showEdit && project && (
        <ProjectModal
          project={project}
          users={users}
          user={user}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); onProjectUpdated() }}
        />
      )}
    </>
  )
}

function OverviewTab({ project }) {
  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', height: '100%' }}>
      {/* Description */}
      {project.description && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 }}>Description</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{project.description}</div>
        </div>
      )}

      {/* Progress */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.7 }}>Progress</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.navy }}>{project.progress || 0}%</span>
        </div>
        <ProgressBar value={project.progress || 0} height={8} />
        <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>
          {project.completed_task_count || 0} of {project.task_count || 0} tasks complete
        </div>
      </div>

      {/* Timeline bar */}
      {(project.start_date || project.due_date) && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>Timeline</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: T.navy }}>
            {project.start_date && <span>{fmtDateShort(project.start_date)}</span>}
            {project.start_date && project.due_date && (
              <div style={{ flex: 1, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#6366f1', width: `${project.progress || 0}%` }} />
              </div>
            )}
            {project.due_date && <span>{fmtDateShort(project.due_date)}</span>}
          </div>
        </div>
      )}

      {/* Meta grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Assignee',   value: project.assigned_to_name || '—' },
          { label: 'Created by', value: project.created_by_name || '—' },
          { label: 'Department', value: project.department_name || '—' },
          { label: 'Created',    value: fmtDate(project.created_at) },
        ].map(({ label: l, value }) => (
          <div key={l}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 13, color: T.navy }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tags */}
      {project.tags?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>Tags</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {project.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 11, padding: '2px 10px', borderRadius: 10,
                background: '#f1f5f9', color: '#475569', fontWeight: 500,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Followers */}
      {project.followers?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>
            Followers ({project.followers.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {project.followers.map(f => (
              <div key={f.user_id} title={f.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Avatar name={f.name} size={24} />
                <span style={{ fontSize: 11, color: T.muted }}>{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
