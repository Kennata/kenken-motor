import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Alert, Button, Card, DataTable, DateRange, Pagination, PartAvatar, SearchInput, SelectFilter } from '../../components/ui'
import { useDebouncedValue, useResourceList } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { cachedFetchAll } from '../../lib/apiHelpers'
import { formatDateTime, formatNumber } from '../../lib/format'

const config = {
  in: {
    title: 'Stok Masuk',
    subtitle: 'Riwayat barang masuk yang tercatat otomatis dari penerimaan barang.',
    endpoint: '/stock-in',
    action: { label: 'Catat Stok Masuk', to: '/procurement/goods-receipts' },
    note: 'Stok masuk bertambah otomatis saat penerimaan barang dari purchase order dikonfirmasi.',
  },
  out: {
    title: 'Stok Keluar',
    subtitle: 'Riwayat barang keluar yang tercatat otomatis dari work order.',
    endpoint: '/stock-out',
    action: { label: 'Catat Stok Keluar', to: '/bengkel/work-orders' },
    note: 'Stok keluar berkurang otomatis saat spare part dipakai pada work order.',
  },
}

// FR-02: riwayat pembaruan stok otomatis.
function StockMovementsPage({ type }) {
  const { title, subtitle, endpoint, action, note } = config[type]
  const [search, setSearch] = useState('')
  const [partId, setPartId] = useState('')
  const [range, setRange] = useState({ from: '', to: '' })
  const [page, setPage] = useState(1)
  const [parts, setParts] = useState([])
  const q = useDebouncedValue(search)
  const { rows, meta, loading, error, reload } = useResourceList(endpoint, { q, spare_part_id: partId, from: range.from, to: range.to, page, per_page: 10 })

  useEffect(() => {
    cachedFetchAll(api, '/spare-parts').then(setParts).catch(() => {})
  }, [])

  const sign = type === 'in' ? '+' : '−'
  const columns = [
    { key: 'date', label: 'Tanggal', className: 'whitespace-nowrap text-[#55555c]', render: (row) => formatDateTime(row.created_at) },
    { key: 'part', label: 'Spare Part', render: (row) => <div className="flex items-center gap-3"><PartAvatar /><div><p className="font-medium text-[#222226]">{row.spare_part?.name || '-'}</p><p className="text-[10px] text-[#77767e]">{row.spare_part?.code}</p></div></div> },
    { key: 'reference', label: 'Referensi', render: (row) => <span className="font-medium">{row.notes || '-'}</span> },
    { key: 'quantity', label: 'Jumlah', className: 'whitespace-nowrap', render: (row) => <span className={`font-semibold ${type === 'in' ? 'text-[#23874a]' : 'text-red-600'}`}>{sign}{formatNumber(row.quantity)} {row.spare_part?.unit}</span> },
    { key: 'stock', label: 'Stok', className: 'whitespace-nowrap text-[#55555c]', render: (row) => `${formatNumber(row.stock_before)} → ${formatNumber(row.stock_after)}` },
    { key: 'user', label: 'Petugas', render: (row) => row.user?.name || '-' },
  ]

  function resetPage(setter) { return (value) => { setter(value); setPage(1) } }

  return (
    <AppLayout title={title} subtitle={subtitle} actions={<Button icon="plus" to={action.to}>{action.label}</Button>}>
      <Card>
        <Alert className="mb-4">{note}</Alert>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SearchInput value={search} onChange={resetPage(setSearch)} placeholder="Cari transaksi atau referensi..." className="w-full sm:w-[260px]" />
          <div className="flex flex-wrap items-center gap-2">
            <DateRange from={range.from} to={range.to} onChange={resetPage(setRange)} />
            <SelectFilter label="Filter spare part" value={partId} onChange={resetPage(setPartId)} className="w-[200px]">
              <option value="">Semua spare part</option>
              {parts.map((part) => <option key={part.id} value={part.id}>{part.name}</option>)}
            </SelectFilter>
          </div>
        </div>
        <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} emptyText={`Belum ada riwayat ${title.toLowerCase()} untuk filter ini.`} />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>
    </AppLayout>
  )
}

export default StockMovementsPage
