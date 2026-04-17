import { useState } from 'react'
import { T, STATUS_COLORS, fmtDateShort } from './shared'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarView({ projects, tasks, onProjectClick }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  // Index items by day of month
  const projectsByDay = {}
  projects.forEach(p => {
    if (!p.due_date) return
    const d = new Date(p.due_date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!projectsByDay[day]) projectsByDay[day] = []
      projectsByDay[day].push({ ...p, _type: 'project' })
    }
  })

  const tasksByDay = {}
  tasks.forEach(t => {
    if (!t.due_date) return
    const d = new Date(t.due_date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!tasksByDay[day]) tasksByDay[day] = []
      tasksByDay[day].push({ ...t, _type: 'task' })
    }
  })

  // Build grid: pad start with empty cells
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isToday = (d) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div style={{ padding: '16px 20px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={prev} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 14 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>{MONTHS[month]} {year}</span>
        <button onClick={next} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 14 }}>›</button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: T.muted, padding: '4px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const dayProjects = projectsByDay[day] || []
          const dayTasks = tasksByDay[day] || []
          const hasItems = dayProjects.length > 0 || dayTasks.length > 0
          return (
            <div
              key={day}
              style={{
                minHeight: 90, background: T.card, borderRadius: 8,
                border: `1px solid ${isToday(day) ? '#6366f1' : T.border}`,
                padding: '6px 8px', overflow: 'hidden',
              }}
            >
              <div style={{
                fontSize: 12, fontWeight: isToday(day) ? 700 : 500,
                color: isToday(day) ? '#6366f1' : T.navy,
                marginBottom: hasItems ? 5 : 0,
                width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', background: isToday(day) ? 'rgba(99,102,241,0.1)' : undefined,
              }}>
                {day}
              </div>

              {/* Projects on this day */}
              {dayProjects.slice(0, 3).map(p => (
                <div
                  key={p.id}
                  onClick={() => onProjectClick(p.id)}
                  style={{
                    fontSize: 10, fontWeight: 500,
                    background: p.cover_color || '#6366f1',
                    color: '#fff', borderRadius: 3, padding: '2px 5px',
                    marginBottom: 2, cursor: 'pointer', overflow: 'hidden',
                    whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}
                  title={p.title}
                >
                  {p.title}
                </div>
              ))}

              {/* Tasks on this day */}
              {dayTasks.slice(0, 2).map(t => {
                const sc = STATUS_COLORS[t.status] || STATUS_COLORS.todo
                return (
                  <div
                    key={t.id}
                    style={{
                      fontSize: 10, background: sc.bg, color: sc.color,
                      borderRadius: 3, padding: '2px 5px', marginBottom: 2,
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      borderLeft: `2px solid ${sc.color}`,
                    }}
                    title={t.title}
                  >
                    ✓ {t.title}
                  </div>
                )
              })}

              {/* Overflow indicator */}
              {dayProjects.length + dayTasks.length > 4 && (
                <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>
                  +{dayProjects.length + dayTasks.length - 4} more
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.muted }}>
          <div style={{ width: 12, height: 8, borderRadius: 2, background: '#6366f1' }} />
          Projects (due date)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.muted }}>
          <div style={{ width: 12, height: 8, borderRadius: 2, background: '#eff6ff', border: '1px solid #2563eb' }} />
          Tasks (due date)
        </div>
      </div>
    </div>
  )
}
