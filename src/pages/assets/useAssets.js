import { useState, useCallback } from 'react'
import api from '../../services/api'

export function useAssets() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async (retired = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getAssets(retired)
      setAssets(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const createAsset = useCallback(async (data) => {
    const res = await api.createAsset(data)
    await load()
    return res
  }, [load])

  const updateAsset = useCallback(async (id, data) => {
    const res = await api.updateAsset(id, data)
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...data } : a))
    return res
  }, [])

  const retireAsset = useCallback(async (id) => {
    await api.retireAsset(id)
    setAssets(prev => prev.filter(a => a.id !== id))
  }, [])

  const checkoutAsset = useCallback(async (id, data) => {
    const res = await api.checkoutAsset(id, data)
    setAssets(prev => prev.map(a => a.id === id ? { ...a, checked_out_to: data.assigned_to } : a))
    return res
  }, [])

  const checkinAsset = useCallback(async (id) => {
    const res = await api.checkinAsset(id)
    setAssets(prev => prev.map(a => a.id === id ? { ...a, checked_out_to: null } : a))
    return res
  }, [])

  const cloneAsset = useCallback(async (id) => {
    const res = await api.cloneAsset(id)
    await load()
    return res
  }, [load])

  const auditAsset = useCallback(async (id, data) => {
    return api.auditAsset(id, data)
  }, [])

  const sendCommand = useCallback(async (id, command, payload = {}) => {
    return api.sendAssetCommand(id, command, payload)
  }, [])

  return {
    assets, setAssets, loading, error, load,
    createAsset, updateAsset, retireAsset,
    checkoutAsset, checkinAsset, cloneAsset, auditAsset, sendCommand,
  }
}
