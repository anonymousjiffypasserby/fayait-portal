import { useState, useRef } from 'react'
import { T } from './shared'

export default function MentionTextarea({ value, onChange, onKeyDown, placeholder, rows = 3, users = [], style }) {
  const [mentionQuery, setMentionQuery] = useState(null)
  const [mentionStart, setMentionStart] = useState(-1)
  const [hoverIdx, setHoverIdx]         = useState(0)
  const ref = useRef(null)

  const suggestions = mentionQuery !== null
    ? users.filter(u => u.name?.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : []

  const handleChange = (e) => {
    const text   = e.target.value
    const cursor = e.target.selectionStart
    const before = text.slice(0, cursor)
    const match  = before.match(/@(\w*)$/)
    if (match) {
      setMentionQuery(match[1])
      setMentionStart(cursor - match[0].length)
      setHoverIdx(0)
    } else {
      setMentionQuery(null)
    }
    onChange(e)
  }

  const insertMention = (user) => {
    const cursor = ref.current?.selectionStart ?? value.length
    const before = value.slice(0, mentionStart)
    const after  = value.slice(cursor)
    const next   = `${before}@${user.name} ${after}`
    onChange({ target: { value: next } })
    setMentionQuery(null)
    setTimeout(() => {
      if (!ref.current) return
      const pos = before.length + user.name.length + 2
      ref.current.focus()
      ref.current.setSelectionRange(pos, pos)
    }, 0)
  }

  const handleKeyDown = (e) => {
    if (mentionQuery !== null && suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHoverIdx(i => Math.min(i + 1, suggestions.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHoverIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Escape')    { setMentionQuery(null); return }
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        insertMention(suggestions[hoverIdx])
        return
      }
    }
    onKeyDown?.(e)
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        style={style}
      />
      {mentionQuery !== null && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0,
          background: '#fff', border: `1px solid ${T.border}`,
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          zIndex: 200, minWidth: 200, overflow: 'hidden', marginBottom: 4,
        }}>
          {suggestions.map((u, i) => (
            <div
              key={u.id}
              onMouseDown={e => { e.preventDefault(); insertMention(u) }}
              onMouseEnter={() => setHoverIdx(i)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                background: i === hoverIdx ? '#f1f5f9' : '#fff',
                color: T.navy, display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%', background: '#6366f1',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>
                {u.name?.charAt(0)?.toUpperCase()}
              </div>
              {u.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
