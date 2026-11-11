import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Badge, Button, Card, DataTable, DateRange, Pagination, SearchInput, SelectFilter } from '../../components/ui'
import { useDebouncedValue, useResourceList } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { cachedFetchAll } from '../../lib/apiHelpers'
import { formatDate, formatRupiah } from '../../lib/format'
import { PO_STATUSES, poStatus, poTotal } from '../../lib/purchaseOrderStatus'
import { navigate, useLocation } from '../../lib/router'

// FR-06: daftar purchase order.
function PurchaseOrdersPage() {
  const { search: query } = useLocation()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [supplierId, setSupplierId] = useState(query.get('supplier_id') || '')
  const [range, setRange] = useState({ from: '', to: '' })
  const [page, setPage] = useState(1)
  const [suppliers, setSuppliers] = useState([])
  const q = useDebouncedValue(search)
  const { rows, meta, loading, error, reload } = useResourceList('/purchase-orders', { q, status, supplier_id: supplierId, from: range.from, to: range.to, page, per_page: 10 })

  useEffect(() => {
    cachedFetchAll(api, '/suppliers').then(setSuppliers).catch(() => {})
  }, [])

  function resetPage(setter) { return (value) => { setter(value); setPage(1) } }

  const columns = [
    { key: 'number', label: 'Nomor PO', className: 'whitespace-nowrap font-semibold text-[#222226]' },
    { key: 'supplier', label: 'Supplier', render: (order) => order.supplier?.name || '-' },
    { key: 'date', label: 'Tanggal', className: 'whitespace-nowrap', render: (order) => formatDate(order.order_date) },
    { key: 'items', label: 'Item', render: (order) => `${order.items?.length || 0} barang` },
    { key: 'total', label: 'Total', className: 'whitespace-nowrap font-semibold', render: (order) => formatRupiah(poTotal(order)) },
    { key: 'status', label: 'Status', render: (order) => { const info = poStatus(order.status); return <Badge tone={info.tone}>{info.label}</Badge> } },
    { key: 'action', label: 'Aksi', align: 'right', render: (order) => <Button variant="outline" className="h-8" to={`/procurement/purchase-orders/${order.id}`}>Lihat Detail</Button> },
  ]

  return (
    <AppLayout title="Purchase Order" subtitle="Buat dan pantau pesanan pembelian ke supplier." actions={<Button icon="plus" to="/procurement/purchase-orders/new">Buat PO</Button>}>
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SearchInput value={search} onChange={resetPage(setSearch)} placeholder="Cari nomor PO..." className="w-full sm:w-[240px]" />
          <div className="flex flex-wrap items-center gap-2">
            <SelectFilter label="Filter status" value={status} onChange={resetPage(setStatus)} className="w-[170px]">
              <option value="">Semua status</option>
              {Object.entries(PO_STATUSES).map(([value, info]) => <option key={value} value={value}>{info.label}</option>)}
            </SelectFilter>
            <SelectFilter label="Filter supplier" value={supplierId} onChange={resetPage(setSupplierId)} className="w-[190px]">
              <option value="">Semua supplier</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </SelectFilter>
            <DateRange from={range.from} to={range.to} onChange={resetPage(setRange)} />
          </div>
        </div>
        <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} emptyText="Belum ada purchase order untuk filter ini." onRowClick={(order) => navigate(`/procurement/purchase-orders/${order.id}`)} />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>
    </AppLayout>
  )
}

export default PurchaseOrdersPage
