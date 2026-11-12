import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import Icon from '../../components/Icon'
import { Card, Pagination, SearchInput } from '../../components/ui'
import { handleUnauthorized } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { errorMessage, fetchAll } from '../../lib/apiHelpers'
import { formatDate, formatNumber } from '../../lib/format'

const PAGE_SIZE = 8

function monthLabel(value) {
  if (!value) return 'Semua Bulan'
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function SparePartUsagePage() {
  const [usages, setUsages] = useState([])
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadUsages() {
    setLoading(true)
    setError('')
    try {
      const [usageRows, workOrders] = await Promise.all([
        fetchAll(api, '/spare-part-usage'),
        fetchAll(api, '/work-orders'),
      ])
      const workOrderById = new Map(workOrders.map((order) => [Number(order.id), order]))
      const rows = usageRows.map((usage) => {
        const order = workOrderById.get(Number(usage.work_order_id)) || usage.work_order || {}
        return {
          ...usage,
          order,
          vehicle: order.vehicle || usage.work_order?.vehicle,
          mechanic_name: order.mechanic?.name || '-',
          usage_date: order.completed_at || usage.created_at,
        }
      }).sort((a, b) => String(b.usage_date).localeCompare(String(a.usage_date)))
      setUsages(rows)
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) setError(errorMessage(requestError, 'Data penggunaan spare part gagal dimuat.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(loadUsages, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => usages.filter((usage) => {
    const searchable = `${usage.order?.number || ''} ${usage.spare_part?.name || ''} ${usage.spare_part?.code || ''} ${usage.vehicle?.plate_number || ''} ${usage.vehicle?.owner_name || ''} ${usage.mechanic_name || ''}`.toLocaleLowerCase('id-ID')
    const matchesText = searchable.includes(search.trim().toLocaleLowerCase('id-ID'))
    const matchesMonth = !month || String(usage.usage_date || '').slice(0, 7) === month
    return matchesText && matchesMonth
  }), [usages, search, month])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE
  const rows = filtered.slice(start, start + PAGE_SIZE)
  const meta = { current_page: currentPage, last_page: pageCount, from: filtered.length ? start + 1 : 0, to: Math.min(start + PAGE_SIZE, filtered.length), total: filtered.length }
  const toolbar = (
    <>
      <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Cari di sini..." className="w-[min(38vw,230px)]" />
      <button type="button" onClick={() => setFilterOpen((open) => !open)} aria-label="Filter penggunaan spare part" aria-expanded={filterOpen} className="grid h-11 w-11 place-items-center rounded-full border border-[#e2e2e5] bg-white text-[#55555d] hover:bg-[#f7f7f8]"><Icon name="filter" className="h-5 w-5" /></button>
    </>
  )

  return (
    <AppLayout title="Penggunaan Spare Part" subtitle="Berikut ringkasan bengkel hari ini." toolbar={toolbar} roles={['owner', 'mekanik']}>
      <Card className="-mx-2 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Cari spare part atau WO..." className="w-full sm:w-[280px]" />
          <div className="relative">
            <button type="button" onClick={() => setFilterOpen((open) => !open)} aria-expanded={filterOpen} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e2e2e5] bg-white px-3.5 text-[10px] text-[#55555c]"><Icon name="calendar" className="h-4 w-4" />{monthLabel(month)}</button>
            {filterOpen && <div className="absolute right-0 top-12 z-30 w-52 rounded-xl border border-[#e5e5e8] bg-white p-3 shadow-xl"><label className="text-[10px] font-medium text-[#55555c]">Filter bulan<input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setPage(1) }} className="mt-2 h-9 w-full rounded-lg border border-[#e1e1e5] bg-white px-2 text-[10px] outline-none focus:border-[#a5b900]" /></label><button type="button" onClick={() => { setMonth(''); setPage(1) }} className="mt-2 text-[10px] font-medium text-[#55555c] underline">Tampilkan semua bulan</button></div>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-[10px]">
            <thead><tr>{['Tanggal', 'Work Order', 'Spare Part', 'Kendaraan', 'Jumlah', 'Mekanik'].map((label) => <th key={label} className="whitespace-nowrap border-b border-[#ececef] bg-[#f8f8f9] px-3 py-3 text-[9px] font-medium text-[#77767e] first:rounded-l-lg last:rounded-r-lg">{label}</th>)}</tr></thead>
            <tbody>
              {loading && Array.from({ length: 5 }, (_, index) => <tr key={index}>{Array.from({ length: 6 }, (_, cell) => <td key={cell} className="border-b border-[#f0f0f2] px-3 py-4"><span className="block h-3 w-3/4 animate-pulse rounded bg-[#efeff1]" /></td>)}</tr>)}
              {!loading && error && <tr><td colSpan="6" className="px-3 py-12 text-center text-red-600">{error}<button type="button" onClick={loadUsages} className="ml-2 font-semibold underline">Coba lagi</button></td></tr>}
              {!loading && !error && rows.length === 0 && <tr><td colSpan="6" className="px-3 py-12 text-center text-[#77767e]">Belum ada penggunaan spare part untuk filter ini.</td></tr>}
              {!loading && !error && rows.map((usage) => <tr key={usage.id} className="hover:bg-[#fafafa]">
                <td className="whitespace-nowrap border-b border-[#f0f0f2] px-3 py-3.5 text-[#55555c]">{formatDate(usage.usage_date)}</td>
                <td className="whitespace-nowrap border-b border-[#f0f0f2] px-3 py-3.5 font-semibold text-[#222226]">{usage.order?.number || '-'}</td>
                <td className="border-b border-[#f0f0f2] px-3 py-3.5"><div className="flex min-w-[170px] items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#f2f2f3] text-[#77767e]"><Icon name="wrench" className="h-3.5 w-3.5" /></span><span className="min-w-0"><span className="block truncate font-medium text-[#222226]">{usage.spare_part?.name || '-'}</span><span className="text-[9px] text-[#77767e]">{usage.spare_part?.code || ''}</span></span></div></td>
                <td className="whitespace-nowrap border-b border-[#f0f0f2] px-3 py-3.5 text-[#55555c]">{usage.vehicle?.plate_number || '-'}</td>
                <td className="whitespace-nowrap border-b border-[#f0f0f2] px-3 py-3.5 text-[#55555c]">{formatNumber(usage.quantity)} {usage.spare_part?.unit || 'unit'}</td>
                <td className="whitespace-nowrap border-b border-[#f0f0f2] px-3 py-3.5 text-[#55555c]">{usage.mechanic_name}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        {!loading && !error && <Pagination meta={meta} onPageChange={setPage} />}
      </Card>
    </AppLayout>
  )
}

export default SparePartUsagePage
