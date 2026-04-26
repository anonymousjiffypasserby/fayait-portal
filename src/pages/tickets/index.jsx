import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { zammadApi, T, isAdmin, isAgent } from './shared'
import TicketSidebar  from './Sidebar'
import ListView       from './ListView'
import BoardView      from './BoardView'
import DetailPanel    from './DetailPanel'
import NewTicketModal from './NewTicketModal'

const POLL_INTERVAL = 60000

async function fetchView(view) {
  if (view.startsWith('search:')) return zammadApi.searchTickets(view.slice(7), 50)

  switch (view) {
    case 'my_all':      return zammadApi.getMyTickets(100)
    case 'my_open':     return zammadApi.getTicketsByState('open', 100).then(r => (r || []).filter(t => t.owner?.toLowerCase() !== '-'))
    case 'my_pending':  return zammadApi.getTicketsByState('pending reminder', 100)
    case 'my_closed':   return zammadApi.getTicketsByState('closed', 50)
    case 'all':         return zammadApi.getAllTickets(100)
    case 'unassigned':  return zammadApi.getUnassignedTickets(100)
    case 'overdue':     return zammadApi.getOverdueTickets(100)
    case 'by_priority': return zammadApi.getAllTickets(100).then(r => [...(r || [])].sort((a, b) => b.priority_id - a.priority_id))
    default:            return []
  }
}

async function fetchCounts(agentUser) {
  const views = ['my_all', 'my_open', 'my_pending', 'unassigned', 'overdue']
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
  const [counts, setCounts]       = useState({})
  const [newBanner, setNewBanner] = useState(0)

  const knownIds = useRef(new Set())
  const admin    = isAdmin(user)
  const agent    = isAgent(user)

  const load = useCallback(async (currentView, silent = false) => {
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
          {displayMode === 'board' ? (
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
    </div>
  )
}

function viewLabel(view) {
  if (view.startsWith('search:')) return `Search: "${view.slice(7)}"`
  const labels = {
    my_all:      'All My Tickets',
    my_open:     'Open',
    my_pending:  'Pending',
    my_closed:   'Closed',
    all:         'All Tickets',
    unassigned:  'Unassigned',
    overdue:     'Overdue',
    by_priority: 'By Priority',
  }
  return labels[view] || view
}
