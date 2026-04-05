const BASE = import.meta.env.VITE_API_URL || 'https://api.fayait.com'

const getToken = () => localStorage.getItem('faya_token')

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
})

const handle = async (res) => {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  login: (email, password) =>
    fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email, password })
    }).then(handle),

  changePassword: (currentPassword, newPassword) =>
    fetch(`${BASE}/api/auth/change-password`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ currentPassword, newPassword })
    }).then(handle),

  getCompanyConfig: () =>
    fetch(`${BASE}/api/companies/config`, { headers: headers() }).then(handle),

  getUsers: () =>
    fetch(`${BASE}/api/users`, { headers: headers() }).then(handle),

  createUser: (data) =>
    fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  updateUser: (id, data) =>
    fetch(`${BASE}/api/users/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  updateProfile: (data) =>
    fetch(`${BASE}/api/users/profile/me`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  getAdminCompanies: () =>
    fetch(`${BASE}/api/admin/companies`, { headers: headers() }).then(handle),

  createCompany: (data) =>
    fetch(`${BASE}/api/admin/companies`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  updateCompany: (id, data) =>
    fetch(`${BASE}/api/admin/companies/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  createCompanyUser: (companyId, data) =>
    fetch(`${BASE}/api/admin/companies/${companyId}/users`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  createAnnouncement: (data) =>
    fetch(`${BASE}/api/admin/announcements`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),
}

export default api
