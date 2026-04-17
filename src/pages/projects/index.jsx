import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { T, isAdmin } from './shared'
import Sidebar from './Sidebar'
import BoardView from './BoardView'
import ListView from './ListView'
import CalendarView from './CalendarView'
import MyTasksView from './MyTasksView'
import ProjectModal from './ProjectModal'
import DetailPanel from './DetailPanel'
import api from '../../services/api'

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
    </div>
  )
}
