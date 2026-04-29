import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { zammadApi, T, isAdmin, isAgent } from './shared'
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
    case 'my_all':      return zammadApi.getMyTickets(100)
    case 'my_open':     return zammadApi.getMyTicketsByState('open', 100)
    case 'my_pending':  return zammadApi.getMyTicketsByState('pending reminder', 100)
    case 'my_closed':   return zammadApi.getMyTicketsByState('closed', 50)
    case 'all':         return zammadApi.getAllTickets(100)
    case 'unassigned':  return zammadApi.getUnassignedTickets(100)
    case 'overdue':     return zammadApi.getOverdueTickets(100)
    case 'by_priority': return zammadApi.getAllTickets(100).then(r => [...(r || [])].sort((a, b) => b.priority_id - a.priority_id))
    case 'closed_team': return zammadApi.getClosedTickets(100)
    default:            return []
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
  const { user }                  = useAuth()
  const [view, setView]           = useState('my_open')
  const [displayMode, setMode]    = useState('list')
  const [tickets, setTickets]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [showNew, setShowNew]     = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [counts, setCounts]       = useState({})
  const [newBanner, setNewBanner] = useState(0)

  const knownIds = useRef(new Set())
  const admin    = isAdmin(user)
  const agent    = isAgent(user)

  const isReport = REPORT_VIEWS.has(view)

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

      // Zammad search results don't include tags — fetch them in background so
      // category / dept / contact columns populate after the list is visible.
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

  // Initial load + poll
  useEffect(() => {
    knownIds.current = new Set()
    setNewBanner(0)
    load(view)

    const timer = setInterval(() => load(view, true), POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [view, load])

  // Sidebar counts — load once, refresh after mutations
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

          {/* Detail panel overlay */}
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
