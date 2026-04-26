import { useState } from 'react'
import { T } from './shared'

const navBtn = (active) => ({
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '7px 16px',
  border: 'none', borderRadius: 0, cursor: 'pointer',
  background: active ? 'rgba(99,102,241,0.08)' : 'transparent',
  borderLeft: active ? '2px solid #6366f1' : '2px solid transparent',
  color: active ? '#6366f1' : '#374151',
  fontSize: 13, textAlign: 'left', fontFamily: T.font,
})

const sectionLabel = {
  fontSize: 9, color: 'rgba(0,0,0,0.3)', letterSpacing: 1.5,
  textTransform: 'uppercase', padding: '14px 16px 4px', fontWeight: 600,
}

const VIEWS = [
  { section: 'My Work', items: [
    { key: 'my_tickets',    label: 'My Tickets',     icon: '🎫' },
    { key: 'created_by_me', label: 'Created by Me',  icon: '✏️' },
  ]},
  { section: 'Status', items: [
    { key: 'new',     label: 'New',     icon: '🟢' },
    { key: 'open',    label: 'Open',    icon: '🔵' },
    { key: 'pending', label: 'Pending', icon: '🟡' },
    { key: 'closed',  label: 'Closed',  icon: '⚫' },
  ]},
]

export default function TicketSidebar({ view, counts, onView, onNew, onSearch }) {
  const [searchVal, setSearchVal] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchVal.trim()) onSearch(searchVal.trim())
  }

  return (
    <div style={{
      width: T.sidebar, minWidth: T.sidebar, background: T.card,
      borderRight: `1px solid ${T.border}`, height: '100%',
      overflowY: 'auto', display: 'flex', flexDirection: 'column',
      fontFamily: T.font,
    }}>
      <div style={{ padding: '14px 12px 10px' }}>
        <button onClick={onNew} style={{
          width: '100%', padding: '8px 0', borderRadius: 8,
          background: '#6366f1', color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.font,
        }}>
          + New Ticket
        </button>
      </div>

      <form onSubmit={handleSearch} style={{ padding: '0 12px 10px' }}>
        <input
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          placeholder="Search tickets…"
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 6, boxSizing: 'border-box',
            border: `1px solid ${T.border}`, fontSize: 12, fontFamily: T.font,
            color: T.navy, background: '#fafafa', outline: 'none',
          }}
        />
      </form>

      {VIEWS.map(({ section, items }) => (
        <div key={section}>
          <div style={sectionLabel}>{section}</div>
          {items.map(({ key, label, icon }) => (
            <button key={key} style={navBtn(view === key)} onClick={() => onView(key)}>
              <span>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {counts[key] > 0 && (
                <span style={{
                  fontSize: 10, background: '#f1f5f9', borderRadius: 8,
                  padding: '1px 6px', color: T.muted,
                }}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
