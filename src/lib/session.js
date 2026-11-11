const TOKEN_KEY = 'kenken_token'
const USER_KEY = 'kenken_user'

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  const stored = window.localStorage.getItem(USER_KEY) || window.sessionStorage.getItem(USER_KEY)
  try { return stored ? JSON.parse(stored) : null } catch { return null }
}

export function storeUser(user) {
  const storage = window.localStorage.getItem(TOKEN_KEY) ? window.localStorage : window.sessionStorage
  storage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    storage.removeItem(TOKEN_KEY)
    storage.removeItem(USER_KEY)
  }
}

export function isOwner(user) {
  return user?.role === 'owner'
}
