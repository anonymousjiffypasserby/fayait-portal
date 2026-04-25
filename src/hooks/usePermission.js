import { useAuth } from '../context/AuthContext'

const LEVELS = {
  view:   ['view', 'edit', 'admin'],
  edit:   ['edit', 'admin'],
  admin:  ['admin'],
  // action-specific aliases used by the permission matrix
  create:   ['edit', 'admin'],
  delete:   ['edit', 'admin'],
  checkout: ['edit', 'admin'],
  audit:    ['edit', 'admin'],
  approve:  ['edit', 'admin'],
  run:      ['edit', 'admin'],
  finalize: ['admin'],
  export:   ['edit', 'admin'],
  signoff:  ['admin'],
  invite:   ['edit', 'admin'],
  deactivate: ['admin'],
}

export function usePermission() {
  const { user, permissions } = useAuth()

  function hasPermission(module, action) {
    if (user?.role === 'admin') return true
    if (!permissions?.length) return false
    const perm = permissions.find(p => p.service === module)
    if (!perm) return false
    const allowed = LEVELS[action] ?? ['admin']
    return allowed.includes(perm.level)
  }

  return { hasPermission }
}
