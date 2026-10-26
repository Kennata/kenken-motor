import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import api from '../lib/api'
import AddSparePartModal from '../features/inventory/AddSparePartModal'

function resourceRows(value) {
  const rows = value?.data ?? value
  return Array.isArray(rows) ? rows : []
}

function resourceObject(value) {
  return value?.data ?? value ?? null
}

function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(Number(value || 0))
}

function formatRupiah(value) {
  const amount = Number(value || 0)
  if (amount >= 1000000) {
    return `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(amount / 1000000)} jt`
  }
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`
}

function SidebarAccordion({ id, title, icon, items, isOpen, onToggle }) {
  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={isOpen} aria-controls={`sidebar-${id}`} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-white/5 hover:text-white">
        {icon === 'shipping' ? <span className="w-5 text-center">▱</span> : icon === 'settings' ? <span className="w-5 text-center">⚙</span> : <Icon name={icon} />}
        <span>{title}</span>
        <span aria-hidden="true" className={`ml-auto text-[11px] transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>⌄</span>
      </button>
      <div id={`sidebar-${id}`} aria-hidden={!isOpen} className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className={`space-y-1 pl-[48px] text-[11px] text-[#77767e] transition-transform duration-300 ${isOpen ? 'translate-y-0' : '-translate-y-2'}`}>
            {items.map((item) => <p key={item} tabIndex={isOpen ? 0 : -1} className="py-2">{item}</p>)}
          </div>
        </div>
      </div>
    </div>
  )
}
function DashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [user, setUser] = useState(() => {
    const stored = window.localStorage.getItem('kenken_user') || window.sessionStorage.getItem('kenken_user')
    try { return stored ? JSON.parse(stored) : null } catch { return null }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [isAddSparePartOpen, setIsAddSparePartOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState({ inventory: true, procurement: false, bengkel: true, shipping: false, reports: false, settings: false })

  function toggleMenu(menu) {
    setOpenMenus((current) => ({ ...current, [menu]: !current[menu] }))
  }

  async function loadDashboard() {
    setLoading(true)
    setError('')
    try {
      const [dashboardResponse, userResponse] = await Promise.all([api.get('/dashboard'), api.get('/user')])
      setDashboard(dashboardResponse.data?.data ?? dashboardResponse.data)
      setUser(userResponse.data?.data ?? userResponse.data)
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        window.localStorage.removeItem('kenken_token')
        window.sessionStorage.removeItem('kenken_token')
        window.localStorage.removeItem('kenken_user')
        window.sessionStorage.removeItem('kenken_user')
        window.location.replace('/login')
        return
      }
      setError(requestError.response?.data?.message || 'Data dashboard gagal dimuat. Pastikan backend berjalan dan akun memiliki akses owner.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = window.localStorage.getItem('kenken_token') || window.sessionStorage.getItem('kenken_token')
    if (!token) {
      window.location.replace('/login')
      return
    }
    window.setTimeout(loadDashboard, 0)
  }, [])

  async function handleLogout() {
    try { await api.post('/logout') } catch { /* token tetap dihapus bila server sedang tidak tersedia */ }
    window.localStorage.removeItem('kenken_token')
    window.sessionStorage.removeItem('kenken_token')
    window.localStorage.removeItem('kenken_user')
    window.sessionStorage.removeItem('kenken_user')
    window.location.assign('/login')
  }

  const lowStock = resourceRows(dashboard?.low_stock_parts)
  const movements = resourceRows(dashboard?.recent_movements)
  const receipts = resourceRows(dashboard?.recent_receipts)
  const health = dashboard?.stock_health || { safe: 0, near_minimum: 0, below_minimum: 0 }
  const totalParts = Number(dashboard?.spare_part_count || 0)
  const monthly = resourceRows(dashboard?.monthly_movements)
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const maxMovement = Math.max(1, ...monthly.flatMap((item) => [Number(item.in || 0), Number(item.out || 0)]))
  const chartPoints = (key) => monthly.map((item, index) => {
    const x = 44 + index * 45
    const y = 242 - (Number(item[key] || 0) / maxMovement) * 190
    return `${x},${y}`
  })
  const inPoints = chartPoints('in')
  const outPoints = chartPoints('out')
  const areaPath = inPoints.length ? `M ${inPoints[0]} L ${inPoints.slice(1).join(' L ')} L 539,242 L 44,242 Z` : ''
  const topSelling = dashboard?.top_selling_part
  const topPart = resourceObject(topSelling?.spare_part)
  const filteredParts = lowStock.filter((part) => `${part.name} ${part.code}`.toLowerCase().includes(search.toLowerCase()))
  const filteredMovements = movements.filter((movement) => {
    const part = resourceObject(movement.spare_part)
    return `${part?.name || ''} ${movement.id || ''}`.toLowerCase().includes(search.toLowerCase())
  })
  const percent = (value) => totalParts ? Math.round((Number(value || 0) / totalParts) * 100) : 0

  return (
    <main className="min-h-screen bg-[#18181a] text-[#222226]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[288px] flex-col bg-[#18181a] px-[18px] py-7 text-white lg:flex">
        <a href="/" className="flex items-center gap-3 px-2 text-[18px] font-semibold tracking-[-.04em]"><span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#dfff00] text-black"><Icon name="wrench" className="h-[18px] w-[18px]" /></span>KEN-KEN Motor</a>
        <p className="mb-3 mt-10 px-3 text-[9px] font-semibold tracking-[.18em] text-[#77767e]">MENU</p>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto text-[13px] text-[#a4a3aa]">
          <a href="/dashboard" className="flex items-center gap-3 rounded-xl bg-[#dfff00]/10 px-3 py-3 font-medium text-[#dfff00]"><span className="text-lg">▦</span>Dashboard</a>
          <SidebarAccordion id="inventory" title="Inventory" icon="box" items={['Daftar Spare Part', 'Stok Masuk', 'Stok Keluar', 'Stock Opname']} isOpen={openMenus.inventory} onToggle={() => toggleMenu('inventory')} />
          <SidebarAccordion id="procurement" title="Procurement" icon="cart" items={['Supplier', 'Purchase Order', 'Penerimaan Barang']} isOpen={openMenus.procurement} onToggle={() => toggleMenu('procurement')} />
          <SidebarAccordion id="bengkel" title="Bengkel" icon="wrench" items={['Data Kendaraan', 'Work Order', 'Penggunaan Spare Part']} isOpen={openMenus.bengkel} onToggle={() => toggleMenu('bengkel')} />
          <SidebarAccordion id="shipping" title="Pengiriman" icon="shipping" items={['Pesanan Kirim', 'Status Pengiriman']} isOpen={openMenus.shipping} onToggle={() => toggleMenu('shipping')} />
          <SidebarAccordion id="reports" title="Laporan" icon="chart" items={['Stok', 'Pembelian', 'Penggunaan Spare Part', 'Supplier']} isOpen={openMenus.reports} onToggle={() => toggleMenu('reports')} />
        </nav>
        <p className="mb-2 mt-5 px-3 text-[9px] font-semibold tracking-[.18em] text-[#77767e]">UMUM</p>
        <div className="space-y-1 text-[13px] text-[#a4a3aa]">
          <SidebarAccordion id="settings" title="Pengaturan" icon="settings" items={['User & Role', 'Minimum Stock', 'Audit Log']} isOpen={openMenus.settings} onToggle={() => toggleMenu('settings')} />
          <div className="flex items-center gap-3 px-3 py-3"><span>ⓘ</span>Bantuan</div>
        </div>        <div className="mt-auto rounded-2xl bg-white p-4 text-[#222226]"><div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-red-50 text-red-500">!</span><strong className="text-[11px]">Stok Menipis</strong></div><p className="ml-10 mt-1 text-[9px] text-[#77767e]">{formatNumber(dashboard?.low_stock_count)} item perlu dipesan ulang</p><button className="mt-4 w-full rounded-lg bg-[#18181a] py-2.5 text-[10px] font-medium text-white" onClick={() => document.getElementById('stock-alerts')?.scrollIntoView({ behavior: 'smooth' })}>Lihat Detail</button></div>
        <div className="mt-4 flex items-center gap-3 border-t border-[#45444b] px-1 pt-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#36363b] text-[10px] font-semibold text-[#dfff00]">{(user?.name || 'Owner').split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold">{user?.name || 'Owner KEN KEN Motor'}</p><p className="mt-1 text-[9px] text-[#77767e]">{user?.role || 'owner'}</p></div><button aria-label="Keluar" onClick={handleLogout} className="px-2 text-[#a4a3aa]">⇥</button></div>
      </aside>

      <section className="min-h-screen overflow-hidden bg-[#f4f4f5] lg:ml-[288px] lg:rounded-l-[28px]">
        <header className="flex min-h-[104px] flex-wrap items-center justify-between gap-4 border-b border-[#e5e5e7] px-6 py-5 sm:px-8 xl:px-10">
          <div><h1 className="text-[23px] font-semibold tracking-[-.04em]">Halo, {(user?.name || 'Owner').split(' ')[0]} 👋</h1><p className="mt-1 text-[11px] text-[#77767e]">Berikut ringkasan bengkel hari ini.</p></div>
          <div className="flex items-center gap-2 sm:gap-3"><label className="flex h-11 w-[min(44vw,230px)] items-center gap-3 rounded-full border border-[#e2e2e5] bg-white px-4 text-[#9999a1]"><span>⌕</span><input className="min-w-0 flex-1 bg-transparent text-[11px] text-[#222226] outline-none placeholder:text-[#9999a1]" placeholder="Cari di sini..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><button className="grid h-11 w-11 place-items-center rounded-full border border-[#e2e2e5] bg-white" aria-label="Filter"><Icon name="filter" className="h-5 w-5 text-[#55555d]" /></button><button onClick={() => document.getElementById('stock-alerts')?.scrollIntoView({ behavior: 'smooth' })} className="relative grid h-11 w-11 place-items-center rounded-full border border-[#e2e2e5] bg-white" aria-label="Notifikasi stok"><Icon name="bell" className="h-5 w-5 text-[#55555d]" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" /></button><button onClick={() => setIsAddSparePartOpen(true)} className="group relative hidden h-11 items-center gap-2 rounded-full bg-[#18181a] px-5 text-[10px] font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#2b2b2e] hover:shadow-lg hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfff00] active:translate-y-0 active:scale-[.98] sm:flex" aria-describedby="add-spare-part-tooltip"><span className="text-lg transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110">＋</span>Tambah Spare Part<span id="add-spare-part-tooltip" role="tooltip" className="pointer-events-none absolute right-0 top-[calc(100%+10px)] z-30 w-max translate-y-1 rounded-lg bg-[#242427] px-3 py-2 text-[9px] font-medium text-white opacity-0 shadow-xl transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">Buka form penambahan spare part</span></button></div>
        </header>
        {error && <div className="mx-6 mt-5 rounded-xl bg-red-50 p-4 text-[12px] text-red-700 sm:mx-8 xl:mx-10" role="alert">{error}<button className="ml-3 font-semibold underline" onClick={loadDashboard}>Coba lagi</button></div>}
        {loading ? <div className="grid min-h-[70vh] place-items-center text-sm text-[#77767e]">Memuat data dashboard dari server...</div> : dashboard && <div className="space-y-5 px-5 py-6 sm:px-8 xl:px-10">
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-5 xl:gap-4">
            {[
              { label: 'Total Stok', value: formatNumber(dashboard.stock_quantity), badge: formatNumber(dashboard.spare_part_count), detail: 'jenis spare part', icon: 'box', dark: true },
              { label: 'Nilai Persediaan', value: formatRupiah(dashboard.inventory_value), badge: 'Harga beli', detail: 'nilai stok saat ini', icon: 'chart' },
              { label: 'Work Order Hari Ini', value: formatNumber(dashboard.today_work_orders), badge: formatNumber(dashboard.active_work_orders), detail: 'masih berjalan', icon: 'wrench' },
              { label: 'PO Berjalan', value: formatNumber(dashboard.pending_purchase_orders), badge: formatNumber(dashboard.pending_purchase_orders), detail: 'menunggu penerimaan', icon: 'cart' },
              { label: 'Item Stok Menipis', value: formatNumber(dashboard.low_stock_count), badge: formatNumber(dashboard.low_stock_count), detail: 'perlu dicek pemesanan', icon: 'bell', warning: Number(dashboard.low_stock_count) > 0 },
            ].map((metric) => <article key={metric.label} className={`min-h-[178px] rounded-[20px] border border-[#e5e5e8] p-[18px] sm:p-5 xl:h-[199px] xl:min-h-0 ${metric.dark ? 'bg-[#242427] text-white' : 'bg-white'}`}>
              <div className="flex items-start justify-between">
                <span className={`grid h-11 w-11 place-items-center rounded-full ${metric.dark ? 'bg-[#dfff00]/30 text-[#dfff00]' : 'bg-[#dfff00]/30 text-[#262626]'}`}><Icon name={metric.icon} /></span>
                <span className="grid h-8 w-8 place-items-center rounded-full border border-[#e5e5e8] text-[13px] text-[#77767e]">↗</span>
              </div>
              <p className={`mt-[18px] text-[12px] ${metric.dark ? 'text-white/60' : 'text-[#77767e]'}`}>{metric.label}</p>
              <strong className="mt-1 block truncate text-[clamp(1.4rem,1.65vw,1.65rem)] font-bold tracking-[-.04em]">{metric.value}</strong>
              <div className="mt-3 flex items-center gap-2">
                <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${metric.dark ? 'bg-[#dfff00]/15 text-[#dfff00]' : metric.warning ? 'bg-red-50 text-red-500' : 'bg-[#e7f5ed] text-[#16885b]'}`}>{metric.badge}</span>
                <span className={`truncate whitespace-nowrap text-[9px] ${metric.dark ? 'text-white/45' : 'text-[#77767e]'}`}>{metric.detail}</span>
              </div>
            </article>)}
          </section>

          <section className="grid gap-4 xl:grid-cols-5">
            <article className="rounded-[20px] border border-[#e5e5e8] bg-white p-5 xl:col-span-2"><div className="flex items-start justify-between"><div><h2 className="text-[14px] font-semibold">Stok Masuk vs Stok Keluar</h2><p className="mt-1 text-[10px] text-[#77767e]">Pergerakan stok sepanjang {new Date().getFullYear()}</p></div><span className="rounded-full border border-[#e5e5e8] px-3 py-2 text-[9px] text-[#55555d]">Tahunan⌄</span></div><div className="mt-5 flex justify-end gap-4 text-[9px] text-[#77767e]"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#dfff00]"/>Stok Masuk</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#aaa9b0]"/>Stok Keluar</span></div><svg viewBox="0 0 580 290" className="mt-2 h-[230px] w-full" role="img" aria-label="Grafik stok masuk dan keluar per bulan"><defs><linearGradient id="stock-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#dfff00" stopOpacity=".48"/><stop offset="1" stopColor="#dfff00" stopOpacity="0"/></linearGradient></defs>{[0,1,2,3].map((line) => <g key={line}><line x1="44" x2="540" y1={52 + line * 58} y2={52 + line * 58} stroke="#e7e7e9" strokeDasharray="3 4"/><text x="3" y={56 + line * 58} fontSize="9" fill="#9999a1">{Math.round(maxMovement * (3 - line) / 3)}</text></g>)}{areaPath && <path d={areaPath} fill="url(#stock-fill)"/>}{inPoints.length > 1 && <polyline points={inPoints.join(' ')} fill="none" stroke="#dfff00" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>}{outPoints.length > 1 && <polyline points={outPoints.join(' ')} fill="none" stroke="#a5a5ad" strokeWidth="2" strokeDasharray="4 5" strokeLinejoin="round" strokeLinecap="round"/>}{names.map((name, index) => <text key={name} x={44 + index * 45} y="275" textAnchor="middle" fontSize="8" fill="#9999a1">{name}</text>)}</svg></article>

            <article className="rounded-[20px] border border-[#e5e5e8] bg-white p-5 xl:col-span-1"><h2 className="text-[14px] font-semibold">Kesehatan Stok</h2><p className="mt-1 text-[10px] text-[#77767e]">Status persediaan saat ini</p><div className="flex h-[190px] items-center justify-center"><div className="grid h-32 w-32 place-items-center rounded-full" style={{ background: `conic-gradient(#dfff00 0% ${percent(health.safe)}%, #ffb340 ${percent(health.safe)}% ${percent(health.safe) + percent(health.near_minimum)}%, #ff6269 ${percent(health.safe) + percent(health.near_minimum)}% 100%)` }}><div className="grid h-[88px] w-[88px] place-content-center rounded-full bg-white text-center"><strong className="text-[19px]">{formatNumber(dashboard.spare_part_count)}</strong><small className="text-[8px] text-[#77767e]">Total item</small></div></div></div><div className="space-y-3 text-[9px]">{[['Aman', health.safe, '#dfff00'], ['Menipis', health.near_minimum, '#ffb340'], ['Di bawah minimum', health.below_minimum, '#ff6269']].map(([label, value, color]) => <div key={label} className="flex items-center gap-2"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: color }}/><span className="flex-1 text-[#55555d]">{label}</span><strong>{percent(value)}%</strong></div>)}</div></article>

            <article id="stock-alerts" className="rounded-[20px] border border-[#e5e5e8] bg-white p-5 xl:col-span-2"><div className="flex items-start justify-between"><div><h2 className="text-[14px] font-semibold">Peringatan Stok Minimum</h2><p className="mt-1 text-[10px] text-[#77767e]">Spare part di bawah batas stok</p></div><span className="text-[9px] font-semibold">Lihat semua</span></div><div className="mt-2 divide-y divide-[#eeeeef]">{filteredParts.slice(0, 4).map((part) => <div key={part.id} className="flex items-center gap-3 py-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f4f4f5] text-[#66666d]"><Icon name="wrench" className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold">{part.name}</p><p className="mt-1 text-[8px] text-[#77767e]">Minimum {formatNumber(part.min_stock)} {part.unit} · Stok {formatNumber(part.stock)}</p></div><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${Number(part.stock) === 0 ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-600'}`}>{formatNumber(part.stock)} tersisa</span></div>)}{filteredParts.length === 0 && <p className="py-8 text-center text-[10px] text-[#77767e]">Tidak ada spare part di bawah stok minimum.</p>}</div></article>
          </section>

          <section className="grid gap-4 xl:grid-cols-5">
            <article className="rounded-[20px] border border-[#e5e5e8] bg-white p-5 xl:col-span-2"><div className="flex items-start justify-between"><div><h2 className="text-[14px] font-semibold">Transaksi Terbaru</h2><p className="mt-1 text-[10px] text-[#77767e]">Aktivitas stok terbaru dari BE</p></div><span className="text-[9px] font-semibold">{formatNumber(movements.length)} aktivitas</span></div><div className="mt-4 hidden grid-cols-[1.5fr_1fr_.6fr_.8fr] gap-2 border-y border-[#eeeeef] bg-[#fafafa] px-2 py-3 text-[8px] text-[#77767e] sm:grid"><span>Spare Part</span><span>ID Transaksi</span><span>Jumlah</span><span>Status</span></div><div className="divide-y divide-[#eeeeef]">{filteredMovements.map((movement) => { const part = resourceObject(movement.spare_part); const isIn = movement.type === 'in'; return <div key={movement.id} className="grid grid-cols-[1fr_auto] items-center gap-2 py-3 text-[9px] sm:grid-cols-[1.5fr_1fr_.6fr_.8fr]"><span className="flex min-w-0 items-center gap-2"><i className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#f4f4f5] not-italic text-[#77767e]">⚒</i><span className="truncate font-medium">{part?.name || 'Spare part'}</span></span><span className="hidden text-[#55555d] sm:block">TRX-{String(movement.id).padStart(5, '0')}</span><strong className={isIn ? 'text-[#16885b]' : 'text-red-500'}>{isIn ? '+' : '-'}{formatNumber(movement.quantity)}</strong><span className={`w-fit rounded-full px-2 py-1 text-[8px] ${isIn ? 'bg-green-50 text-green-700' : 'bg-[#f1f1f2] text-[#55555d]'}`}>{isIn ? 'Stok Masuk' : 'Terpakai'}</span></div>})}{filteredMovements.length === 0 && <p className="py-7 text-center text-[10px] text-[#77767e]">Belum ada pergerakan stok.</p>}</div></article>

            <article className="flex flex-col items-center rounded-[20px] border border-[#e5e5e8] bg-white p-5 text-center xl:col-span-1"><h2 className="w-full text-left text-[14px] font-semibold">Spare Part Terlaris</h2>{topPart ? <><span className="my-6 grid h-24 w-24 place-items-center rounded-[28px] bg-[#f4f4f5] text-[#66666d]"><Icon name="box" className="h-10 w-10" /></span><span className="rounded-full bg-green-50 px-3 py-2 text-[8px] font-semibold text-green-700">Terpakai {formatNumber(topSelling.quantity_sold)} unit</span><strong className="mt-3 text-[11px]">{topPart.name}</strong><span className="mt-1 text-[9px] text-[#77767e]">Stok tersisa {formatNumber(topPart.stock)} {topPart.unit}</span></> : <p className="my-auto py-8 text-[10px] text-[#77767e]">Belum ada data penggunaan spare part.</p>}</article>

            <article className="rounded-[20px] border border-[#e5e5e8] bg-white p-5 xl:col-span-2"><h2 className="text-[14px] font-semibold">Barang Baru Diterima</h2><p className="mt-1 text-[10px] text-[#77767e]">Penerimaan barang terbaru</p><div className="mt-2 divide-y divide-[#eeeeef]">{receipts.slice(0, 4).map((receipt) => { const items = resourceRows(receipt.items); const item = items[0]; const part = resourceObject(item?.spare_part); return <div key={receipt.id} className="flex items-center gap-3 py-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f4f4f5] text-[#66666d]"><Icon name="box" className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold">{part?.name || receipt.number}</p><p className="mt-1 text-[8px] text-[#77767e]">{receipt.number} · {formatNumber(item?.quantity)} {part?.unit || 'unit'}</p></div><strong className="text-[9px]">{formatRupiah(Number(item?.unit_price || 0) * Number(item?.quantity || 0))}</strong></div>})}{receipts.length === 0 && <p className="py-8 text-center text-[10px] text-[#77767e]">Belum ada penerimaan barang.</p>}</div></article>
          </section>
        </div>}
      </section>
      {isAddSparePartOpen && <AddSparePartModal onClose={() => setIsAddSparePartOpen(false)} onSaved={loadDashboard} />}
    </main>
  )
}

export default DashboardPage
