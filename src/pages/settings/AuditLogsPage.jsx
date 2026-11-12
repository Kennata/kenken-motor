import { useCallback, useEffect, useMemo, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import Icon from '../../components/Icon'
import { Alert, Badge, Card, Modal, Pagination, SearchInput, SelectFilter } from '../../components/ui'
import { handleUnauthorized } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { errorMessage, fetchAll, objectFrom } from '../../lib/apiHelpers'
import { formatDateTime, toInputDate } from '../../lib/format'

const PAGE_SIZE = 8
const MODULES = ['Inventory', 'Procurement', 'Bengkel', 'Pengiriman', 'Pengaturan']

function auditModule(log) {
  const changedMinimum = Object.hasOwn(log.new_values || {}, 'min_stock') || Object.hasOwn(log.old_values || {}, 'min_stock')
  if (changedMinimum || log.table_name === 'users') return 'Pengaturan'
  if (['purchase_orders', 'purchase_order_items', 'goods_receipts', 'goods_receipt_items', 'suppliers'].includes(log.table_name)) return 'Procurement'
  if (['vehicles', 'work_orders', 'work_order_items'].includes(log.table_name)) return 'Bengkel'
  if (['shipments', 'shipment_status_logs'].includes(log.table_name)) return 'Pengiriman'
  return 'Inventory'
}

function auditAction(log) {
  const action = { created: 'menambahkan', updated: 'mengubah', deleted: 'menghapus' }[log.action] || log.action
  const subject = {
    spare_parts: 'spare part', categories: 'kategori spare part', stock_movements: 'mutasi stok', stock_opnames: 'stock opname',
    stock_opname_items: 'detail stock opname', suppliers: 'supplier', purchase_orders: 'purchase order', purchase_order_items: 'item purchase order',
    goods_receipts: 'penerimaan barang', goods_receipt_items: 'detail penerimaan barang', vehicles: 'kendaraan', work_orders: 'work order',
    work_order_items: 'penggunaan spare part', shipments: 'pesanan kirim', shipment_status_logs: 'status pengiriman', users: 'pengguna',
  }[log.table_name] || log.table_name
  const minStock = Object.hasOwn(log.new_values || {}, 'min_stock') || Object.hasOwn(log.old_values || {}, 'min_stock')
  const description = minStock ? 'batas minimum stok' : subject
  return `${action} ${description}${log.record_id ? ` #${log.record_id}` : ''}`
}

function initials(name = '') { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U' }

function AuditDetail({ log, onClose }) {
  const [detail, setDetail] = useState(log)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get(`/audit-logs/${log.id}`).then((response) => { if (active) setDetail(objectFrom(response) || log) })
      .catch((requestError) => { if (active && !handleUnauthorized(requestError)) setError(errorMessage(requestError, 'Detail audit log gagal dimuat.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [log])

  return <Modal title="Detail Audit Log" description={`${auditModule(detail)} · ${formatDateTime(detail.created_at)}`} onClose={onClose} size="max-w-[760px]">
    {error && <Alert tone="error" className="mt-4">{error}</Alert>}
    <div className="mt-5 rounded-2xl bg-[#f7f7f8] p-4"><p className="text-[12px] font-semibold">{detail.user?.name || 'Sistem'}</p><p className="mt-1 text-[11px] text-[#55555c]">{auditAction(detail)}</p><p className="mt-2 text-[10px] text-[#77767e]">Tabel: {detail.table_name} · ID data: {detail.record_id ?? '-'}</p>{detail.ip_address && <p className="mt-1 text-[10px] text-[#77767e]">IP: {detail.ip_address}</p>}</div>
    {loading && <p className="mt-4 text-[11px] text-[#77767e]">Memuat detail...</p>}
    {!loading && <div className="mt-4 grid gap-3 sm:grid-cols-2">{[['Data Sebelum', detail.old_values], ['Data Sesudah', detail.new_values]].map(([label, value]) => <section key={label} className="min-w-0 rounded-2xl border border-[#e8e8eb] p-4"><h3 className="text-[11px] font-semibold">{label}</h3><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[9px] leading-relaxed text-[#55555c]">{value ? JSON.stringify(value, null, 2) : '—'}</pre></section>)}</div>}
  </Modal>
}

function AuditLogsPage() {
  const today = toInputDate()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [preset, setPreset] = useState('today')
  const [moduleFilter, setModuleFilter] = useState('')
  const [toolbarFilterOpen, setToolbarFilterOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setLogs(await fetchAll(api, '/audit-logs', { from, to })) }
    catch (requestError) { if (!handleUnauthorized(requestError)) setError(errorMessage(requestError, 'Riwayat aktivitas gagal dimuat.')) }
    finally { setLoading(false) }
  }, [from, to])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])

  function choosePreset(value) {
    setPreset(value); setPage(1)
    const end = new Date()
    const start = new Date(end)
    if (value === '7days') start.setDate(start.getDate() - 6)
    if (value === '30days') start.setDate(start.getDate() - 29)
    setFrom(value === 'custom' ? from : toInputDate(start))
    setTo(value === 'custom' ? to : toInputDate(end))
  }

  const filtered = useMemo(() => logs.filter((log) => {
    const query = search.trim().toLocaleLowerCase('id-ID')
    const text = `${log.user?.name || 'Sistem'} ${auditAction(log)} ${log.table_name} ${log.record_id || ''}`.toLocaleLowerCase('id-ID')
    return text.includes(query) && (!moduleFilter || auditModule(log) === moduleFilter)
  }), [logs, moduleFilter, search])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE
  const rows = filtered.slice(start, start + PAGE_SIZE)
  const meta = { current_page: currentPage, last_page: pageCount, from: filtered.length ? start + 1 : 0, to: Math.min(start + PAGE_SIZE, filtered.length), total: filtered.length }

  const toolbar = <><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Cari di sini..." className="w-[min(34vw,230px)]"/><div className="relative"><button type="button" onClick={() => setToolbarFilterOpen((value) => !value)} aria-label="Filter modul audit log" aria-expanded={toolbarFilterOpen} className="grid h-11 w-11 place-items-center rounded-full border border-[#e2e2e5] bg-white text-[#55555d] hover:bg-[#f7f7f8]"><Icon name="filter" className="h-5 w-5"/></button>{toolbarFilterOpen && <div className="absolute right-0 top-12 z-30 w-48 rounded-xl border border-[#e5e5e8] bg-white p-3 shadow-xl"><SelectFilter label="Filter modul" value={moduleFilter} onChange={(value) => { setModuleFilter(value); setPage(1) }} className="w-full"><option value="">Semua modul</option>{MODULES.map((module) => <option key={module} value={module}>{module}</option>)}</SelectFilter></div>}</div></>

  return <AppLayout title="Audit Log" subtitle="Riwayat aktivitas pengguna pada sistem bengkel." toolbar={toolbar}>
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Cari aktivitas..." className="w-full sm:w-[280px]"/>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 items-center gap-2 rounded-full border border-[#e2e2e5] bg-white px-3 text-[10px] text-[#55555c]"><Icon name="calendar" className="h-4 w-4"/><select aria-label="Periode audit log" value={preset} onChange={(event) => choosePreset(event.target.value)} className="max-w-[110px] appearance-none bg-transparent outline-none"><option value="today">Hari ini</option><option value="7days">7 hari terakhir</option><option value="30days">30 hari terakhir</option><option value="custom">Pilih tanggal</option></select></label>
          {preset === 'custom' && <div className="flex items-center gap-1"><input aria-label="Dari tanggal" type="date" value={from} max={to} onChange={(event) => { setFrom(event.target.value); setPage(1) }} className="h-9 w-[125px] rounded-full border border-[#e2e2e5] bg-white px-2 text-[10px]"/><input aria-label="Sampai tanggal" type="date" value={to} min={from} onChange={(event) => { setTo(event.target.value); setPage(1) }} className="h-9 w-[125px] rounded-full border border-[#e2e2e5] bg-white px-2 text-[10px]"/></div>}
          <SelectFilter label="Filter modul" value={moduleFilter} onChange={(value) => { setModuleFilter(value); setPage(1) }} className="w-[140px]"><option value="">Semua modul</option>{MODULES.map((module) => <option key={module} value={module}>{module}</option>)}</SelectFilter>
        </div>
      </div>
      {error && <Alert tone="error" className="mb-3">{error}<button type="button" onClick={load} className="ml-2 font-semibold underline">Coba lagi</button></Alert>}
      <div className="divide-y divide-[#ececef]">
        {loading && rows.length === 0 && Array.from({ length: 4 }, (_, index) => <div key={index} className="flex items-center gap-3 py-4"><span className="h-9 w-9 animate-pulse rounded-full bg-[#efeff1]"/><span className="h-4 w-2/3 animate-pulse rounded bg-[#efeff1]"/></div>)}
        {!loading && !error && rows.length === 0 && <p className="py-12 text-center text-[11px] text-[#77767e]">Belum ada aktivitas untuk filter ini.</p>}
        {!error && rows.map((log) => <button type="button" key={log.id} onClick={() => setSelected(log)} className="flex w-full items-center gap-3 py-3.5 text-left hover:bg-[#fafafa] sm:px-1"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f1f1f2] text-[10px] font-semibold text-[#55555c]">{initials(log.user?.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] text-[#66666e]"><strong className="font-semibold text-[#222226]">{log.user?.name || 'Sistem'}</strong> {auditAction(log)}</span><span className="mt-1 block truncate text-[9px] text-[#9999a1]">{auditModule(log)} · {formatDateTime(log.created_at)}</span></span><Badge tone="gray" className="hidden sm:inline-flex">{log.action}</Badge><Icon name="chevronRight" className="h-4 w-4 shrink-0 text-[#9999a1]"/></button>)}
      </div>
      <Pagination meta={meta} onPageChange={setPage}/>
    </Card>
    {selected && <AuditDetail log={selected} onClose={() => setSelected(null)}/>}
  </AppLayout>
}

export default AuditLogsPage
