import { useState, useEffect, useCallback } from 'react'
import { zammadApi, T } from './shared'
import TicketSidebar from './Sidebar'
import TicketList from './TicketList'
import TicketDetail from './TicketDetail'
import NewTicketModal from './NewTicketModal'

const PAGE = 25

async function fetchTickets(view, page = 1) {
  const offset = (page - 1) * PAGE

  if (view === 'my_tickets') {
    return zammadApi.getMyTickets(PAGE, offset)
  }
  if (view === 'created_by_me') {
    return zammadApi.getTicketsCreatedByMe(PAGE, offset)
  }
  // Status views
  const stateMap = {
    new:     'new',
    open:    'open',
    pending: 'pending reminder',
    closed:  'closed',
  }
  const stateName = stateMap[view]
  if (stateName) {
    return zammadApi.getTicketsByState(stateName, PAGE, offset)
  }
  return []
}

export default function Tickets() {
  const [view, setView]           = useState('open')
  const [tickets, setTickets]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [showNew, setShowNew]     = useState(false)
  const [counts, setCounts]       = useState({})
  const [searchQuery, setSearchQuery] = useState(null)

  const loadTickets = useCallback(async (currentView, query) => {
    setLoading(true)
    try {
      let result
      if (query) {
        result = await zammadApi.searchTickets(query, 50)
      } else {
        result = await fetchTickets(currentView)
      }
      setTickets(Array.isArray(result) ? result : [])
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTickets(view, searchQuery)
  }, [view, searchQuery, loadTickets])

  // Load sidebar counts once on mount
  useEffect(() => {
    const views = ['my_tickets', 'created_by_me', 'new', 'open', 'pending', 'closed']
    Promise.all(views.map(v => fetchTickets(v).then(r => [v, Array.isArray(r) ? r.length : 0]).catch(() => [v, 0])))
      .then(entries => setCounts(Object.fromEntries(entries)))
      .catch(() => {})
  }, [])

  const handleView = (v) => {
    setSearchQuery(null)
    setSelectedId(null)
    setView(v)
  }

  const handleSearch = (q) => {
    setSearchQuery(q)
    setSelectedId(null)
  }

  const handleCreated = (ticket) => {
    setShowNew(false)
    setSelectedId(ticket.id)
    loadTickets(view, searchQuery)
  }

  const handleUpdated = () => {
    loadTickets(view, searchQuery)
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: T.bg, fontFamily: T.font }}>
      <TicketSidebar
        view={searchQuery ? null : view}
        counts={counts}
        onView={handleView}
        onNew={() => setShowNew(true)}
        onSearch={handleSearch}
      />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Title bar */}
        {!selectedId && (
          <div style={{
            padding: '14px 24px', background: T.card,
            borderBottom: `1px solid ${T.border}`, flexShrink: 0,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>
              {searchQuery
                ? `Search: "${searchQuery}"`
                : viewLabel(view)}
            </div>
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(null); loadTickets(view, null) }}
                style={{ marginTop: 4, background: 'none', border: 'none', color: '#6366f1', fontSize: 12, cursor: 'pointer', padding: 0 }}
              >
                ← Clear search
              </button>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {selectedId ? (
            <TicketDetail
              ticketId={selectedId}
              onBack={() => setSelectedId(null)}
              onUpdated={handleUpdated}
            />
          ) : (
            <TicketList
              tickets={tickets}
              loading={loading}
              onSelect={t => setSelectedId(t.id)}
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
  const labels = {
    my_tickets:    'My Tickets',
    created_by_me: 'Created by Me',
    new:           'New',
    open:          'Open',
    pending:       'Pending',
    closed:        'Closed',
  }
  return labels[view] || view
}
