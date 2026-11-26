import axios from 'axios'

// Backend Laravel yang sudah di-deploy di Render. Bisa ditimpa lewat VITE_API_BASE_URL di file .env.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backend-compro.onrender.com/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  // Render (free tier) butuh sekitar 30–50 detik untuk bangun dari mode tidur.
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem('kenken_token')
    || window.sessionStorage.getItem('kenken_token')

  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api