import { usePermission } from '../hooks/usePermission'

export default function PermissionGate({ module, action, fallback = null, children }) {
  const { hasPermission } = usePermission()
  if (!hasPermission(module, action)) return fallback
  return children
}
