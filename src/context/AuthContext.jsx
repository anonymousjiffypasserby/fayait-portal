import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [permissions, setPermissions] = useState([])
  const [zammadToken, setZammadToken] = useState(null)
  const [snipeToken, setSnipeToken]   = useState(null)
  const [jitsiToken, setJitsiToken]   = useState(null)
  const [jitsiUrl, setJitsiUrl]       = useState(null)
  const [serviceUrls, setServiceUrls] = useState({})
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    const stored       = localStorage.getItem('faya_user')
    const token        = localStorage.getItem('faya_token')
    const storedPerms  = localStorage.getItem('faya_permissions')
    const storedZammad = localStorage.getItem('faya_zammad_token')
    const storedSnipe  = localStorage.getItem('faya_snipe_token')
    const storedJitsi    = localStorage.getItem('faya_jitsi_token')
    const storedJitsiUrl = localStorage.getItem('faya_jitsi_url')
    const storedUrls     = localStorage.getItem('faya_service_urls')

    if (stored && token) {
      const parsedUser = JSON.parse(stored)
      setUser(parsedUser)
      if (storedPerms) {
        try { setPermissions(JSON.parse(storedPerms)) } catch {}
      }
      if (storedZammad) setZammadToken(storedZammad)
      if (storedSnipe)  setSnipeToken(storedSnipe)
      if (storedJitsi)    setJitsiToken(storedJitsi)
      if (storedJitsiUrl) setJitsiUrl(storedJitsiUrl)
      if (storedUrls) {
        try { setServiceUrls(JSON.parse(storedUrls)) } catch {}
      }

      // Refresh services + URLs from API
      api.getCompanyConfig()
        .then(data => {
          const services = {}
          Object.entries(data.services).forEach(([k, v]) => {
            services[k] = v.status
          })
          const urls = data.serviceUrls || {}
          localStorage.setItem('faya_service_urls', JSON.stringify(urls))
          setServiceUrls(urls)
          const updated = { ...parsedUser, services }
          localStorage.setItem('faya_user', JSON.stringify(updated))
          setUser(updated)
        })
        .catch(() => {})
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const data = await api.login(email, password)
    const { user, token, zammad_token, snipe_token, jitsi_token, jitsi_url, permissions: perms = [] } = data

    localStorage.setItem('faya_token', token)
    localStorage.setItem('faya_user', JSON.stringify(user))
    localStorage.setItem('faya_permissions', JSON.stringify(perms))
    localStorage.setItem('faya_zammad_token', zammad_token || '')
    localStorage.setItem('faya_snipe_token', snipe_token || '')
    localStorage.setItem('faya_jitsi_token', jitsi_token || '')
    localStorage.setItem('faya_jitsi_url', jitsi_url || '')

    setUser(user)
    setPermissions(perms)
    setZammadToken(zammad_token || null)
    setSnipeToken(snipe_token || null)
    setJitsiToken(jitsi_token || null)
    setJitsiUrl(jitsi_url || null)

    // Fetch service URLs before returning so they're set before the app renders post-login
    try {
      const cfg = await api.getCompanyConfig()
      const urls = cfg.serviceUrls || {}
      localStorage.setItem('faya_service_urls', JSON.stringify(urls))
      setServiceUrls(urls)
      const services = {}
      Object.entries(cfg.services || {}).forEach(([k, v]) => { services[k] = v.status })
      const updated = { ...user, services }
      localStorage.setItem('faya_user', JSON.stringify(updated))
      setUser(updated)
    } catch {}

    return user
  }

  const logout = () => {
    localStorage.removeItem('faya_token')
    localStorage.removeItem('faya_user')
    localStorage.removeItem('faya_permissions')
    localStorage.removeItem('faya_zammad_token')
    localStorage.removeItem('faya_snipe_token')
    localStorage.removeItem('faya_jitsi_token')
    localStorage.removeItem('faya_jitsi_url')
    localStorage.removeItem('faya_service_urls')
    setUser(null)
    setPermissions([])
    setZammadToken(null)
    setSnipeToken(null)
    setJitsiToken(null)
    setJitsiUrl(null)
    setServiceUrls({})
  }

  const updateUser = (updates) => {
    const updated = { ...user, ...updates }
    localStorage.setItem('faya_user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, permissions, login, logout, loading, updateUser, zammadToken, snipeToken, jitsiToken, jitsiUrl, serviceUrls }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
