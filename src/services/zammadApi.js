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
    fetch(`${BASE}/api/proxy/zammad/tickets/${id}?expand=true`, { headers: headers() }).then(handle),

  createTicket: (data) =>
    fetch(`${BASE}/api/proxy/zammad/tickets`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  updateTicket: (id, data) =>
    fetch(`${BASE}/api/proxy/zammad/tickets/${id}?expand=true`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  // ── Articles (replies) ────────────────────────────────────────────────────
  getTicketArticles: (ticketId) =>
    fetch(`${BASE}/api/proxy/zammad/ticket_articles/by_ticket/${ticketId}?expand=true`, { headers: headers() }).then(handle),

  // Returns raw Response (not parsed) for blob download
  downloadAttachment: (ticketId, articleId, attachmentId) =>
    fetch(`${BASE}/api/proxy/zammad/ticket_attachment/${ticketId}/${articleId}/${attachmentId}`, { headers: headers() }),

  createArticle: (data) =>
    fetch(`${BASE}/api/proxy/zammad/ticket_articles`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  updateArticle: (id, data) =>
    fetch(`${BASE}/api/proxy/zammad/ticket_articles/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  deleteArticle: (id) =>
    fetch(`${BASE}/api/proxy/zammad/ticket_articles/${id}`, {
      method: 'DELETE', headers: headers(),
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

  mergeTickets: (sourceId, targetId) =>
    fetch(`${BASE}/api/proxy/zammad/ticket_merge/${sourceId}/${targetId}`, { method: 'GET', headers: headers() }).then(handle),

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
  getKnowledgeBases: () =>
    fetch(`${BASE}/api/proxy/zammad/knowledge_bases`, { headers: headers() }).then(handle),

  createKnowledgeBase: (data) =>
    fetch(`${BASE}/api/proxy/zammad/knowledge_bases`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  getKBCategories: (kbId) =>
    fetch(`${BASE}/api/proxy/zammad/knowledge_bases/${kbId}/categories`, { headers: headers() }).then(handle),

  getKBAnswers: (kbId, locale = 'en-us') =>
    fetch(`${BASE}/api/proxy/zammad/knowledge_bases/${kbId}/locale/${locale}/answers`, { headers: headers() }).then(handle),

  searchKBAnswers: (kbId, query, locale = 'en-us') =>
    fetch(`${BASE}/api/proxy/zammad/knowledge_bases/${kbId}/locale/${locale}/answers/search${qs({ query, limit: 50 })}`, { headers: headers() }).then(handle),

  // ── Email Channels ─────────────────────────────────────────────────────────
  getEmailChannels: () =>
    fetch(`${BASE}/api/proxy/zammad/channels_email`, { headers: headers() }).then(handle),

  probeEmailChannel: (data) =>
    fetch(`${BASE}/api/proxy/zammad/channels_email_probe`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  setEmailChannelInbound: (data) =>
    fetch(`${BASE}/api/proxy/zammad/channels_email_inbound`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  setEmailChannelOutbound: (data) =>
    fetch(`${BASE}/api/proxy/zammad/channels_email_outbound`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  verifyEmailChannel: (data) =>
    fetch(`${BASE}/api/proxy/zammad/channels_email_verify`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  deleteEmailChannel: (id) =>
    fetch(`${BASE}/api/proxy/zammad/channels_email/${id}`, {
      method: 'DELETE', headers: headers(),
    }).then(handle),

  // ── Email Addresses ────────────────────────────────────────────────────────
  getEmailAddresses: () =>
    fetch(`${BASE}/api/proxy/zammad/email_addresses`, { headers: headers() }).then(handle),

  createEmailAddress: (data) =>
    fetch(`${BASE}/api/proxy/zammad/email_addresses`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  updateEmailAddress: (id, data) =>
    fetch(`${BASE}/api/proxy/zammad/email_addresses/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  deleteEmailAddress: (id) =>
    fetch(`${BASE}/api/proxy/zammad/email_addresses/${id}`, {
      method: 'DELETE', headers: headers(),
    }).then(handle),

  // ── Signatures ─────────────────────────────────────────────────────────────
  getSignatures: () =>
    fetch(`${BASE}/api/proxy/zammad/signatures`, { headers: headers() }).then(handle),

  createSignature: (data) =>
    fetch(`${BASE}/api/proxy/zammad/signatures`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  updateSignature: (id, data) =>
    fetch(`${BASE}/api/proxy/zammad/signatures/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  deleteSignature: (id) =>
    fetch(`${BASE}/api/proxy/zammad/signatures/${id}`, {
      method: 'DELETE', headers: headers(),
    }).then(handle),
}

export default zammadApi
