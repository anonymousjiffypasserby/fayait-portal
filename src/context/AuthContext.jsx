import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('faya_user')
    const token = localStorage.getItem('faya_token')
    if (stored && token) {
      const parsedUser = JSON.parse(stored)
      setUser(parsedUser)
      // Refresh services from API
      api.getCompanyConfig()
        .then(data => {
          const services = {}
          Object.entries(data.services).forEach(([k, v]) => {
            services[k] = v.status
          })
          const updated = { ...parsedUser, services }
          localStorage.setItem('faya_user', JSON.stringify(updated))
          setUser(updated)
        })
        .catch(() => {}) // fail silently, use cached data
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const data = await api.login(email, password)
    localStorage.setItem('faya_token', data.token)
    localStorage.setItem('faya_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('faya_token')
    localStorage.removeItem('faya_user')
    setUser(null)
  }

  const updateUser = (updates) => {
    const updated = { ...user, ...updates }
    localStorage.setItem('faya_user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
