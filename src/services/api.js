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

  // ── Reference data ──────────────────────────────────────────────────────────

  getDepartments: () =>
    fetch(`${BASE}/api/departments`, { headers: headers() }).then(handle),

  createDepartment: (data) =>
    fetch(`${BASE}/api/departments`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),

  updateDepartment: (id, data) =>
    fetch(`${BASE}/api/departments/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(data) }).then(handle),

  deleteDepartment: (id) =>
    fetch(`${BASE}/api/departments/${id}`, { method: 'DELETE', headers: headers() }).then(handle),

  getManufacturers: () =>
    fetch(`${BASE}/api/manufacturers`, { headers: headers() }).then(handle),

  createManufacturer: (data) =>
    fetch(`${BASE}/api/manufacturers`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),

  updateManufacturer: (id, data) =>
    fetch(`${BASE}/api/manufacturers/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(data) }).then(handle),

  deleteManufacturer: (id) =>
    fetch(`${BASE}/api/manufacturers/${id}`, { method: 'DELETE', headers: headers() }).then(handle),

  getModels: (manufacturerId) =>
    fetch(`${BASE}/api/models${manufacturerId ? `?manufacturer_id=${manufacturerId}` : ''}`, { headers: headers() }).then(handle),

  createModel: (data) =>
    fetch(`${BASE}/api/models`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),

  updateModel: (id, data) =>
    fetch(`${BASE}/api/models/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(data) }).then(handle),

  deleteModel: (id) =>
    fetch(`${BASE}/api/models/${id}`, { method: 'DELETE', headers: headers() }).then(handle),

  getLocations: () =>
    fetch(`${BASE}/api/locations`, { headers: headers() }).then(handle),

  createLocation: (data) =>
    fetch(`${BASE}/api/locations`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),

  updateLocation: (id, data) =>
    fetch(`${BASE}/api/locations/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(data) }).then(handle),

  deleteLocation: (id) =>
    fetch(`${BASE}/api/locations/${id}`, { method: 'DELETE', headers: headers() }).then(handle),

  getSuppliers: () =>
    fetch(`${BASE}/api/suppliers`, { headers: headers() }).then(handle),

  createSupplier: (data) =>
    fetch(`${BASE}/api/suppliers`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),

  updateSupplier: (id, data) =>
    fetch(`${BASE}/api/suppliers/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(data) }).then(handle),

  deleteSupplier: (id) =>
    fetch(`${BASE}/api/suppliers/${id}`, { method: 'DELETE', headers: headers() }).then(handle),

  getCategories: (type) =>
    fetch(`${BASE}/api/categories${type ? `?type=${type}` : ''}`, { headers: headers() }).then(handle),

  createCategory: (data) =>
    fetch(`${BASE}/api/categories`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),

  updateCategory: (id, data) =>
    fetch(`${BASE}/api/categories/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(data) }).then(handle),

  deleteCategory: (id) =>
    fetch(`${BASE}/api/categories/${id}`, { method: 'DELETE', headers: headers() }).then(handle),

  // ── Assets ──────────────────────────────────────────────────────────────────

  getAssets: (retired = false) =>
    fetch(`${BASE}/api/assets${retired ? '?retired=true' : ''}`, { headers: headers() }).then(handle),

  createAsset: (data) =>
    fetch(`${BASE}/api/assets`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  updateAsset: (id, data) =>
    fetch(`${BASE}/api/assets/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  retireAsset: (id) =>
    fetch(`${BASE}/api/assets/${id}`, {
      method: 'DELETE',
      headers: headers()
    }).then(handle),

  restoreAsset: (id) =>
    fetch(`${BASE}/api/assets/${id}/restore`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({})
    }).then(handle),

  getAssetCommands: (id) =>
    fetch(`${BASE}/api/assets/${id}/commands`, { headers: headers() }).then(handle),

  sendAssetCommand: (id, command, payload = {}) =>
    fetch(`${BASE}/api/assets/${id}/commands`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ command, payload })
    }).then(handle),

  checkoutAsset: (id, data) =>
    fetch(`${BASE}/api/assets/${id}/checkout`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data)
    }).then(handle),

  checkinAsset: (id, data = {}) =>
    fetch(`${BASE}/api/assets/${id}/checkin`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data)
    }).then(handle),

  auditAsset: (id, data = {}) =>
    fetch(`${BASE}/api/assets/${id}/audit`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data)
    }).then(handle),

  cloneAsset: (id) =>
    fetch(`${BASE}/api/assets/${id}/clone`, {
      method: 'POST', headers: headers(), body: JSON.stringify({})
    }).then(handle),

  getAssetHistory: (id) =>
    fetch(`${BASE}/api/assets/${id}/history`, { headers: headers() }).then(handle),

  // ── Maintenance ──────────────────────────────────────────────────────────────

  getAssetMaintenance: (id) =>
    fetch(`${BASE}/api/assets/${id}/maintenance`, { headers: headers() }).then(handle),

  createMaintenance: (id, data) =>
    fetch(`${BASE}/api/assets/${id}/maintenance`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data)
    }).then(handle),

  updateMaintenance: (assetId, maintenanceId, data) =>
    fetch(`${BASE}/api/assets/${assetId}/maintenance/${maintenanceId}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data)
    }).then(handle),

  deleteMaintenance: (assetId, maintenanceId) =>
    fetch(`${BASE}/api/assets/${assetId}/maintenance/${maintenanceId}`, {
      method: 'DELETE', headers: headers()
    }).then(handle),

  getAllMaintenance: () =>
    fetch(`${BASE}/api/maintenance`, { headers: headers() }).then(handle),

  // ── Files ────────────────────────────────────────────────────────────────────

  getAssetFiles: (id) =>
    fetch(`${BASE}/api/assets/${id}/files`, { headers: headers() }).then(handle),

  uploadAssetFile: (id, formData) =>
    fetch(`${BASE}/api/assets/${id}/files`, {
      method: 'POST',
      headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: formData
    }).then(handle),

  deleteAssetFile: (assetId, fileId) =>
    fetch(`${BASE}/api/assets/${assetId}/files/${fileId}`, {
      method: 'DELETE', headers: headers()
    }).then(handle),

  getFileDownloadUrl: (assetId, fileId) =>
    `${BASE}/api/assets/${assetId}/files/${fileId}/download?token=${encodeURIComponent(localStorage.getItem('faya_token') || '')}`,

  // ── Network discovery ─────────────────────────────────────────────────────────

  getDiscovered: () =>
    fetch(`${BASE}/api/assets/discovered`, { headers: headers() }).then(handle),

  approveDiscovered: (id) =>
    fetch(`${BASE}/api/assets/discovered/${id}/approve`, {
      method: 'POST', headers: headers(), body: JSON.stringify({})
    }).then(handle),

  ignoreDiscovered: (id) =>
    fetch(`${BASE}/api/assets/discovered/${id}/ignore`, {
      method: 'POST', headers: headers(), body: JSON.stringify({})
    }).then(handle),

  getLiveUrl: () => `${BASE}/api/assets/live?token=${encodeURIComponent(localStorage.getItem('faya_token') || '')}`,

  // ── Accessories ───────────────────────────────────────────────────────────────

  getAccessories: (retired = false) =>
    fetch(`${BASE}/api/accessories${retired ? '?retired=true' : ''}`, { headers: headers() }).then(handle),

  getAccessory: (id) =>
    fetch(`${BASE}/api/accessories/${id}`, { headers: headers() }).then(handle),

  createAccessory: (data) =>
    fetch(`${BASE}/api/accessories`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),

  updateAccessory: (id, data) =>
    fetch(`${BASE}/api/accessories/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(data) }).then(handle),

  retireAccessory: (id) =>
    fetch(`${BASE}/api/accessories/${id}`, { method: 'DELETE', headers: headers() }).then(handle),

  restoreAccessory: (id) =>
    fetch(`${BASE}/api/accessories/${id}/restore`, { method: 'POST', headers: headers(), body: JSON.stringify({}) }).then(handle),

  checkoutAccessory: (id, data) =>
    fetch(`${BASE}/api/accessories/${id}/checkout`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),

  checkinAccessory: (id, data) =>
    fetch(`${BASE}/api/accessories/${id}/checkin`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),

  getAccessoryCheckouts: (id) =>
    fetch(`${BASE}/api/accessories/${id}/checkouts`, { headers: headers() }).then(handle),

  getAccessoryHistory: (id) =>
    fetch(`${BASE}/api/accessories/${id}/history`, { headers: headers() }).then(handle),

  createAnnouncement: (data) =>
    fetch(`${BASE}/api/admin/announcements`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  // ── Consumables ───────────────────────────────────────────────────────────────

  getConsumables: (retired = false) =>
    fetch(`${BASE}/api/consumables${retired ? '?retired=true' : ''}`, { headers: headers() }).then(handle),

  getConsumable: (id) =>
    fetch(`${BASE}/api/consumables/${id}`, { headers: headers() }).then(handle),

  createConsumable: (data) =>
    fetch(`${BASE}/api/consumables`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),

  updateConsumable: (id, data) =>
    fetch(`${BASE}/api/consumables/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(data) }).then(handle),

  retireConsumable: (id) =>
    fetch(`${BASE}/api/consumables/${id}`, { method: 'DELETE', headers: headers() }).then(handle),

  restoreConsumable: (id) =>
    fetch(`${BASE}/api/consumables/${id}/restore`, { method: 'POST', headers: headers(), body: JSON.stringify({}) }).then(handle),

  useConsumable: (id, data) =>
    fetch(`${BASE}/api/consumables/${id}/use`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(handle),

  getConsumableUses: (id) =>
    fetch(`${BASE}/api/consumables/${id}/uses`, { headers: headers() }).then(handle),
}

export default api

export const rolesApi = {
  getRoles: () =>
    fetch(`${BASE}/api/roles`, { headers: headers() }).then(handle),

  createRole: (data) =>
    fetch(`${BASE}/api/roles`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  updateRole: (id, data) =>
    fetch(`${BASE}/api/roles/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  deleteRole: (id) =>
    fetch(`${BASE}/api/roles/${id}`, {
      method: 'DELETE',
      headers: headers()
    }).then(handle),
}

export const departmentsApi = {
  getDepartments: () =>
    fetch(`${BASE}/api/departments`, { headers: headers() }).then(handle),

  createDepartment: (data) =>
    fetch(`${BASE}/api/departments`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  updateDepartment: (id, data) =>
    fetch(`${BASE}/api/departments/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  deleteDepartment: (id) =>
    fetch(`${BASE}/api/departments/${id}`, {
      method: 'DELETE',
      headers: headers()
    }).then(handle),
}
