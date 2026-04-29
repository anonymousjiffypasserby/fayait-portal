import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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

// ── Master fetch ────────────────────────────────────────────────────────────
// Fetches all ticket states in two parallel requests, returns a flat array.
async function fetchAllTickets() {
  const [active, closed] = await Promise.all([
    zammadApi.searchTickets(
      'state.name:new OR state.name:open OR state.name:"pending reminder"', 200
    ).catch(() => []),
    zammadApi.searchTickets('state.name:closed', 100).catch(() => []),
  ])
  return [
    ...(Array.isArray(active) ? active : []),
    ...(Array.isArray(closed) ? closed : []),
  ]
}

// Batch-fetch tags for every ticket and merge into each ticket object.
// Run AFTER the list is already visible so tags fill in without blocking.
async function enrichWithTags(tickets) {
  const results = await Promise.allSettled(tickets.map(t => zammadApi.getTicketTags(t.id)))
  return tickets.map((t, i) => ({
    ...t,
    tags: results[i]?.status === 'fulfilled' ? (results[i].value?.tags || []) : (t.tags || []),
  }))
}

// Derive all sidebar views from a flat ticket array.
// meId: the Zammad user ID of the current agent (null → "My" = all).
function deriveViews(all, meId) {
  const isMine = (t) => meId != null && Number(t.owner_id) === Number(meId)
  const active  = (t) => t.state !== 'closed'

  const my_all     = meId != null ? all.filter(isMine) : all
  const my_open    = meId != null ? all.filter(t => isMine(t) && t.state === 'open')
                                  : all.filter(t => t.state === 'open')
  const my_pending = meId != null ? all.filter(t => isMine(t) && t.state === 'pending reminder')
                                  : all.filter(t => t.state === 'pending reminder')
  const my_closed  = meId != null ? all.filter(t => isMine(t) && t.state === 'closed')
                                  : all.filter(t => t.state === 'closed')

  return {
    my_all,
    my_open,
    my_pending,
    my_closed,
    all,
    unassigned:  all.filter(t => active(t) && (!t.owner || t.owner === '-')),
    overdue:     all.filter(t => { const s = slaStatus(t); return s && s.remaining < 0 }),
    by_priority: [...all.filter(active)].sort((a, b) => (b.priority_id || 0) - (a.priority_id || 0)),
    closed_team: all.filter(t => t.state === 'closed'),
  }
}

export default function Tickets() {
  const { user } = useAuth()

  const [view,         setView]         = useState('my_open')
  const [displayMode,  setMode]         = useState('list')
  const [cache,        setCache]        = useState(null) // null = first load in progress
  const [selectedId,   setSelectedId]   = useState(null)
  const [showNew,      setShowNew]      = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newBanner,    setNewBanner]    = useState(0)
  // Live search is kept separate — not cached
  const [searchRows,   setSearchRows]   = useState([])
  const [searchLoading,setSearchLoading]= useState(false)

  const admin        = isAdmin(user)
  const agent        = isAgent(user)
  const isReport     = REPORT_VIEWS.has(view)
  const isSearch     = view.startsWith('search:')

  const zammadMeRef  = useRef(null)   // Zammad user ID of the current agent
  const knownIds     = useRef(new Set())

  // ── Core refresh ─────────────────────────────────────────────────────────
  // Phase 1: fetch tickets → update cache immediately (no tags yet)
  // Phase 2: fetch tags in background → update cache silently
  const doRefresh = useCallback(async ({ detectNew = false } = {}) => {
    const me = zammadMeRef.current

    // Phase 1 — tickets without tags
    const raw = await fetchAllTickets()

    if (detectNew && knownIds.current.size > 0) {
      const count = raw.filter(t => !knownIds.current.has(t.id)).length
      if (count > 0) setNewBanner(n => n + count)
    }
    knownIds.current = new Set(raw.map(t => t.id))

    setCache(deriveViews(raw, me))

    // Phase 2 — tags fill in (runs after the list is already visible)
    const enriched = await enrichWithTags(raw)
    setCache(deriveViews(enriched, me))
  }, [])

  // ── Initial mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function init() {
      // Resolve who the current agent is in Zammad
      const me = await zammadApi.getCurrentUser().catch(() => null)
      if (cancelled) return
      if (me?.id) zammadMeRef.current = me.id

      await doRefresh()
    }
    init()

    // Background poll
    const timer = setInterval(() => doRefresh({ detectNew: true }), POLL_INTERVAL)
    return () => { cancelled = true; clearInterval(timer) }
  }, [doRefresh])

  // ── Live search (separate from cache) ────────────────────────────────────
  useEffect(() => {
    if (!isSearch) { setSearchRows([]); return }
    setSearchLoading(true)
    zammadApi.searchTickets(view.slice(7), 50)
      .then(r => setSearchRows(Array.isArray(r) ? r : []))
      .catch(() => setSearchRows([]))
      .finally(() => setSearchLoading(false))
  }, [view, isSearch])

  // ── Close panel on outside click / Escape ────────────────────────────────
  useEffect(() => {
    if (!selectedId) return
    const onMouse = (e) => {
      const panel = document.getElementById('ticket-detail-panel')
      if (panel && !panel.contains(e.target)) setSelectedId(null)
    }
    const onKey = (e) => { if (e.key === 'Escape') setSelectedId(null) }
    document.addEventListener('mousedown', onMouse)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      window.removeEventListener('keydown', onKey)
    }
  }, [selectedId])

  // ── Derived data ─────────────────────────────────────────────────────────
  const tickets = isSearch ? searchRows
                : isReport ? []
                : (cache ? (cache[view] || []) : [])

  const loading = isSearch ? searchLoading
                : isReport ? false
                : cache === null  // only true on very first load

  // Sidebar counts always come from cache — no extra requests needed
  const counts = useMemo(() => {
    if (!cache) return {}
    return Object.fromEntries(
      Object.entries(cache).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
    )
  }, [cache])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleView = (v) => {
    setSelectedId(null)
    setNewBanner(0)
    setView(v)
  }

  const handleCreated = (ticket) => {
    setShowNew(false)
    setSelectedId(ticket.id)
    // Immediately refresh — silently updates the list so the new ticket appears
    doRefresh()
  }

  const handleUpdated = () => {
    doRefresh()
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
          {isSearch && (
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
    my_open:         'My Open',
    my_pending:      'My Pending',
    my_closed:       'My Closed',
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
