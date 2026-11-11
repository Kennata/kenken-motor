import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import { errorMessage, metaFrom, rowsFrom } from '../lib/apiHelpers'
import { clearSession } from '../lib/session'

export function handleUnauthorized(error) {
  if (error?.response?.status !== 401) return false
  clearSession()
  window.location.replace('/login')
  return true
}

// Mengambil endpoint daftar berpaginasi. Parameter kosong ('' / null) tidak dikirim.
export function useResourceList(url, params = {}, { enabled = true } = {}) {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState('')
  const requestId = useRef(0)
  const paramsKey = JSON.stringify(params)

  const load = useCallback(async () => {
    if (!enabled) return
    const id = requestId.current + 1
    requestId.current = id
    setLoading(true)
    setError('')
    const cleanParams = Object.fromEntries(Object.entries(JSON.parse(paramsKey)).filter(([, value]) => value !== '' && value !== null && value !== undefined))
    try {
      const response = await api.get(url, { params: cleanParams })
      if (requestId.current !== id) return
      setRows(rowsFrom(response))
      setMeta(metaFrom(response))
    } catch (requestError) {
      if (requestId.current !== id || handleUnauthorized(requestError)) return
      setError(errorMessage(requestError, 'Data gagal dimuat dari server.'))
    } finally {
      if (requestId.current === id) setLoading(false)
    }
  }, [url, paramsKey, enabled])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  return { rows, meta, loading, error, reload: load }
}

export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}
