import { useSyncExternalStore } from 'react'

// Router ringan berbasis History API, supaya tidak perlu dependensi baru.
const NAVIGATE_EVENT = 'kenken:navigate'

function subscribe(callback) {
  window.addEventListener('popstate', callback)
  window.addEventListener(NAVIGATE_EVENT, callback)
  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener(NAVIGATE_EVENT, callback)
  }
}

function getLocationKey() {
  return window.location.pathname + window.location.search
}

export function navigate(to, { replace = false } = {}) {
  if (to === getLocationKey()) return
  if (replace) window.history.replaceState({}, '', to)
  else window.history.pushState({}, '', to)
  window.scrollTo({ top: 0 })
  window.dispatchEvent(new Event(NAVIGATE_EVENT))
}

export function useLocation() {
  const key = useSyncExternalStore(subscribe, getLocationKey)
  const url = new URL(key, window.location.origin)
  return { pathname: url.pathname.replace(/\/+$/, '') || '/', search: url.searchParams }
}

// Mencocokkan pola seperti "/procurement/purchase-orders/:id" dan mengembalikan params.
export function matchPath(pattern, pathname) {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return null
  const params = {}
  for (let index = 0; index < patternParts.length; index += 1) {
    const part = patternParts[index]
    if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(pathParts[index])
    else if (part !== pathParts[index]) return null
  }
  return params
}
