const KEY = 'faya_ticket_settings'

export const SLA_PRIORITY_LABELS = { 1: 'Low', 2: 'Normal', 3: 'High', 4: 'Emergency' }

export const DEFAULTS = {
  slaHours: { 1: 24, 2: 8, 3: 4, 4: 1 },
  newBadgeHours: 24,
  predefinedTags: [],
  retentionClosedDays: null,   // auto-flag closed tickets after N days (null = off)
  deletionAfterMonths: null,   // flag for deletion after N months closed (null = off)
  privacyPolicyUrl: '',
}

export function getTicketSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      return {
        slaHours: { ...DEFAULTS.slaHours, ...(stored.slaHours || {}) },
        newBadgeHours: stored.newBadgeHours ?? DEFAULTS.newBadgeHours,
        predefinedTags: Array.isArray(stored.predefinedTags) ? stored.predefinedTags : [],
        retentionClosedDays: stored.retentionClosedDays ?? DEFAULTS.retentionClosedDays,
        deletionAfterMonths: stored.deletionAfterMonths ?? DEFAULTS.deletionAfterMonths,
        privacyPolicyUrl: stored.privacyPolicyUrl ?? DEFAULTS.privacyPolicyUrl,
      }
    }
  } catch {}
  return { ...DEFAULTS, slaHours: { ...DEFAULTS.slaHours } }
}

export function saveTicketSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings))
}
