const KEY = 'faya_ticket_settings'
const BASE = import.meta.env.VITE_API_URL || 'https://api.fayait.com'

export const SLA_PRIORITY_LABELS = { 1: 'Low', 2: 'Normal', 3: 'High', 4: 'Emergency' }

export const DEFAULTS = {
  slaHours: { 1: 24, 2: 8, 3: 4, 4: 1 },
  newBadgeHours: 24,
  predefinedTags: [],
  retentionClosedDays: null,
  deletionAfterMonths: null,
  privacyPolicyUrl: '',
  templates: [],  // [{ id, name, title, body, priority_id, categories }]
  macros: [],     // [{ id, name, actions: [{type, value}] }]
}

// In-memory cache — populated by loadTicketSettings(), read synchronously by getTicketSettings()
let _cache = null

function parseSettings(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS, slaHours: { ...DEFAULTS.slaHours } }
  return {
    slaHours: { ...DEFAULTS.slaHours, ...(raw.slaHours || {}) },
    newBadgeHours: raw.newBadgeHours ?? DEFAULTS.newBadgeHours,
    predefinedTags: Array.isArray(raw.predefinedTags) ? raw.predefinedTags : [],
    retentionClosedDays: raw.retentionClosedDays ?? DEFAULTS.retentionClosedDays,
    deletionAfterMonths: raw.deletionAfterMonths ?? DEFAULTS.deletionAfterMonths,
    privacyPolicyUrl: raw.privacyPolicyUrl ?? DEFAULTS.privacyPolicyUrl,
    templates: Array.isArray(raw.templates) ? raw.templates : [],
    macros: Array.isArray(raw.macros) ? raw.macros : [],
  }
}

// Synchronous read — uses in-memory cache, falls back to localStorage
export function getTicketSettings() {
  if (_cache) return _cache
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return parseSettings(JSON.parse(raw))
  } catch {}
  return parseSettings(null)
}

// Load from API + populate cache + localStorage
export async function loadTicketSettings() {
  try {
    const tok = localStorage.getItem('faya_token')
    const res = await fetch(`${BASE}/api/tickets/settings`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
    if (res.ok) {
      const data = await res.json()
      const parsed = parseSettings(data)
      _cache = parsed
      localStorage.setItem(KEY, JSON.stringify(parsed))
      return parsed
    }
  } catch {}
  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) { _cache = parseSettings(JSON.parse(raw)); return _cache }
  } catch {}
  _cache = parseSettings(null)
  return _cache
}

// Save to API + localStorage
export async function saveTicketSettings(settings) {
  _cache = settings
  localStorage.setItem(KEY, JSON.stringify(settings))
  try {
    const tok = localStorage.getItem('faya_token')
    await fetch(`${BASE}/api/tickets/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify(settings),
    })
  } catch {}
}
