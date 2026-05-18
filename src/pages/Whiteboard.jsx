import { useState, useCallback } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useAuth } from '../context/AuthContext'

const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.07)', muted: '#888',
  orange: '#ff6b35', font: "'DM Sans', 'Helvetica Neue', sans-serif",
}

export default function Whiteboard() {
  const { user } = useAuth()
  const [boardName, setBoardName] = useState('Untitled Board')
  const [editing, setEditing] = useState(false)

  const handleSave = useCallback((elements, appState, files) => {
    const data = { elements, appState: { ...appState, collaborators: [] }, files }
    const key = `whiteboard_${user?.id}_${boardName}`
    localStorage.setItem(key, JSON.stringify(data))
  }, [user?.id, boardName])

  const initialData = (() => {
    try {
      const key = `whiteboard_${user?.id}_${boardName}`
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: T.font }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
        background: T.card, borderBottom: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 18 }}>✏️</span>
        {editing ? (
          <input
            autoFocus
            value={boardName}
            onChange={e => setBoardName(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={e => e.key === 'Enter' && setEditing(false)}
            style={{
              fontSize: 15, fontWeight: 600, color: T.navy, border: 'none',
              borderBottom: `2px solid ${T.orange}`, outline: 'none',
              background: 'transparent', fontFamily: T.font, width: 220,
            }}
          />
        ) : (
          <span
            onClick={() => setEditing(true)}
            style={{ fontSize: 15, fontWeight: 600, color: T.navy, cursor: 'text' }}
            title="Click to rename"
          >
            {boardName}
          </span>
        )}
        <span style={{ fontSize: 11, color: T.muted, marginLeft: 'auto' }}>
          Auto-saved locally
        </span>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Excalidraw
          initialData={initialData}
          onChange={handleSave}
          UIOptions={{
            canvasActions: { saveToActiveFile: false, loadScene: false, export: true },
          }}
        />
      </div>
    </div>
  )
}
