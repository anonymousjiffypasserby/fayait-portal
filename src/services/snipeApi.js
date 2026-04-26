const BASE = import.meta.env.VITE_API_URL || 'https://api.fayait.com'

const getToken = () => localStorage.getItem('faya_token')

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
})

const handle = async (res) => {
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) throw new Error('Snipe-IT session expired — please log in again')
  if (!res.ok) throw new Error(data.messages || data.error || `Request failed (${res.status})`)
  return data
}

const qs = (params = {}) => {
  const s = new URLSearchParams(params).toString()
  return s ? '?' + s : ''
}

const snipeApi = {
  // ── Hardware (assets) ─────────────────────────────────────────────────────
  getAssets: (params = {}) =>
    fetch(`${BASE}/api/proxy/snipe/hardware${qs(params)}`, { headers: headers() }).then(handle),

  getAsset: (id) =>
    fetch(`${BASE}/api/proxy/snipe/hardware/${id}`, { headers: headers() }).then(handle),

  checkoutAsset: (id, data) =>
    fetch(`${BASE}/api/proxy/snipe/hardware/${id}/checkout`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  checkinAsset: (id, data) =>
    fetch(`${BASE}/api/proxy/snipe/hardware/${id}/checkin`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    }).then(handle),

  // ── Users ─────────────────────────────────────────────────────────────────
  getUsers: (params = {}) =>
    fetch(`${BASE}/api/proxy/snipe/users${qs(params)}`, { headers: headers() }).then(handle),

  getUser: (id) =>
    fetch(`${BASE}/api/proxy/snipe/users/${id}`, { headers: headers() }).then(handle),

  // ── Departments ───────────────────────────────────────────────────────────
  getDepartments: (params = {}) =>
    fetch(`${BASE}/api/proxy/snipe/departments${qs(params)}`, { headers: headers() }).then(handle),

  // ── Locations ─────────────────────────────────────────────────────────────
  getLocations: (params = {}) =>
    fetch(`${BASE}/api/proxy/snipe/locations${qs(params)}`, { headers: headers() }).then(handle),

  // ── Models ────────────────────────────────────────────────────────────────
  getModels: (params = {}) =>
    fetch(`${BASE}/api/proxy/snipe/models${qs(params)}`, { headers: headers() }).then(handle),

  // ── Manufacturers ─────────────────────────────────────────────────────────
  getManufacturers: (params = {}) =>
    fetch(`${BASE}/api/proxy/snipe/manufacturers${qs(params)}`, { headers: headers() }).then(handle),

  // ── Categories ────────────────────────────────────────────────────────────
  getCategories: (params = {}) =>
    fetch(`${BASE}/api/proxy/snipe/categories${qs(params)}`, { headers: headers() }).then(handle),
}

export default snipeApi
