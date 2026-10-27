import { useState } from 'react'
import Icon from '../components/Icon'
import api from '../lib/api'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { data } = await api.post('/login', {
        email,
        password,
        device_name: 'KEN-KEN Motor Web',
      })
      const storage = remember ? window.localStorage : window.sessionStorage
      window.localStorage.removeItem('kenken_token')
      window.sessionStorage.removeItem('kenken_token')
      window.localStorage.removeItem('kenken_user')
      window.sessionStorage.removeItem('kenken_user')
      storage.setItem('kenken_token', data.token)
      storage.setItem('kenken_user', JSON.stringify(data.user))
      if (data.user.role === 'owner') {
        window.location.assign('/dashboard')
      } else {
        setSuccess('Berhasil masuk sebagai ' + data.user.name + '. Dashboard ringkasan saat ini tersedia untuk owner.')
      }
    } catch (requestError) {
      const response = requestError.response?.data
      setError(
        response?.errors?.email?.[0]
        || response?.errors?.password?.[0]
        || response?.message
        || 'Tidak dapat terhubung ke server. Pastikan backend Laravel sedang berjalan.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-white text-[#18181a] lg:grid-cols-2">
      <section className="relative flex min-h-[560px] flex-col bg-[#18181a] px-7 pb-8 pt-8 text-white sm:px-12 lg:min-h-screen lg:px-[clamp(48px,5.5vw,100px)] lg:pb-12 lg:pt-12">
        <a className="flex w-fit items-center gap-3 text-[18px] font-semibold tracking-[-.04em]" href="/" aria-label="KEN-KEN Motor beranda">
          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#dfff00] text-black"><Icon name="wrench" className="h-[18px] w-[18px]" /></span>
          <span>KEN-KEN Motor</span>
        </a>
        <div className="my-auto py-16">
          <span className="inline-flex rounded-full bg-[#dfff00] px-3 py-1.5 text-[10px] font-semibold text-[#17180d]">Inventori · Bengkel · Laporan</span>
          <h1 className="mt-6 max-w-[540px] text-[clamp(2.4rem,4.2vw,3.8rem)] font-medium leading-[1.05] tracking-[-.065em]">Satu sistem untuk bengkel yang lebih tertata.</h1>
          <p className="mt-5 max-w-[500px] text-[15px] leading-[1.7] text-[#a4a3aa]">Kelola operasional harian KEN-KEN Motor dengan cepat, akurat, dan mudah dipahami tim.</p>
        </div>
        <div className="max-w-[500px] border-t border-[#45444b] pt-6 text-[13px] text-[#a4a3aa]">
          <p>“Sekarang stok dan work order tidak pernah tercecer lagi.”</p>
          <p className="mt-2 text-[10px] text-[#77767e]">Andi Setiawan · Pemilik Bengkel</p>
        </div>
      </section>

      <section className="flex min-h-[560px] items-center justify-center px-7 py-16 sm:px-12 lg:min-h-screen lg:px-16">
        <div className="w-full max-w-[400px]">
          <h2 className="text-[28px] font-medium tracking-[-.04em]">Selamat datang kembali</h2>
          <p className="mt-2 text-[12px] text-[#77767e]">Masuk untuk melanjutkan ke ruang kerja Anda.</p>
          <form className="mt-7" onSubmit={handleSubmit}>
            <label className="block text-[10px] font-medium" htmlFor="email">Email</label>
            <input className="mt-2 h-11 w-full rounded-xl border border-[#dedee2] bg-white px-4 text-[12px] outline-none transition placeholder:text-[#aaa9b0] focus:border-[#a7bd00] focus:ring-2 focus:ring-[#dfff00]/30" id="email" name="email" type="email" autoComplete="username" placeholder="andi@kenkenmotor.id" value={email} onChange={(event) => setEmail(event.target.value)} required />

            <label className="mt-4 block text-[10px] font-medium" htmlFor="password">Kata Sandi</label>
            <input className="mt-2 h-11 w-full rounded-xl border border-[#dedee2] bg-white px-4 text-[12px] outline-none transition focus:border-[#a7bd00] focus:ring-2 focus:ring-[#dfff00]/30" id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />

            <div className="mt-3 flex items-center justify-between text-[10px]">
              <label className="flex cursor-pointer items-center gap-2"><input className="h-[13px] w-[13px] accent-[#18181a]" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />Ingat saya</label>
              <a className="font-semibold hover:underline" href="mailto:admin@kenkenmotor.id?subject=Bantuan%20Kata%20Sandi">Lupa kata sandi?</a>
            </div>

            {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-relaxed text-red-700" role="alert">{error}</p>}
            {success && <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-[11px] leading-relaxed text-green-700" role="status">{success}</p>}
            <button className="mt-5 flex h-11 w-full items-center justify-center rounded-xl bg-[#18181a] text-[12px] font-semibold text-white transition hover:bg-[#343438] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={loading}>{loading ? 'Memeriksa...' : 'Masuk'}</button>
            <p className="mt-3 text-center text-[9px] text-[#a4a3aa]">Gunakan akun yang sudah terdaftar untuk masuk ke ruang kerja.</p>
          </form>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
