import { useEffect } from 'react'
import api from '../../services/api'

export function useAssetSSE(setAssets) {
  useEffect(() => {
    const url = api.getLiveUrl()
    const es = new EventSource(url)

    es.onmessage = (e) => {
      try {
        const patch = JSON.parse(e.data)
        if (!patch.id) return
        setAssets(prev =>
          prev.map(a => a.id === patch.id ? { ...a, ...patch } : a)
        )
      } catch {}
    }

    es.onerror = () => {
      // EventSource auto-reconnects; no action needed
    }

    return () => es.close()
  }, [setAssets])
}
