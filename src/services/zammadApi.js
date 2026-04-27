const BASE = import.meta.env.VITE_API_URL || 'https://api.fayait.com'

const getToken = () => localStorage.getItem('faya_token')

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
})

const handle = async (res) => {
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) throw new Error('Zammad session expired — please log in again')
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

const qs = (params = {}) => {
  const s = new URLSearchParams(params).toString()
  return s ? '?' + s : ''
}

const zammadApi = {
  // ── Tickets ───────────────────────────────────────────────────────────────
  getTickets: (params = {}) =>
    fetch(`${BASE}/api/proxy/zammad/tickets${qs(params)}`, { headers: headers() }).then(handle),

  getTicket: (id) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/${id}`, { headers: headers() }).then(handle),

  createTicket: (data) =>
    fetch(`${BASE}/api/proxy/zammad/tickets`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  updateTicket: (id, data) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  // ── Articles (replies) ────────────────────────────────────────────────────
  getTicketArticles: (ticketId) =>
    fetch(`${BASE}/api/proxy/zammad/ticket_articles/by_ticket/${ticketId}`, { headers: headers() }).then(handle),

  createArticle: (data) =>
    fetch(`${BASE}/api/proxy/zammad/ticket_articles`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  // ── Organizations ─────────────────────────────────────────────────────────
  getOrganizations: (params = {}) =>
    fetch(`${BASE}/api/proxy/zammad/organizations${qs(params)}`, { headers: headers() }).then(handle),

  getOrganization: (id) =>
    fetch(`${BASE}/api/proxy/zammad/organizations/${id}`, { headers: headers() }).then(handle),

  // ── Users ─────────────────────────────────────────────────────────────────
  getUsers: (params = {}) =>
    fetch(`${BASE}/api/proxy/zammad/users${qs(params)}`, { headers: headers() }).then(handle),

  getCurrentUser: () =>
    fetch(`${BASE}/api/proxy/zammad/users/me`, { headers: headers() }).then(handle),

  // ── States / Priorities / Groups ──────────────────────────────────────────
  getTicketStates: () =>
    fetch(`${BASE}/api/proxy/zammad/ticket_states`, { headers: headers() }).then(handle),

  getTicketPriorities: () =>
    fetch(`${BASE}/api/proxy/zammad/ticket_priorities`, { headers: headers() }).then(handle),

  getGroups: () =>
    fetch(`${BASE}/api/proxy/zammad/groups`, { headers: headers() }).then(handle),

  // ── Tags ──────────────────────────────────────────────────────────────────
  getTicketTags: (ticketId) =>
    fetch(`${BASE}/api/proxy/zammad/tags${qs({ object: 'Ticket', o_id: ticketId })}`, { headers: headers() }).then(handle),

  addTicketTag: (ticketId, tag) =>
    fetch(`${BASE}/api/proxy/zammad/tags`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ object: 'Ticket', o_id: ticketId, item: tag }),
    }).then(handle),

  removeTicketTag: (ticketId, tag) =>
    fetch(`${BASE}/api/proxy/zammad/tags`, {
      method: 'DELETE', headers: headers(),
      body: JSON.stringify({ object: 'Ticket', o_id: ticketId, item: tag }),
    }).then(handle),

  // ── History ───────────────────────────────────────────────────────────────
  getTicketHistory: (ticketId) =>
    fetch(`${BASE}/api/proxy/zammad/ticket_history/${ticketId}`, { headers: headers() }).then(handle),

  // ── Ticket views ──────────────────────────────────────────────────────────
  getMyTickets: (limit = 25, offset = 0) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/search${qs({ query: 'owner.login:me OR customer.login:me', limit, offset })}`, { headers: headers() }).then(handle),

  getTicketsCreatedByMe: (limit = 25, offset = 0) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/search${qs({ query: 'customer.login:me', limit, offset })}`, { headers: headers() }).then(handle),

  getTicketsByState: (stateName, limit = 25, offset = 0) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/search${qs({ query: `state.name:"${stateName}"`, limit, offset })}`, { headers: headers() }).then(handle),

  getMyTicketsByState: (stateName, limit = 25, offset = 0) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/search${qs({ query: `(owner.login:me OR customer.login:me) AND state.name:"${stateName}"`, limit, offset })}`, { headers: headers() }).then(handle),

  getAllTickets: (limit = 25, offset = 0) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/search${qs({ query: 'state.name:new OR state.name:open OR state.name:"pending reminder" OR state.name:closed', limit, offset })}`, { headers: headers() }).then(handle),

  getUnassignedTickets: (limit = 25, offset = 0) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/search${qs({ query: 'owner.login:- AND (state.name:new OR state.name:open)', limit, offset })}`, { headers: headers() }).then(handle),

  getOverdueTickets: (limit = 25, offset = 0) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/search${qs({ query: 'escalation_at:<now AND state.name:open', limit, offset })}`, { headers: headers() }).then(handle),

  getClosedTickets: (limit = 25, offset = 0) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/search${qs({ query: 'state.name:closed', limit, offset })}`, { headers: headers() }).then(handle),

  getTicketsByPriority: (priorityId, limit = 25, offset = 0) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/search${qs({ query: `priority.id:${priorityId} AND (state.name:new OR state.name:open)`, limit, offset })}`, { headers: headers() }).then(handle),

  deleteTicket: (id) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/${id}`, { method: 'DELETE', headers: headers() }).then(handle),

  // ── Search ────────────────────────────────────────────────────────────────
  searchTickets: (query, limit = 50) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/search${qs({ query, limit })}`, { headers: headers() }).then(handle),

  getTicketCount: (query) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/search${qs({ query, limit: 1 })}`, { headers: headers() }).then(handle),

  // ── Attachments ───────────────────────────────────────────────────────────
  uploadAttachment: (file) => {
    const form = new FormData()
    form.append('file', file)
    const tok = localStorage.getItem('faya_token')
    return fetch(`${BASE}/api/proxy/zammad/attachments`, {
      method: 'POST',
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      body: form,
    }).then(handle)
  },

  // ── Knowledge Base ────────────────────────────────────────────────────────
  getKnowledgeBase: () =>
    fetch(`${BASE}/api/proxy/zammad/knowledge_bases`, { headers: headers() }).then(handle),

  getKnowledgeBaseAnswers: (kbId) =>
    fetch(`${BASE}/api/proxy/zammad/knowledge_base/${kbId}/locale/en/answers`, { headers: headers() }).then(handle),
}

export default zammadApi
