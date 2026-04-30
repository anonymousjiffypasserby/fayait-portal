import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { useNavigate } from 'react-router-dom'
import { T, isAdmin, fmtDate } from './shared'
import Sidebar from './Sidebar'
import BoardView from './BoardView'
import ListView from './ListView'
import CalendarView from './CalendarView'
import MyTasksView from './MyTasksView'
import ProjectModal from './ProjectModal'
import DetailPanel from './DetailPanel'
import api from '../../services/api'

// ── SAR HTML builder ──────────────────────────────────────────────────────────
function buildProjectSarHtml(userName, items) {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const projectBlocks = items.map(({ project, tasks, comments }) => {
    const taskRows = tasks.map(t => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9">${esc(t.title)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9">${esc(t.status)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9">${esc(t.priority)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9">${esc(t.due_date ? fmtDate(t.due_date) : '—')}</td>
      </tr>`).join('')
    const commentRows = comments.map(c => `
      <div style="margin:6px 0;padding:10px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb">
        <div style="font-size:11px;color:#888;margin-bottom:4px">${esc(fmtDate(c.created_at))}</div>
        <div style="font-size:13px;line-height:1.6">${esc(c.body)}</div>
      </div>`).join('')
    return `
      <div style="margin-bottom:32px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <div style="background:#f1f5f9;padding:10px 16px;display:flex;align-items:center;gap:10px">
          <strong style="font-size:14px">${esc(project.title)}</strong>
          <span style="margin-left:auto;font-size:11px;color:#888">${esc(project.status)} · ${esc(project.priority)} · Created ${esc(fmtDate(project.created_at))}</span>
        </div>
        <div style="padding:12px 16px">
          ${tasks.length ? `
            <div style="font-size:12px;font-weight:600;color:#6366f1;margin-bottom:8px">Tasks assigned to ${esc(userName)}</div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px">
              <thead><tr style="background:#f8fafc">
                <th style="padding:6px 10px;text-align:left;color:#64748b">Task</th>
                <th style="padding:6px 10px;text-align:left;color:#64748b">Status</th>
                <th style="padding:6px 10px;text-align:left;color:#64748b">Priority</th>
                <th style="padding:6px 10px;text-align:left;color:#64748b">Due</th>
              </tr></thead>
              <tbody>${taskRows}</tbody>
            </table>` : ''}
          ${comments.length ? `
            <div style="font-size:12px;font-weight:600;color:#6366f1;margin-bottom:8px">Comments by ${esc(userName)}</div>
            ${commentRows}` : ''}
          ${!tasks.length && !comments.length ? '<div style="color:#aaa;font-size:12px">No tasks or comments for this user in this project.</div>' : ''}
        </div>
      </div>`
  }).join('')
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Subject Access Report – ${esc(userName)}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:40px auto;color:#1a1f2e;padding:0 20px}
h1{font-size:22px;margin-bottom:4px}h2{font-size:16px;border-bottom:2px solid #6366f1;padding-bottom:6px;color:#6366f1}
.meta{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:28px}
.meta p{margin:4px 0;font-size:13px}.meta strong{color:#1a1f2e}
.notice{font-size:12px;color:#555;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px 14px;margin-bottom:28px}
@media print{.meta,.notice{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
</head><body>
<h1>Subject Access Report — Projects</h1>
<div class="meta">
  <p><strong>Data subject:</strong> ${esc(userName)}</p>
  <p><strong>Report generated:</strong> ${date}</p>
  <p><strong>Projects found:</strong> ${items.length}</p>
</div>
<div class="notice">
  This report was generated in response to a Subject Access Request under GDPR Article 15.
  It contains all project data held for the above data subject at the time of generation.
</div>
<h2>Projects</h2>
${projectBlocks || '<p style="color:#aaa">No project data found for this user.</p>'}
</body></html>`
}

function viewLabel(view) {
  if (view === 'my_tasks')    return 'My Tasks'
  if (view === 'my_projects') return 'My Projects'
  if (view === 'list')        return 'All Projects'
  if (view === 'calendar')    return 'Calendar'
  if (view === 'board')       return 'Board'
  if (view?.startsWith('dept_')) return 'Department'
  return 'Projects'
}

function filterProjectsByView(projects, view, user) {
  if (view === 'my_projects') {
    return projects.filter(p => p.assigned_to === user?.id || p.created_by === user?.id)
  }
  if (view === 'dept_all') {
    return user?.department
      ? projects.filter(p => p.department_name === user.department)
      : projects
  }
  if (view?.startsWith('dept_')) {
    const status = view.slice(5) // dept_in_progress → in_progress
    return user?.department
      ? projects.filter(p => p.department_name === user.department && p.status === status)
      : projects.filter(p => p.status === status)
  }
  return projects
}

export default function Projects() {
  const { user } = useAuth()
  const { hasPermission } = usePermission()
  const navigate = useNavigate()

  const [projects, setProjects]   = useState([])
  const [users, setUsers]         = useState([])
  const [tasks, setTasks]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState('board')
  const [filters, setFilters]     = useState({ priority: '', assigned_to: '' })
  const [selectedId, setSelectedId] = useState(null)
  const [showNew, setShowNew]     = useState(false)
  const [isMobile, setIsMobile]   = useState(() => window.innerWidth <= 768)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showSar, setShowSar]     = useState(false)
  const [sarUserId, setSarUserId] = useState('')
  const [sarLoading, setSarLoading] = useState(false)
  const [sarError, setSarError]   = useState(null)

  const service = user?.services?.projects

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const loadProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.priority)    params.set('priority',    filters.priority)
      if (filters.assigned_to) params.set('assigned_to', filters.assigned_to)
      const query = params.toString() ? `?${params}` : ''
      const data = await api.getProjects(query)
      setProjects(data.rows || data || [])
    } catch {}
  }, [filters])

  const loadTasks = useCallback(async () => {
    try {
      const data = await api.getMyTasks()
      setTasks(data || [])
    } catch {}
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      loadProjects(),
      api.getUsers().catch(() => []),
      loadTasks(),
    ]).then(([, userData]) => {
      setUsers(Array.isArray(userData) ? userData : [])
      setLoading(false)
    })
  }, [loadProjects, loadTasks])

  const handleFilter = (newFilters) => {
    setFilters(f => ({ ...f, ...newFilters }))
  }

  const handleProjectUpdated = useCallback(() => {
    loadProjects()
    loadTasks()
  }, [loadProjects, loadTasks])

  const handleDelete = useCallback((id) => {
    setProjects(ps => ps.filter(p => p.id !== id))
    if (selectedId === id) setSelectedId(null)
  }, [selectedId])

  const handleStatusChange = useCallback(async (projectId, newStatus) => {
    try {
      await api.updateProject(projectId, { status: newStatus })
      setProjects(ps => ps.map(p => p.id === projectId ? { ...p, status: newStatus } : p))
    } catch {}
  }, [])

  const handleView = (v) => {
    setView(v)
    setMobileMenuOpen(false)
  }

  const handleSarGenerate = async () => {
    if (!sarUserId) return
    setSarLoading(true); setSarError(null)
    try {
      const targetUser = users.find(u => String(u.id) === String(sarUserId))
      if (!targetUser) throw new Error('User not found')
      const uid = targetUser.id
      const uname = targetUser.name
      const relevant = projects.filter(p => p.assigned_to === uid || p.created_by === uid)
      const items = await Promise.all(relevant.map(async project => {
        const [allTasks, allComments] = await Promise.all([
          api.getProjectTasks(project.id).catch(() => []),
          api.getProjectComments(project.id).catch(() => []),
        ])
        const myTasks    = (allTasks    || []).filter(t => t.assigned_to === uid)
        const myComments = (allComments || []).filter(c => c.user_name === uname || c.user_id === uid)
        return { project, tasks: myTasks, comments: myComments }
      }))
      const html = buildProjectSarHtml(uname, items)
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `SAR-Projects-${uname.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.html`
      a.click(); URL.revokeObjectURL(url)
      setShowSar(false); setSarUserId('')
    } catch (err) {
      setSarError(err.message)
    } finally {
      setSarLoading(false)
    }
  }

  // ── Upgrade / locked guard ───────────────────────────────────────────────────

  if (service === 'locked') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, fontFamily: T.font }}>
        <div style={{ textAlign: 'center', maxWidth: 360, padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: T.navy, marginBottom: 8 }}>Projects not available</h2>
          <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 20 }}>
            Contact Faya IT to enable the Projects module for your team.
          </p>
          <button onClick={() => navigate('/')} style={{
            padding: '8px 18px', background: '#6366f1', color: '#fff',
            border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontFamily: T.font,
          }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (service !== 'active' && service !== undefined) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, fontFamily: T.font }}>
        <div style={{ textAlign: 'center', maxWidth: 360, padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: T.navy, marginBottom: 8 }}>Upgrade to use Projects</h2>
          <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 20 }}>
            The Projects module lets your team plan, track, and deliver work together.
          </p>
          <button onClick={() => navigate('/billing')} style={{
            padding: '8px 18px', background: '#6366f1', color: '#fff',
            border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontFamily: T.font,
          }}>
            View Plans
          </button>
        </div>
      </div>
    )
  }

  // ── Derive visible projects from current view ────────────────────────────────

  const visibleProjects = filterProjectsByView(projects, view, user)

  const mainView = view === 'my_tasks'
    ? 'my_tasks'
    : view === 'calendar' ? 'calendar'
    : view === 'list' ? 'list'
    : 'board'

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden', background: T.bg, fontFamily: T.font }}>

      {/* Mobile menu toggle */}
      {isMobile && (
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          style={{
            position: 'fixed', top: 56, left: 8, zIndex: 300,
            background: '#6366f1', color: '#fff', border: 'none',
            borderRadius: 6, padding: '5px 9px', fontSize: 16, cursor: 'pointer',
          }}
        >
          ☰
        </button>
      )}

      {/* Sidebar */}
      {(!isMobile || mobileMenuOpen) && (
        <div style={{
          width: 220, flexShrink: 0,
          background: '#fff', overflowY: 'auto',
          ...(isMobile ? {
            position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 299,
            boxShadow: '4px 0 20px rgba(0,0,0,0.12)',
          } : {}),
        }}>
          <Sidebar
            view={view}
            filters={filters}
            projects={projects}
            tasks={tasks}
            user={user}
            onView={handleView}
            onFilter={handleFilter}
            onNew={() => { setShowNew(true); setMobileMenuOpen(false) }}
          />
        </div>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 298 }}
        />
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{
          height: 50, background: '#fff', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>
              {viewLabel(view)}
            </span>
            {!loading && view !== 'my_tasks' && (
              <span style={{ fontSize: 11, color: T.muted, background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>
                {visibleProjects.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isAdmin(user) && (
              <button
                onClick={() => setShowSar(true)}
                title="GDPR Subject Access Request — export a user's project data"
                style={{
                  padding: '6px 12px', background: '#fff', color: '#92400e',
                  border: '1px solid #fcd34d', borderRadius: 7, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', fontFamily: T.font,
                }}
              >
                SAR Export
              </button>
            )}
            {hasPermission('projects', 'create') && (
              <button
                onClick={() => setShowNew(true)}
                style={{
                  padding: '6px 14px', background: '#6366f1', color: '#fff',
                  border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', fontFamily: T.font,
                }}
              >
                + New Project
              </button>
            )}
          </div>
        </div>

        {/* View area */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.muted, fontSize: 13 }}>
              Loading…
            </div>
          ) : mainView === 'board' ? (
            <BoardView
              projects={visibleProjects}
              onCardClick={setSelectedId}
              onStatusChange={handleStatusChange}
            />
          ) : mainView === 'list' ? (
            <ListView
              projects={visibleProjects}
              onRowClick={setSelectedId}
            />
          ) : mainView === 'calendar' ? (
            <CalendarView
              projects={visibleProjects}
              tasks={tasks}
              onSelectProject={setSelectedId}
            />
          ) : mainView === 'my_tasks' ? (
            <MyTasksView
              tasks={tasks}
              projects={projects}
              user={user}
              onRefresh={loadTasks}
            />
          ) : null}
        </div>
      </div>

      {/* Detail panel */}
      {selectedId && (
        <DetailPanel
          projectId={selectedId}
          users={users}
          user={user}
          onClose={() => setSelectedId(null)}
          onProjectUpdated={handleProjectUpdated}
          onDelete={handleDelete}
        />
      )}

      {/* New project modal */}
      {showNew && (
        <ProjectModal
          project={null}
          users={users}
          user={user}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); handleProjectUpdated() }}
        />
      )}

      {/* SAR Export modal */}
      {showSar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', fontFamily: T.font }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 4 }}>SAR Export — Projects</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 20, lineHeight: 1.5 }}>
              Generate a Subject Access Report (GDPR Art. 15) containing all project assignments, tasks, and comments for the selected user.
            </div>
            <label style={{ fontSize: 12, color: T.navy, fontWeight: 600, display: 'block', marginBottom: 6 }}>Select user</label>
            <select
              value={sarUserId}
              onChange={e => setSarUserId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.font, marginBottom: 16, outline: 'none' }}
            >
              <option value="">— choose a user —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            {sarError && <div style={{ fontSize: 12, color: T.red, marginBottom: 10 }}>{sarError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowSar(false); setSarUserId(''); setSarError(null) }}
                style={{ padding: '8px 18px', borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 13, background: '#fff', color: T.navy, cursor: 'pointer', fontFamily: T.font }}
              >
                Cancel
              </button>
              <button
                onClick={handleSarGenerate}
                disabled={!sarUserId || sarLoading}
                style={{ padding: '8px 22px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: sarUserId && !sarLoading ? 'pointer' : 'default', fontFamily: T.font, background: sarUserId && !sarLoading ? '#92400e' : '#e5e7eb', color: sarUserId && !sarLoading ? '#fff' : T.muted }}
              >
                {sarLoading ? 'Generating…' : 'Generate & Download'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
