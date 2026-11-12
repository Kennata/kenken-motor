import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from '../Icon'
import api from '../../lib/api'
import { cachedGet, invalidateCache, objectFrom, rowsFrom, metaFrom } from '../../lib/apiHelpers'
import { useLocation } from '../../lib/router'
import Link from '../Link'
import { clearSession, getStoredUser, getToken, storeUser } from '../../lib/session'
import { UserContext } from '../../lib/userContext'
import { handleUnauthorized } from '../../hooks/useResourceList'
import { STOCK_CHANGED_EVENT } from '../../lib/stockEvents'
import { filterNavigation, generalNavigation, isActivePath, navigation } from './navigation'

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'KK'
}

function SidebarGroup({ entry, pathname, onNavigate }) {
  const containsActive = entry.items?.some((item) => isActivePath(item.to, pathname))
  const [open, setOpen] = useState(containsActive)
  const [prevActive, setPrevActive] = useState(containsActive)
  if (containsActive !== prevActive) {
    setPrevActive(containsActive)
    if (containsActive) setOpen(true)
  }

  if (!entry.items) {
    const active = isActivePath(entry.to, pathname)
    return (
      <Link to={entry.to} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={`relative flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${active ? 'bg-[#dfff00]/10 font-medium text-[#dfff00]' : 'hover:bg-white/5 hover:text-white'}`}>
        {active && <span className="absolute -left-[18px] h-6 w-1 rounded-r bg-[#dfff00]" />}
        <Icon name={entry.icon} />{entry.title}
      </Link>
    )
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/5 hover:text-white ${containsActive ? 'text-white' : ''}`}>
        <Icon name={entry.icon} />
        <span>{entry.title}</span>
        <Icon name="chevronDown" className={`ml-auto h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="space-y-0.5 pb-1 pl-[44px] text-[12px]">
            {entry.items.map((item) => {
              const active = isActivePath(item.to, pathname)
              return <Link key={item.to} to={item.to} onClick={onNavigate} tabIndex={open ? 0 : -1} aria-current={active ? 'page' : undefined} className={`block rounded-lg px-2 py-2 transition-colors ${active ? 'font-medium text-[#dfff00]' : 'text-[#8a8990] hover:text-white'}`}>{item.title}</Link>
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Sidebar({ user, pathname, lowStockCount, onNavigate, onLogout }) {
  const role = user?.role || 'mekanik'
  return (
    <div className="flex h-full flex-col px-[18px] py-7 text-white">
      <Link to={role === 'owner' ? '/dashboard' : '/inventory/spare-parts'} onClick={onNavigate} className="flex items-center gap-3 px-2 text-[18px] font-semibold tracking-[-.04em]">
        <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#dfff00] text-black"><Icon name="wrench" className="h-5 w-5" /></span>
        <span>KEN-KEN <span className="font-bold">Motor</span></span>
      </Link>
      <p className="mb-3 mt-10 px-3 text-[9px] font-semibold tracking-[.18em] text-[#77767e]">MENU</p>
      <nav aria-label="Menu utama" className="min-h-0 flex-1 space-y-1 overflow-y-auto text-[13px] text-[#a4a3aa]">
        {filterNavigation(navigation, role).map((entry) => <SidebarGroup key={entry.id} entry={entry} pathname={pathname} onNavigate={onNavigate} />)}
        <p className="mb-2 mt-5 px-3 text-[9px] font-semibold tracking-[.18em] text-[#77767e]">UMUM</p>
        {filterNavigation(generalNavigation, role).map((entry) => <SidebarGroup key={entry.id} entry={entry} pathname={pathname} onNavigate={onNavigate} />)}
      </nav>
      {lowStockCount > 0 && (
        <div className="mt-4 rounded-2xl bg-white p-4 text-[#222226]">
          <div className="flex items-center gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-red-50 text-red-500"><Icon name="alert" className="h-4 w-4" /></span>
            <div><p className="text-[12px] font-semibold">Stok Menipis</p><p className="text-[10px] text-[#77767e]">{lowStockCount} item perlu dipesan ulang</p></div>
          </div>
          <Link to="/inventory/spare-parts?low_stock=1" onClick={onNavigate} className="mt-3 flex h-9 items-center justify-center rounded-xl bg-[#18181a] text-[11px] font-semibold text-white hover:bg-[#343438]">Lihat Detail</Link>
        </div>
      )}
      <div className="mt-4 flex items-center gap-3 border-t border-[#45444b] px-1 pt-4">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#36363b] text-[10px] font-semibold text-[#dfff00]">{initials(user?.name)}</span>
        <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold">{user?.name || 'Pengguna'}</p><p className="text-[10px] capitalize text-[#77767e]">{user?.role || '-'}</p></div>
        <button type="button" onClick={onLogout} aria-label="Keluar" title="Keluar" className="grid h-8 w-8 place-items-center rounded-full text-[#a4a3aa] hover:bg-white/5 hover:text-white"><Icon name="logout" className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

function NotificationBell({ items, count }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    function onClick(event) { if (!ref.current?.contains(event.target)) setOpen(false) }
    function onKey(event) { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={`Notifikasi stok minimum, ${count} item`} className="relative grid h-10 w-10 place-items-center rounded-full border border-[#e2e2e5] bg-white text-[#33333a] hover:bg-[#f7f7f8]">
        <Icon name="bell" className="h-[18px] w-[18px]" />
        {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-[300px] rounded-2xl border border-[#e5e5e8] bg-white p-3 shadow-xl">
          <p className="px-2 pb-2 text-[12px] font-semibold text-[#222226]">Peringatan Stok Minimum</p>
          {items.length === 0 && <p className="px-2 py-4 text-[11px] text-[#77767e]">Semua stok di atas batas minimum.</p>}
          <ul className="space-y-1">
            {items.map((part) => (
              <li key={part.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#f7f7f8]">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-50 text-red-500"><Icon name="alert" className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-[#222226]">{part.name}</p><p className="text-[10px] text-[#77767e]">Sisa {part.stock} {part.unit} · Min. {part.min_stock}</p></div>
              </li>
            ))}
          </ul>
          {count > 0 && <Link to="/inventory/spare-parts?low_stock=1" onClick={() => setOpen(false)} className="mt-2 block rounded-xl bg-[#f4f4f5] py-2 text-center text-[11px] font-semibold text-[#33333a] hover:bg-[#ececef]">Lihat semua ({count})</Link>}
        </div>
      )}
    </div>
  )
}

function AppLayout({ title, subtitle = 'Berikut ringkasan bengkel hari ini.', actions, toolbar, roles = ['owner'], children }) {
  const { pathname } = useLocation()
  const [user, setUser] = useState(getStoredUser)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lowStock, setLowStock] = useState({ items: [], count: 0 })
  const role = user?.role

  useEffect(() => {
    if (!getToken()) { window.location.replace('/login'); return }
    cachedGet(api, '/user').then((response) => {
      const fresh = objectFrom(response)
      if (fresh) { setUser(fresh); storeUser(fresh) }
    }).catch(handleUnauthorized)
  }, [])

  const loadLowStock = useCallback(async () => {
    if (!role) return
    try {
      const response = await cachedGet(api, role === 'owner' ? '/minimum-stock?per_page=5' : '/spare-parts?low_stock=1&per_page=5')
      setLowStock({ items: rowsFrom(response), count: metaFrom(response)?.total ?? rowsFrom(response).length })
    } catch (error) { handleUnauthorized(error) }
  }, [role])

  useEffect(() => {
    const timer = window.setTimeout(loadLowStock, 0)
    function refresh() {
      invalidateCache('/minimum-stock?')
      invalidateCache('/spare-parts?low_stock')
      loadLowStock()
    }
    window.addEventListener(STOCK_CHANGED_EVENT, refresh)
    return () => { window.clearTimeout(timer); window.removeEventListener(STOCK_CHANGED_EVENT, refresh) }
  }, [loadLowStock])

  async function handleLogout() {
    try { await api.post('/logout') } catch { /* token tetap dihapus walau server tidak tersedia */ }
    invalidateCache('')
    clearSession()
    window.location.assign('/login')
  }

  const allowed = !role || roles.includes(role)
  const sidebarProps = { user, pathname, lowStockCount: lowStock.count, onLogout: handleLogout }

  return (
    <UserContext.Provider value={user}>
      <main className="min-h-screen bg-[#18181a] text-[#222226]">
        <aside className="no-print fixed inset-y-0 left-0 z-20 hidden w-[288px] bg-[#18181a] lg:block"><Sidebar {...sidebarProps} /></aside>

        {drawerOpen && (
          <div className="no-print fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-[288px] max-w-[85vw] bg-[#18181a] shadow-2xl"><Sidebar {...sidebarProps} onNavigate={() => setDrawerOpen(false)} /></aside>
          </div>
        )}

        <section className="print-area min-h-screen bg-[#f4f4f5] lg:ml-[288px] lg:rounded-l-[28px]">
          <header className="no-print flex min-h-[96px] flex-wrap items-center justify-between gap-4 border-b border-[#e5e5e8] px-5 py-5 sm:px-8 xl:px-10">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Buka menu" className="grid h-10 w-10 place-items-center rounded-full bg-[#18181a] text-white lg:hidden"><Icon name="menu" className="h-5 w-5" /></button>
              <div><h1 className="text-[23px] font-semibold tracking-[-.04em]">{title}</h1><p className="mt-1 text-[11px] text-[#77767e]">{subtitle}</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {toolbar}
              <NotificationBell items={lowStock.items} count={lowStock.count} />
              {allowed && actions}
            </div>
          </header>
          <div className="px-4 py-6 sm:px-8 xl:px-10">
            {allowed ? children : (
              <div className="grid min-h-[50vh] place-items-center text-center">
                <div><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-500"><Icon name="alert" /></span><p className="mt-3 text-[14px] font-semibold">Halaman ini khusus Owner</p><p className="mt-1 text-[11px] text-[#77767e]">Akun Mekanik tidak memiliki akses ke modul ini.</p></div>
              </div>
            )}
          </div>
        </section>
      </main>
    </UserContext.Provider>
  )
}

export default AppLayout
