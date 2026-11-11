// Respons Laravel: { data: [...], meta: {...}, links: {...} } atau { data: {...} }.
export function rowsFrom(response) {
  const payload = response?.data ?? response
  const rows = payload?.data ?? payload
  return Array.isArray(rows) ? rows : []
}

export function objectFrom(response) {
  const payload = response?.data ?? response
  return payload?.data ?? payload ?? null
}

export function metaFrom(response) {
  return response?.data?.meta ?? null
}

export function errorMessage(error, fallback) {
  if (!error?.response) return 'Tidak bisa terhubung ke server. Pastikan backend Laravel sedang berjalan.'
  const { status, data } = error.response
  if (status === 403) return 'Akun ini tidak memiliki akses untuk tindakan tersebut.'
  return data?.message || fallback
}

export function fieldErrorsFrom(error) {
  const errors = error?.response?.data?.errors || {}
  return Object.fromEntries(Object.entries(errors).map(([key, messages]) => [key, messages?.[0] || 'Periksa kembali isian ini.']))
}

// Mengambil semua halaman sebuah endpoint daftar (per_page maksimal 100).
export async function fetchAll(api, url, params = {}) {
  const rows = []
  let page = 1
  let lastPage
  do {
    const response = await api.get(url, { params: { ...params, per_page: 100, page } })
    rows.push(...rowsFrom(response))
    lastPage = metaFrom(response)?.last_page || 1
    page += 1
  } while (page <= lastPage && page <= 20)
  return rows
}

// Cache sederhana untuk data referensi yang jarang berubah (kategori, supplier, user),
// supaya pindah halaman tidak mengulang request yang sama ke backend.
const cache = new Map()

export function cachedFetchAll(api, url, params = {}) {
  const key = `${url}?${JSON.stringify(params)}`
  if (!cache.has(key)) {
    const promise = fetchAll(api, url, params).catch((error) => { cache.delete(key); throw error })
    cache.set(key, promise)
  }
  return cache.get(key)
}

export function cachedGet(api, url) {
  if (!cache.has(url)) {
    const promise = api.get(url).catch((error) => { cache.delete(url); throw error })
    cache.set(url, promise)
  }
  return cache.get(url)
}

export function invalidateCache(prefix) {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key)
}
