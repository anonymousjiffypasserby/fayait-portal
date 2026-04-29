import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { zammadApi, T, isAdmin, isAgent, slaStatus } from './shared'
import TicketSidebar       from './Sidebar'
import ListView            from './ListView'
import BoardView           from './BoardView'
import DetailPanel         from './DetailPanel'
import NewTicketModal      from './NewTicketModal'
import TicketSettingsModal from './TicketSettingsModal'
import TicketReports       from '../reports/TicketReports'

const POLL_INTERVAL = 60000

const REPORT_VIEWS = new Set([
  'tk-overview', 'tk-by-priority', 'tk-by-group',
  'tk-response', 'tk-resolution', 'tk-agent-perf', 'tk-sla', 'tk-csat',
])

async function fetchView(view) {
  if (REPORT_VIEWS.has(view)) return []
  if (view.startsWith('search:')) return zammadApi.searchTickets(view.slice(7), 50)

  switch (view) {
    // "My" views: in a single-tenant company portal all visible tickets are the
    // company's. Filtering by Zammad user isn't reliable because the proxy may use
    // a shared service-account token, making owner.login:"me" return 0 results.
    case 'my_all':     return zammadApi.getAllTickets(100)
    case 'my_open':    return zammadApi.searchTickets('state.name:"open"', 100)
    case 'my_pending': return zammadApi.searchTickets('state.name:"pending reminder"', 100)
    case 'my_closed':  return zammadApi.searchTickets('state.name:"closed"', 50)

    case 'all':        return zammadApi.getAllTickets(100)

    case 'unassigned': {
      const rows = await zammadApi.searchTickets(
        'state.name:new OR state.name:open OR state.name:"pending reminder"', 200
      ).catch(() => [])
      return (Array.isArray(rows) ? rows : []).filter(t => !t.owner || t.owner === '-')
    }

    case 'overdue': {
      // Use the same slaStatus() logic as the SLA column — this handles both
      // Zammad-configured escalation_at AND our computed fallback deadline.
      const rows = await zammadApi.searchTickets(
        'state.name:new OR state.name:open OR state.name:"pending reminder"', 200
      ).catch(() => [])
      return (Array.isArray(rows) ? rows : []).filter(t => {
        const sla = slaStatus(t)
        return sla && sla.remaining < 0
      })
    }

    case 'by_priority':
      return zammadApi.getAllTickets(100).then(r => [...(r || [])].sort((a, b) => b.priority_id - a.priority_id))

    case 'closed_team':
      return zammadApi.getClosedTickets(100)

    default:
      return []
  }
}

async function fetchCounts() {
  const views = ['my_all', 'my_open', 'my_pending', 'my_closed', 'all', 'unassigned', 'overdue', 'closed_team']
  const results = await Promise.allSettled(views.map(v => fetchView(v)))
  return Object.fromEntries(views.map((v, i) => [
    v,
    results[i].status === 'fulfilled' ? (Array.isArray(results[i].value) ? results[i].value.length : 0) : 0,
  ]))
}

export default function Tickets() {
  const { user }                    = useAuth()
  const [view, setView]             = useState('my_open')
  const [displayMode, setMode]      = useState('list')
  const [tickets, setTickets]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [showNew, setShowNew]       = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [counts, setCounts]         = useState({})
  const [newBanner, setNewBanner]   = useState(0)

  const knownIds = useRef(new Set())
  const admin    = isAdmin(user)
  const agent    = isAgent(user)

  const isReport = REPORT_VIEWS.has(view)

  // Close detail panel when clicking outside of it (mousedown fires before click,
  // so a click on a ticket row still opens the ticket after this closes the current one)
  useEffect(() => {
    if (!selectedId) return
    const handle = (e) => {
      const panel = document.getElementById('ticket-detail-panel')
      if (panel && !panel.contains(e.target)) setSelectedId(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [selectedId])

  // Also close on Escape
  useEffect(() => {
    if (!selectedId) return
    const handle = (e) => { if (e.key === 'Escape') setSelectedId(null) }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [selectedId])

  const load = useCallback(async (currentView, silent = false) => {
    if (REPORT_VIEWS.has(currentView)) return
    if (!silent) setLoading(true)
    try {
      const result = await fetchView(currentView)
      const rows = Array.isArray(result) ? result : []

      if (silent && knownIds.current.size > 0) {
        const newOnes = rows.filter(t => !knownIds.current.has(t.id))
        if (newOnes.length > 0) setNewBanner(n => n + newOnes.length)
      }

      knownIds.current = new Set(rows.map(t => t.id))
      setTickets(rows)

      // Zammad search results don't include tags — fetch them in the background so
      // Category / Dept / Customer columns populate after the list appears.
      Promise.allSettled(rows.map(t => zammadApi.getTicketTags(t.id))).then(results => {
        const tagMap = {}
        rows.forEach((t, i) => {
          if (results[i]?.status === 'fulfilled') tagMap[t.id] = results[i].value?.tags || []
        })
        setTickets(prev => prev.map(t =>
          tagMap[t.id] !== undefined ? { ...t, tags: tagMap[t.id] } : t
        ))
      }).catch(() => {})
    } catch {
      if (!silent) setTickets([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    knownIds.current = new Set()
    setNewBanner(0)
    load(view)
    const timer = setInterval(() => load(view, true), POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [view, load])

  const refreshCounts = useCallback(() => {
    fetchCounts().then(setCounts).catch(() => {})
  }, [])

  useEffect(() => { refreshCounts() }, [refreshCounts])

  const handleView = (v) => {
    setSelectedId(null)
    setNewBanner(0)
    setView(v)
  }

  const handleCreated = (ticket) => {
    setShowNew(false)
    setSelectedId(ticket.id)
    load(view)
    refreshCounts()
  }

  const handleUpdated = () => {
    load(view, true)
    refreshCounts()
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: T.bg, fontFamily: T.font, position: 'relative', overflow: 'hidden' }}>
      <TicketSidebar
        view={view}
        counts={counts}
        onView={handleView}
        onNew={() => setShowNew(true)}
        displayMode={displayMode}
        onDisplayMode={setMode}
        isAgent={agent}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {/* Page title */}
        <div style={{
          padding: '12px 20px', background: T.card,
          borderBottom: `1px solid ${T.border}`, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>
            {viewLabel(view)}
          </div>
          {view.startsWith('search:') && (
            <button
              onClick={() => handleView('my_open')}
              style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 12, cursor: 'pointer', padding: 0 }}
            >
              ← Clear search
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {isReport ? (
            <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <TicketReports view={view} />
            </div>
          ) : displayMode === 'board' ? (
            <BoardView
              tickets={tickets}
              onSelect={t => setSelectedId(t.id)}
              onTicketUpdated={handleUpdated}
            />
          ) : (
            <ListView
              tickets={tickets}
              loading={loading}
              onSelect={t => setSelectedId(t.id)}
              isAdmin={admin}
              newBanner={newBanner}
              onDismissBanner={() => setNewBanner(0)}
            />
          )}

          {selectedId && (
            <DetailPanel
              ticketId={selectedId}
              onClose={() => setSelectedId(null)}
              onUpdated={handleUpdated}
              isAdmin={admin}
              isAgent={agent}
            />
          )}
        </div>
      </div>

      {showNew && (
        <NewTicketModal
          onCreated={handleCreated}
          onClose={() => setShowNew(false)}
        />
      )}

      {showSettings && (
        <TicketSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

function viewLabel(view) {
  if (view.startsWith('search:')) return `Search: "${view.slice(7)}"`
  const labels = {
    my_all:          'All My Tickets',
    my_open:         'Open',
    my_pending:      'Pending',
    my_closed:       'Closed',
    all:             'All Tickets',
    unassigned:      'Unassigned',
    overdue:         'Overdue',
    by_priority:     'By Priority',
    closed_team:     'Closed',
    'tk-overview':   'Reports — Overview',
    'tk-by-priority':'Reports — By Priority',
    'tk-by-group':   'Reports — By Group',
    'tk-response':   'Reports — Response Time',
    'tk-resolution': 'Reports — Resolution Time',
    'tk-agent-perf': 'Reports — Agent Performance',
    'tk-sla':        'Reports — SLA Compliance',
    'tk-csat':       'Reports — Customer Satisfaction',
  }
  return labels[view] || view
}
