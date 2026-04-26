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
}

export default zammadApi
