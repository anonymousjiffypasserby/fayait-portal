import { useState } from 'react'
import ProjectCard from './ProjectCard'
import { T, STATUS_COLORS, STATUSES } from './shared'

const COL_WIDTH = 260

export default function BoardView({ projects, onCardClick, onStatusChange }) {
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = projects.filter(p => p.status === s)
    return acc
  }, {})

  const handleDrop = (status) => {
    if (dragId && dragId !== status) {
      const proj = projects.find(p => p.id === dragId)
      if (proj && proj.status !== status) onStatusChange(dragId, status)
    }
    setDragId(null)
    setOverCol(null)
  }

  return (
    <div style={{
      display: 'flex', gap: 14, padding: '20px 20px', overflowX: 'auto',
      height: '100%', alignItems: 'flex-start',
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
              width: COL_WIDTH, minWidth: COL_WIDTH, display: 'flex', flexDirection: 'column',
              background: isOver ? 'rgba(99,102,241,0.04)' : '#f8fafc',
              borderRadius: 12, border: `1.5px solid ${isOver ? '#6366f1' : T.border}`,
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px 10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0,
                }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.navy, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {c.label}
                </span>
              </div>
              <span style={{
                fontSize: 11, color: T.muted, background: 'rgba(0,0,0,0.06)',
                borderRadius: 8, padding: '1px 7px', fontWeight: 500,
              }}>
                {grouped[status].length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 10px 12px', minHeight: 60 }}>
              {grouped[status].map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  draggable
                  onDragStart={() => setDragId(p.id)}
                  onClick={() => onCardClick(p.id)}
                />
              ))}
              {grouped[status].length === 0 && (
                <div style={{
                  textAlign: 'center', padding: '20px 0', fontSize: 12,
                  color: T.muted, borderRadius: 8,
                  border: `2px dashed ${isOver ? '#6366f1' : 'rgba(0,0,0,0.08)'}`,
                }}>
                  Drop here
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
