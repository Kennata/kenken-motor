import { useCallback, useEffect, useMemo, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import Icon from '../../components/Icon'
import { Alert, Badge, Card, DataTable, Pagination, PartAvatar, SearchInput } from '../../components/ui'
import { handleUnauthorized } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { errorMessage, metaFrom, rowsFrom } from '../../lib/apiHelpers'
import { formatDate, formatNumber, formatRupiah, toInputDate } from '../../lib/format'

const PAGE_SIZE = 8
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const TYPES = {
  stock: { title: 'Laporan Stok', trend: 'Tren Stok', details: 'Rincian Laporan Stok', endpoint: '/reports/stock', primary: 'Nilai Persediaan', secondary: 'Total Transaksi', third: 'Stok Menipis' },
  purchases: { title: 'Laporan Pembelian', trend: 'Tren Pembelian', details: 'Rincian Laporan Pembelian', endpoint: '/reports/purchases', primary: 'Total Pembelian', secondary: 'Total Transaksi', third: 'Rata-rata Harian' },
  usage: { title: 'Laporan Penggunaan Spare Part', trend: 'Tren Penggunaan', details: 'Rincian Laporan Penggunaan', endpoint: '/reports/spare-part-usage', primary: 'Total Penggunaan', secondary: 'Total Transaksi', third: 'Rata-rata Harian' },
  suppliers: { title: 'Laporan Supplier', trend: 'Tren Supplier', details: 'Rincian Laporan Supplier', endpoint: '/reports/suppliers', primary: 'Total Supplier', secondary: 'Total Transaksi', third: 'Rata-rata Harian' },
}

function currentYearRange() {
  const year = new Date().getFullYear()
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

function getPreviousRange(range) {
  if (!range.from || !range.to) return null
  const start = new Date(`${range.from}T00:00:00`)
  const end = new Date(`${range.to}T00:00:00`)
  const days = Math.ceil((end - start) / 86400000) + 1
  if (!Number.isFinite(days) || days < 1) return null
  const previousEnd = new Date(start)
  previousEnd.setDate(previousEnd.getDate() - 1)
  const previousStart = new Date(previousEnd)
  previousStart.setDate(previousStart.getDate() - days + 1)
  return { from: toInputDate(previousStart), to: toInputDate(previousEnd) }
}

async function fetchReport(endpoint, params) {
  const rows = []
  let page = 1
  let summary = {}
  let meta
  do {
    const response = await api.get(endpoint, { params: { ...params, per_page: 100, page } })
    rows.push(...rowsFrom(response))
    summary = response.data?.summary || summary
    meta = metaFrom(response)
    page += 1
  } while (meta?.last_page && page <= meta.last_page && page <= 20)
  return { rows, summary, meta }
}

function monthSeries(rows, range, previousRows = [], priorRange = null) {
  const startDate = range.from ? new Date(`${range.from}T00:00:00`) : new Date(new Date().getFullYear(), 0, 1)
  const endDate = range.to ? new Date(`${range.to}T00:00:00`) : new Date()
  const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
  const months = []
  for (const cursor = new Date(startMonth); cursor <= endMonth && months.length < 24; cursor.setMonth(cursor.getMonth() + 1)) {
    const yearLabel = startDate.getFullYear() === endDate.getFullYear() ? '' : ` '${String(cursor.getFullYear()).slice(-2)}`
    months.push({ key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`, label: `${MONTHS[cursor.getMonth()]}${yearLabel}`, inbound: 0, outbound: 0 })
  }
  function offsetFor(dateValue, baseRange) {
    const date = new Date(dateValue)
    const base = baseRange?.from ? new Date(`${baseRange.from}T00:00:00`) : startMonth
    return (date.getFullYear() - base.getFullYear()) * 12 + date.getMonth() - base.getMonth()
  }
  function append(row, baseRange, previous = false) {
    const date = row.date || row.order_date || row.created_at
    if (!date) return
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return
    const entry = months[offsetFor(date, baseRange)]
    if (!entry) return
    const value = Number(row.chartValue || 0)
    if (previous) entry.outbound += Math.abs(value)
    else {
      entry.inbound += value >= 0 ? value : 0
      entry.outbound += value < 0 ? Math.abs(value) : 0
    }
  }
  rows.forEach((row) => append(row, range))
  if (priorRange) previousRows.forEach((row) => append(row, priorRange, true))
  return months
}

function smoothPath(points) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  return points.reduce((path, point, index) => {
    if (!index) return `M ${point.x} ${point.y}`
    const previous = points[index - 1]
    const middleX = (previous.x + point.x) / 2
    return `${path} C ${middleX} ${previous.y}, ${middleX} ${point.y}, ${point.x} ${point.y}`
  }, '')
}

function compactValue(value, metric) {
  if (metric === 'money') {
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
    if (value >= 1_000) return `Rp ${(value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`
    return formatRupiah(value)
  }
  return `${formatNumber(value)} item`
}

function TrendChart({ title, rows, range, previousRows, priorRange, stockMode = false, metric = 'quantity' }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const series = monthSeries(rows, range, previousRows, priorRange)
  const max = Math.max(1, ...series.flatMap((point) => [point.inbound, point.outbound]))
  const chart = { left: 40, top: 20, width: 900, height: 205 }
  const x = (index) => chart.left + (series.length <= 1 ? chart.width / 2 : (index / (series.length - 1)) * chart.width)
  const y = (value) => chart.top + chart.height - (value / max) * chart.height
  const first = series.map((point, index) => ({ x: x(index), y: y(point.inbound) }))
  const second = series.map((point, index) => ({ x: x(index), y: y(point.outbound) }))
  const firstPath = smoothPath(first)
  const secondPath = smoothPath(second)
  const areaPath = first.length ? `${firstPath} L ${first.at(-1).x} ${chart.top + chart.height} L ${first[0].x} ${chart.top + chart.height} Z` : ''
  const active = activeIndex === null ? null : series[activeIndex]
  const hasValues = series.some((point) => point.inbound || point.outbound)
  const tooltipX = activeIndex === null ? 0 : Math.max(chart.left, Math.min(x(activeIndex) - 58, chart.left + chart.width - 116))
  const tooltipY = activeIndex === null ? 0 : Math.max(3, y(active.inbound) - 62)

  return <Card className="mt-5 overflow-hidden p-5 sm:p-6">
    <h2 className="text-[14px] font-semibold">{title}</h2><p className="mt-1 text-[10px] text-[#77767e]">Perbandingan periode berjalan</p>
    <div className="mt-3 flex justify-end gap-4 text-[9px] text-[#77767e]"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#dfff00]" />{stockMode ? 'Stok Masuk' : 'Periode ini'}</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#a5a5ad]" />{stockMode ? 'Stok Keluar' : 'Periode sebelumnya'}</span></div>
    <div className="mt-1 overflow-x-auto"><svg role="img" aria-label={`${title} menurut bulan`} viewBox="0 0 980 275" className="h-[230px] min-w-[620px] w-full" preserveAspectRatio="none">
      <defs><linearGradient id="report-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#dfff00" stopOpacity=".42"/><stop offset="100%" stopColor="#dfff00" stopOpacity="0"/></linearGradient></defs>
      {[0, 1, 2, 3, 4].map((tick) => { const value = (max * (4 - tick)) / 4; const lineY = chart.top + (tick / 4) * chart.height; return <g key={tick}><line x1={chart.left} y1={lineY} x2={chart.left + chart.width} y2={lineY} stroke="#e5e5e8" strokeDasharray="4 6"/><text x="4" y={lineY + 3} fill="#a3a3ab" fontSize="9">{compactValue(value, metric)}</text></g> })}
      {areaPath && <path d={areaPath} fill="url(#report-area)"/>}{firstPath && <path d={firstPath} fill="none" stroke="#dfff00" strokeWidth="4" strokeLinecap="round"/>}{secondPath && <path d={secondPath} fill="none" stroke="#a5a5ad" strokeWidth="2.5" strokeDasharray="5 6"/>}
      {active && <><line x1={x(activeIndex)} y1={chart.top} x2={x(activeIndex)} y2={chart.top + chart.height} stroke="#92929a" strokeDasharray="3 4"/><circle cx={x(activeIndex)} cy={y(active.inbound)} r="7" fill="#dfff00" stroke="#18181a" strokeWidth="3"/><g pointerEvents="none" transform={`translate(${tooltipX}, ${tooltipY})`}><rect width="116" height="48" rx="10" fill="#18181a"/><text x="10" y="19" fill="white" fontSize="10" fontWeight="700">{compactValue(active.inbound, metric)}</text><text x="10" y="35" fill="#d1d1d5" fontSize="8">{stockMode ? 'Stok masuk' : 'Periode ini'} · {active.label}</text><text x="106" y="35" fill="#b8b8c0" fontSize="8" textAnchor="end">{compactValue(active.outbound, metric)}</text></g></>}
      {series.map((point, index) => <circle key={`hit-${point.key}`} cx={x(index)} cy={y(point.inbound)} r="12" fill="transparent" tabIndex="0" role="button" aria-label={`${point.label}: ${compactValue(point.inbound, metric)}`} onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setActiveIndex(index) }}/>)}
      {series.map((point, index) => <text key={point.key} x={x(index)} y="255" fill="#9999a1" fontSize="9" textAnchor="middle">{point.label}</text>)}
    </svg></div>
    {!hasValues && <p className="mt-1 text-center text-[10px] text-[#9999a1]">Belum ada transaksi pada rentang ini; nilai bulan kosong ditampilkan sebagai 0.</p>}
  </Card>
}

function exportCsv(filename, columns, rows) {
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const content = `\uFEFF${[columns.map((column) => quote(column.label)).join(','), ...rows.map((row) => columns.map((column) => quote(column.exportValue ? column.exportValue(row) : column.value(row))).join(','))].join('\r\n')}`
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url)
}

function ReportPage({ type }) {
  const config = TYPES[type]
  const [range, setRange] = useState(currentYearRange)
  const [search, setSearch] = useState('')
  const [referenceFilter, setReferenceFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [report, setReport] = useState({ rows: [], summary: {} })
  const [movementRows, setMovementRows] = useState([])
  const [previousRows, setPreviousRows] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const params = { from: range.from, to: range.to }
    const priorRange = getPreviousRange(range)
    try {
      const requests = [fetchReport(config.endpoint, params)]
      if (type === 'stock') requests.push(fetchReport('/stock-in', params), fetchReport('/stock-out', params))
      if (type === 'usage') requests.push(fetchReport('/work-orders', params))
      if (type === 'suppliers') requests.push(fetchReport('/reports/purchases', params))
      if (type !== 'stock' && priorRange) requests.push(fetchReport(type === 'suppliers' ? '/reports/purchases' : config.endpoint, priorRange))
      const results = await Promise.all(requests)
      setReport(results[0])
      if (type === 'stock') setMovementRows([...results[1].rows.map((row) => ({ ...row, movement: 'in', date: row.created_at, chartValue: Number(row.quantity) })), ...results[2].rows.map((row) => ({ ...row, movement: 'out', date: row.created_at, chartValue: -Number(row.quantity) }))].sort((a, b) => new Date(b.date) - new Date(a.date)))
      if (type === 'usage') setWorkOrders(results[1].rows)
      if (type === 'suppliers') setMovementRows(results[1].rows)
      const priorIndex = requests.length - 1
      if (type !== 'stock' && priorRange) {
        const prior = results[priorIndex].rows
        setPreviousRows(type === 'usage'
          ? prior.map((item) => ({ date: item.created_at, chartValue: Number(item.quantity) }))
          : prior.flatMap((order) => (order.items || []).map((item) => ({ date: order.order_date, chartValue: Number(item.unit_price || 0) * Number(item.quantity || 0) }))))
      } else setPreviousRows([])
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) setError(errorMessage(requestError, 'Laporan gagal dimuat.'))
    } finally { setLoading(false) }
  }, [config.endpoint, range, type])

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])

  const workOrderMap = useMemo(() => new Map(workOrders.map((order) => [Number(order.id), order])), [workOrders])
  const purchaseRows = type === 'purchases' ? report.rows.flatMap((order) => (order.items || []).map((item) => ({ id: `${order.id}-${item.id}`, date: order.order_date, part: item.spare_part, reference: order.number, quantity: Number(item.quantity), unit: item.spare_part?.unit, user: order.user?.name || '-', total: Number(item.unit_price) * Number(item.quantity), orderStatus: order.status, chartValue: Number(item.unit_price) * Number(item.quantity) }))) : []
  const usageRows = type === 'usage' ? report.rows.map((item) => ({ id: item.id, date: item.created_at, part: item.spare_part, reference: item.work_order?.number || `WO-${item.work_order_id}`, quantity: -Number(item.quantity), unit: item.spare_part?.unit, user: workOrderMap.get(Number(item.work_order_id))?.mechanic?.name || '-', chartValue: Number(item.quantity) })) : []
  const supplierRows = type === 'suppliers' ? report.rows.map((supplier) => {
    const related = movementRows.filter((order) => Number(order.supplier_id) === Number(supplier.id))
    const total = related.reduce((sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0), 0)
    return { id: supplier.id, date: range.from, part: { name: supplier.name, code: supplier.email || supplier.phone }, reference: `${supplier.purchase_orders_count || 0} Purchase Order`, quantity: formatRupiah(total), user: supplier.contact_name || '-', total, pending: supplier.pending_order_count || 0, chartValue: total }
  }) : []
  const stockRows = type === 'stock' ? movementRows.map((row) => ({ ...row, part: row.spare_part, reference: row.notes || (row.reference_type ? `${row.reference_type} #${row.reference_id}` : '-'), quantity: (row.movement === 'in' ? 1 : -1) * Number(row.quantity), unit: row.spare_part?.unit, user: row.user?.name || '-' })) : []
  const rows = type === 'purchases' ? purchaseRows : type === 'usage' ? usageRows : type === 'suppliers' ? supplierRows : stockRows
  const normalizedQuery = search.trim().toLocaleLowerCase('id-ID')
  const filteredRows = rows.filter((row) => {
    const matchesSearch = `${row.part?.name || ''} ${row.part?.code || ''} ${row.reference || ''} ${row.user || ''}`.toLocaleLowerCase('id-ID').includes(normalizedQuery)
    const matchesRef = !referenceFilter || (type === 'stock' ? row.movement === referenceFilter : type === 'purchases' ? row.orderStatus === referenceFilter : type === 'suppliers' ? (referenceFilter === 'pending' ? row.pending > 0 : row.pending === 0) : true)
    return matchesSearch && matchesRef
  })
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE
  const visibleRows = filteredRows.slice(start, start + PAGE_SIZE)
  const pagination = { current_page: currentPage, last_page: pageCount, from: filteredRows.length ? start + 1 : 0, to: Math.min(start + PAGE_SIZE, filteredRows.length), total: filteredRows.length }
  const valueTotal = type === 'stock' ? Number(report.summary.purchase_value || 0) : type === 'purchases' ? Number(report.summary.ordered_value || 0) : type === 'usage' ? Number(report.summary.value || 0) : movementRows.reduce((sum, order) => sum + Number(order.ordered_value || 0), 0)
  const primaryValue = type === 'stock' || type === 'purchases' ? formatRupiah(valueTotal) : type === 'usage' ? `${formatNumber(report.summary.quantity)} item` : `${formatNumber(report.rows.length)} aktif`
  const secondaryValue = type === 'stock' ? `${formatNumber(report.summary.stock_quantity)} item` : type === 'purchases' ? `${formatNumber(report.summary.order_count)} PO` : type === 'usage' ? `${formatNumber(new Set(report.rows.map((row) => row.work_order_id)).size)} WO` : formatRupiah(valueTotal)
  const calculatedDays = Math.ceil((new Date(`${range.to}T00:00:00`) - new Date(`${range.from}T00:00:00`)) / 86400000) + 1
  const elapsedDays = Number.isFinite(calculatedDays) ? Math.max(1, calculatedDays) : 1
  const thirdValue = type === 'stock' ? `${formatNumber(report.summary.low_stock_count)} item` : type === 'usage' ? `${formatNumber(Math.round(Number(report.summary.quantity || 0) / elapsedDays))} item` : formatRupiah(valueTotal / elapsedDays)
  const chartRows = type === 'stock' ? movementRows : type === 'purchases' ? purchaseRows : type === 'usage' ? usageRows : movementRows.flatMap((order) => (order.items || []).map((item) => ({ date: order.order_date, chartValue: Number(item.unit_price || 0) * Number(item.quantity || 0) })))
  const badgeFor = (index) => {
    if (index !== 0) return 'Periode dipilih'
    if (type === 'stock') return `${formatNumber(report.summary.low_stock_count)} stok menipis`
    if (type === 'purchases') return `${formatNumber(report.summary.received_quantity)} unit diterima`
    if (type === 'usage') return `${formatNumber(report.rows.length)} transaksi`
    return `${formatNumber(report.rows.reduce((sum, row) => sum + Number(row.pending_order_count || 0), 0))} PO berjalan`
  }

  const columns = [
    { key: 'date', label: 'Tanggal', className: 'whitespace-nowrap text-[#55555c]', render: (row) => formatDate(row.date), value: (row) => formatDate(row.date) },
    { key: 'part', label: type === 'suppliers' ? 'Supplier' : 'Spare Part', render: (row) => <div className="flex items-center gap-3"><PartAvatar /><div><p className="font-medium text-[#222226]">{row.part?.name || '-'}</p><p className="text-[10px] text-[#77767e]">{row.part?.code || ''}</p></div></div>, value: (row) => row.part?.name || '-' },
    { key: 'reference', label: 'Referensi', render: (row) => <span className="font-medium">{row.reference || '-'}</span>, value: (row) => row.reference || '-' },
    { key: 'quantity', label: type === 'suppliers' ? 'Nilai Pembelian' : 'Jumlah', className: 'whitespace-nowrap', render: (row) => type === 'suppliers' ? <span className="font-semibold text-[#222226]">{row.quantity}</span> : <span className={`font-semibold ${row.quantity < 0 ? 'text-red-600' : 'text-[#16834b]'}`}>{row.quantity > 0 ? '+' : ''}{formatNumber(row.quantity)} {row.unit || ''}</span>, value: (row) => type === 'suppliers' ? row.quantity : `${row.quantity} ${row.unit || ''}` },
    { key: 'user', label: type === 'suppliers' ? 'Kontak' : 'Petugas', render: (row) => row.user || '-', value: (row) => row.user || '-' },
  ]
  const toolbar = <>
    <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Cari di sini..." className="w-[min(34vw,230px)]" />
    <div className="relative"><button type="button" onClick={() => setFilterOpen((value) => !value)} aria-label="Filter laporan" aria-expanded={filterOpen} className="grid h-11 w-11 place-items-center rounded-full border border-[#e2e2e5] bg-white text-[#55555d] hover:bg-[#f7f7f8]"><Icon name="filter" className="h-5 w-5" /></button>{filterOpen && <div className="absolute right-0 top-12 z-30 w-48 rounded-xl border border-[#e5e5e8] bg-white p-3 shadow-xl"><label className="text-[10px] font-medium text-[#55555c]">{type === 'stock' ? 'Jenis mutasi' : type === 'purchases' ? 'Status PO' : type === 'suppliers' ? 'Status supplier' : 'Filter laporan'}<select value={referenceFilter} onChange={(event) => { setReferenceFilter(event.target.value); setPage(1) }} className="mt-2 h-9 w-full rounded-lg border border-[#e1e1e5] bg-white px-2 text-[10px] outline-none focus:border-[#a5b900]"><option value="">Semua referensi</option>{type === 'stock' && <><option value="in">Stok masuk</option><option value="out">Stok keluar</option></>}{type === 'purchases' && <><option value="ordered">Dipesan</option><option value="partial">Diterima sebagian</option><option value="received">Diterima</option><option value="draft">Draft</option></>}{type === 'suppliers' && <><option value="pending">Ada PO berjalan</option><option value="complete">Tidak ada PO berjalan</option></>}</select></label></div>}</div>
  </>
  const dayLabel = range.from && range.to ? `${formatDate(range.from, { day: '2-digit', month: 'short', year: 'numeric' })} – ${formatDate(range.to, { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Pilih periode'

  return <AppLayout title={config.title} subtitle="Berikut ringkasan bengkel hari ini." toolbar={toolbar}>
    {error && <Alert tone="error" className="mb-4">{error}<button type="button" onClick={load} className="ml-2 font-semibold underline">Coba lagi</button></Alert>}
    <div className="report-content -mx-2">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex h-10 items-center gap-2 rounded-full border border-[#e2e2e5] bg-white px-3 text-[10px] text-[#55555c]"><Icon name="calendar" className="h-4 w-4"/><span className="hidden sm:inline">{dayLabel}</span><input aria-label="Tanggal mulai laporan" type="date" value={range.from} max={range.to || undefined} onChange={(event) => { setRange((value) => ({ ...value, from: event.target.value })); setPage(1) }} className="absolute inset-0 cursor-pointer opacity-0"/><input aria-label="Tanggal akhir laporan" type="date" value={range.to} min={range.from || undefined} onChange={(event) => { setRange((value) => ({ ...value, to: event.target.value })); setPage(1) }} className="absolute right-0 top-0 h-full w-8 cursor-pointer opacity-0"/></div>
        <div className="no-print flex gap-2"><button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e2e2e5] bg-white px-4 text-[10px] font-semibold hover:bg-[#f7f7f8]"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#f4f4f5]"><Icon name="download" className="h-3.5 w-3.5"/></span>Ekspor PDF</button><button type="button" onClick={() => exportCsv(`laporan-${type}-${toInputDate()}.csv`, columns, filteredRows)} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e2e2e5] bg-white px-4 text-[10px] font-semibold hover:bg-[#f7f7f8]"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#f4f4f5]"><Icon name="download" className="h-3.5 w-3.5"/></span>Ekspor Excel</button></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[{ label: config.primary, value: primaryValue, icon: 'chart', dark: true }, { label: config.secondary, value: secondaryValue, icon: 'box' }, { label: config.third, value: thirdValue, icon: 'cart' }].map((item, index) => <Card key={item.label} className={`min-h-[148px] p-4 sm:p-5 ${item.dark ? 'border-[#252527] bg-[#252527] text-white' : ''}`}><div className="flex items-center justify-between"><span className={`grid h-9 w-9 place-items-center rounded-full ${item.dark ? 'bg-[#dfff00]/30 text-[#dfff00]' : 'bg-[#dfff00]/35 text-[#18181a]'}`}><Icon name={item.icon} className="h-4 w-4"/></span><span className={`grid h-8 w-8 place-items-center rounded-full border ${item.dark ? 'border-white/20 text-white' : 'border-[#e5e5e8] text-[#77767e]'}`}><Icon name="arrow" className="h-4 w-4 -rotate-45"/></span></div><p className={`mt-4 text-[10px] ${item.dark ? 'text-white/65' : 'text-[#77767e]'}`}>{item.label}</p><p className="mt-2 truncate text-[22px] font-semibold tracking-[-.04em]">{loading ? '—' : item.value}</p><div className="mt-2 flex items-center gap-2"><Badge tone="green">{badgeFor(index)}</Badge>{index > 0 && <span className={`text-[9px] ${item.dark ? 'text-white/50' : 'text-[#9999a1]'}`}>Sesuai periode</span>}</div></Card>)}
      </div>
      <TrendChart title={config.trend} rows={chartRows} range={range} previousRows={previousRows} priorRange={getPreviousRange(range)} stockMode={type === 'stock'} metric={type === 'purchases' || type === 'suppliers' ? 'money' : 'quantity'} />
      <Card className="mt-5 p-5 sm:p-6">
        <h2 className="text-[14px] font-semibold">{config.details}</h2>
        <div className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-3"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Cari transaksi..." className="w-full sm:w-[280px]"/><span className="text-[10px] text-[#77767e]">{dayLabel}</span></div>
        <DataTable columns={columns} rows={visibleRows} loading={loading} error={error} onRetry={load} emptyText="Belum ada data laporan untuk periode ini." rowKey={(row) => row.id}/>
        <Pagination meta={pagination} onPageChange={setPage}/>
      </Card>
    </div>
    <style>{`@media print { @page { size: landscape; margin: 12mm; } body { background: white !important; } .report-content { margin: 0 !important; } .report-content section { break-inside: avoid; box-shadow: none !important; } }`}</style>
  </AppLayout>
}

export default ReportPage
