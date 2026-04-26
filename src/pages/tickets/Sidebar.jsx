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

const MY_VIEWS = [
  { key: 'my_all',    label: 'All My Tickets', icon: '🎫' },
  { key: 'my_open',   label: 'Open',           icon: '🔵' },
  { key: 'my_pending',label: 'Pending',        icon: '🟡' },
  { key: 'my_closed', label: 'Closed',         icon: '⚫' },
]

const TEAM_VIEWS = [
  { key: 'all',         label: 'All Tickets',  icon: '📋' },
  { key: 'unassigned',  label: 'Unassigned',   icon: '❓' },
  { key: 'overdue',     label: 'Overdue',      icon: '🔴' },
  { key: 'by_priority', label: 'By Priority',  icon: '⚡' },
]

const REPORT_VIEWS = [
  { key: 'tk-overview',    label: 'Overview',            icon: '📊' },
  { key: 'tk-by-priority', label: 'By Priority',         icon: '🔢' },
  { key: 'tk-by-group',    label: 'By Group',            icon: '👥' },
  { key: 'tk-response',    label: 'Response Time',       icon: '⏱' },
  { key: 'tk-resolution',  label: 'Resolution Time',     icon: '✅' },
  { key: 'tk-agent-perf',  label: 'Agent Performance',   icon: '🏆' },
  { key: 'tk-sla',         label: 'SLA Compliance',      icon: '📋' },
  { key: 'tk-csat',        label: 'Customer Satisfaction',icon: '⭐' },
]

export default function TicketSidebar({ view, counts, onView, onNew, displayMode, onDisplayMode, isAgent, onOpenSettings }) {
  const [searchVal, setSearchVal] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchVal.trim()) onView('search:' + searchVal.trim())
  }

  const badge = (key) => {
    const n = counts[key]
    if (!n) return null
    return (
      <span style={{
        fontSize: 10, background: '#f1f5f9', borderRadius: 8,
        padding: '1px 6px', color: T.muted,
      }}>{n}</span>
    )
  }

  const isReport = view.startsWith('tk-')

  return (
    <div style={{
      width: T.sidebar, minWidth: T.sidebar, background: T.card,
      borderRight: `1px solid ${T.border}`, height: '100%',
      overflowY: 'auto', display: 'flex', flexDirection: 'column',
      fontFamily: T.font,
    }}>
      {/* New ticket */}
      <div style={{ padding: '14px 12px 10px' }}>
        <button onClick={onNew} style={{
          width: '100%', padding: '8px 0', borderRadius: 8,
          background: '#6366f1', color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.font,
        }}>
          + New Ticket
        </button>
      </div>

      {/* Search */}
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

      {/* View toggle — only show when not in a report */}
      {!isReport && (
        <div style={{ padding: '0 12px 10px', display: 'flex', gap: 4 }}>
          {['list', 'board'].map(mode => (
            <button key={mode} onClick={() => onDisplayMode(mode)} style={{
              flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 11, fontFamily: T.font,
              fontWeight: displayMode === mode ? 700 : 400,
              border: `1px solid ${displayMode === mode ? '#6366f1' : T.border}`,
              background: displayMode === mode ? '#eef2ff' : '#fafafa',
              color: displayMode === mode ? '#6366f1' : T.muted,
              cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {mode === 'list' ? '☰ List' : '⊞ Board'}
            </button>
          ))}
        </div>
      )}

      {/* My Tickets */}
      <div>
        <div style={sectionLabel}>My Tickets</div>
        {MY_VIEWS.map(({ key, label, icon }) => (
          <button key={key} style={navBtn(view === key)} onClick={() => onView(key)}>
            <span>{icon}</span>
            <span style={{ flex: 1 }}>{label}</span>
            {badge(key)}
          </button>
        ))}
      </div>

      {/* Team (agent/admin only) */}
      {isAgent && (
        <div>
          <div style={sectionLabel}>Team</div>
          {TEAM_VIEWS.map(({ key, label, icon }) => (
            <button key={key} style={navBtn(view === key)} onClick={() => onView(key)}>
              <span>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {badge(key)}
            </button>
          ))}
        </div>
      )}

      {/* Reports */}
      <div>
        <div style={sectionLabel}>Reports</div>
        {REPORT_VIEWS.map(({ key, label, icon }) => (
          <button key={key} style={navBtn(view === key)} onClick={() => onView(key)}>
            <span>{icon}</span>
            <span style={{ flex: 1 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Settings */}
      <div style={{ marginTop: 'auto', borderTop: `1px solid ${T.border}`, padding: '8px 12px' }}>
        <button onClick={onOpenSettings} style={{
          width: '100%', padding: '7px 12px', borderRadius: 7, fontSize: 12,
          border: `1px solid ${T.border}`, background: '#fafafa', color: T.muted,
          cursor: 'pointer', fontFamily: T.font, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>⚙</span> Ticket Settings
        </button>
      </div>
    </div>
  )
}
