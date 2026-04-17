import { useState } from 'react'
import { T, STATUS_COLORS, PRIORITY_COLORS, STATUSES, Avatar, isOverdue, fmtDateShort } from './shared'
import TaskModal from './TaskModal'
import api from '../../services/api'

const PRIORITY_DOT = {
  urgent: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a',
}

function TaskCard({ task, onDragStart, onEdit }) {
  const overdue = isOverdue(task.due_date, task.status)
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={() => onEdit(task)}
      style={{
        background: '#fff', borderRadius: 8, padding: '10px 12px',
        border: `1px solid rgba(0,0,0,0.07)`, cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)', userSelect: 'none',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 4,
          background: PRIORITY_DOT[task.priority] || PRIORITY_DOT.medium,
        }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: T.navy, lineHeight: 1.4 }}>{task.title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {task.assigned_to_name
          ? <Avatar name={task.assigned_to_name} size={20} />
          : <span />
        }
        {task.due_date && (
          <span style={{ fontSize: 10, color: overdue ? T.red : T.muted, fontWeight: overdue ? 600 : 400 }}>
            {fmtDateShort(task.due_date)}
          </span>
        )}
      </div>
      {task.subtasks?.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 10, color: T.muted }}>
          ✓ {task.subtasks.filter(s => s.done).length}/{task.subtasks.length} subtasks
        </div>
      )}
    </div>
  )
}

export default function TasksTab({ project, tasks: initialTasks, users, onRefresh }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [dragTaskId, setDragTaskId] = useState(null)
  const [overCol, setOverCol] = useState(null)
  const [addingIn, setAddingIn] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [editTask, setEditTask] = useState(null)

  // Keep local tasks in sync with prop
  if (tasks !== initialTasks && JSON.stringify(tasks.map(t => t.id)) !== JSON.stringify(initialTasks.map(t => t.id))) {
    setTasks(initialTasks)
  }

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s)
    return acc
  }, {})

  const handleDrop = async (newStatus) => {
    if (!dragTaskId) return
    const task = tasks.find(t => t.id === dragTaskId)
    if (task && task.status !== newStatus) {
      // Optimistic
      setTasks(prev => prev.map(t => t.id === dragTaskId ? { ...t, status: newStatus } : t))
      try {
        await api.updateTask(project.id, dragTaskId, { status: newStatus })
        onRefresh()
      } catch {
        setTasks(initialTasks)
      }
    }
    setDragTaskId(null); setOverCol(null)
  }

  const handleAddTask = async (status) => {
    if (!newTitle.trim()) { setAddingIn(null); return }
    try {
      await api.createTask(project.id, { title: newTitle.trim(), status })
      setNewTitle('')
      setAddingIn(null)
      onRefresh()
    } catch {}
  }

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${STATUSES.length}, 1fr)`,
        gap: 8, padding: '12px 16px', height: '100%', overflowX: 'auto',
      }}>
        {STATUSES.map(status => {
          const c = STATUS_COLORS[status]
          const isOver = overCol === status
          return (
            <div
              key={status}
              onDragOver={e => { e.preventDefault(); setOverCol(status) }}
              onDragLeave={() => setOverCol(null)}
              onDrop={() => handleDrop(status)}
              style={{
                background: isOver ? 'rgba(99,102,241,0.04)' : '#f8fafc',
                borderRadius: 10, border: `1.5px solid ${isOver ? '#6366f1' : 'rgba(0,0,0,0.07)'}`,
                display: 'flex', flexDirection: 'column', minWidth: 160,
                transition: 'border-color 0.15s',
              }}
            >
              {/* Column header */}
              <div style={{ padding: '8px 10px 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.color }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: T.navy, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {c.label}
                </span>
                <span style={{ fontSize: 10, color: T.muted, marginLeft: 'auto' }}>
                  {grouped[status].length}
                </span>
              </div>

              {/* Task cards */}
              <div style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 40, overflowY: 'auto' }}>
                {grouped[status].map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onDragStart={() => setDragTaskId(t.id)}
                    onEdit={task => setEditTask(task)}
                  />
                ))}
              </div>

              {/* Add task */}
              <div style={{ padding: '6px 8px 8px' }}>
                {addingIn === status ? (
                  <div>
                    <input
                      autoFocus
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddTask(status)
                        if (e.key === 'Escape') { setAddingIn(null); setNewTitle('') }
                      }}
                      placeholder="Task title…"
                      style={{
                        width: '100%', padding: '6px 8px', borderRadius: 6, fontSize: 12,
                        border: '1.5px solid #6366f1', boxSizing: 'border-box', outline: 'none',
                        fontFamily: T.font,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <button onClick={() => handleAddTask(status)} style={{
                        flex: 1, padding: '4px 0', background: '#6366f1', color: '#fff',
                        border: 'none', borderRadius: 5, fontSize: 11, cursor: 'pointer', fontFamily: T.font,
                      }}>Add</button>
                      <button onClick={() => { setAddingIn(null); setNewTitle('') }} style={{
                        padding: '4px 8px', background: '#f1f5f9', border: 'none',
                        borderRadius: 5, fontSize: 11, cursor: 'pointer',
                      }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingIn(status); setNewTitle('') }}
                    style={{
                      width: '100%', padding: '5px 0', background: 'none', border: 'none',
                      fontSize: 11, color: T.muted, cursor: 'pointer', textAlign: 'left',
                      paddingLeft: 4, fontFamily: T.font,
                    }}
                  >
                    + Add task
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {editTask !== null && (
        <TaskModal
          task={editTask}
          projectId={project.id}
          users={users}
          onClose={() => setEditTask(null)}
          onSaved={() => { setEditTask(null); onRefresh() }}
        />
      )}
    </>
  )
}
