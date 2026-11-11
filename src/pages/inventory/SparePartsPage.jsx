import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { notifyStockChanged } from '../../lib/stockEvents'
import AddSparePartModal from '../../features/inventory/AddSparePartModal'
import { Badge, Button, Card, ConfirmDialog, DataTable, IconButton, Pagination, PartAvatar, SearchInput, SelectFilter } from '../../components/ui'
import { stockStatus } from '../../lib/stockStatus'
import { useDebouncedValue, useResourceList } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { cachedFetchAll, errorMessage, invalidateCache } from '../../lib/apiHelpers'
import { formatNumber, formatRupiah } from '../../lib/format'
import { navigate, useLocation } from '../../lib/router'
import { useCurrentUser } from '../../lib/userContext'
import { isOwner } from '../../lib/session'

// FR-01 (kelola spare part) + FR-04 (filter stok menipis).
function SparePartsContent({ editing, setEditing }) {
  const user = useCurrentUser()
  const owner = isOwner(user)
  const { search: query } = useLocation()
  const lowStockOnly = query.get('low_stock') === '1'
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState({})
  const [deleting, setDeleting] = useState(null)
  const [deleteState, setDeleteState] = useState({ busy: false, error: '' })
  const q = useDebouncedValue(search)

  const { rows, meta, loading, error, reload } = useResourceList('/spare-parts', { q, category_id: categoryId, low_stock: lowStockOnly ? 1 : '', page, per_page: 10 })

  useEffect(() => {
    cachedFetchAll(api, '/categories').then(setCategories).catch(() => {})
  }, [])

  // Endpoint supplier hanya untuk Owner; nama supplier dipetakan dari supplier_id.
  useEffect(() => {
    if (!owner) return
    cachedFetchAll(api, '/suppliers').then((list) => setSuppliers(Object.fromEntries(list.map((supplier) => [supplier.id, supplier.name])))).catch(() => {})
  }, [owner])

  function setFilter(setter) {
    return (value) => { setter(value); setPage(1) }
  }

  function toggleLowStock() {
    setPage(1)
    navigate(lowStockOnly ? '/inventory/spare-parts' : '/inventory/spare-parts?low_stock=1', { replace: true })
  }

  async function afterSave() {
    invalidateCache('/spare-parts')
    await reload()
    notifyStockChanged()
  }

  async function confirmDelete() {
    setDeleteState({ busy: true, error: '' })
    try {
      await api.delete(`/spare-parts/${deleting.id}`)
      invalidateCache('/spare-parts')
      setDeleting(null)
      setDeleteState({ busy: false, error: '' })
      if (rows.length === 1 && page > 1) setPage(page - 1)
      else await reload()
      notifyStockChanged()
    } catch (requestError) {
      setDeleteState({ busy: false, error: errorMessage(requestError, 'Spare part gagal dihapus. Barang yang sudah dipakai di transaksi mungkin tidak bisa dihapus.') })
    }
  }

  const columns = [
    { key: 'name', label: 'Nama Spare Part', render: (part) => <div className="flex items-center gap-3"><PartAvatar /><span className="font-medium text-[#222226]">{part.name}</span></div> },
    { key: 'code', label: 'SKU / Kode', className: 'whitespace-nowrap text-[#55555c]' },
    { key: 'category', label: 'Kategori', render: (part) => part.category?.name || '-' },
    { key: 'stock', label: 'Stok', align: 'right', render: (part) => <span className="font-semibold">{formatNumber(part.stock)}</span> },
    { key: 'unit', label: 'Satuan', className: 'capitalize' },
    { key: 'selling_price', label: 'Harga Jual', className: 'whitespace-nowrap', render: (part) => formatRupiah(part.selling_price) },
    ...(owner ? [{ key: 'supplier', label: 'Supplier', render: (part) => suppliers[part.supplier_id] || '-' }] : []),
    { key: 'status', label: 'Status', render: (part) => { const status = stockStatus(part); return <Badge tone={status.tone}>{status.label}</Badge> } },
    ...(owner ? [{ key: 'actions', label: 'Aksi', render: (part) => <div className="flex gap-1.5"><IconButton icon="edit" label={`Ubah ${part.name}`} onClick={() => setEditing(part)} /><IconButton icon="trash" tone="danger" label={`Hapus ${part.name}`} onClick={() => setDeleting(part)} /></div> }] : []),
  ]

  return (
    <>
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SearchInput value={search} onChange={setFilter(setSearch)} placeholder="Cari nama atau kode spare part..." className="w-full sm:w-[280px]" />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={toggleLowStock} aria-pressed={lowStockOnly} className={`h-10 rounded-full border px-4 text-[11px] font-medium transition ${lowStockOnly ? 'border-red-200 bg-red-50 text-red-600' : 'border-[#e2e2e5] bg-white text-[#33333a] hover:bg-[#f7f7f8]'}`}>Hanya stok menipis</button>
            <SelectFilter label="Filter kategori" value={categoryId} onChange={setFilter(setCategoryId)} className="w-[180px]">
              <option value="">Semua kategori</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </SelectFilter>
          </div>
        </div>
        <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} emptyText={lowStockOnly ? 'Tidak ada spare part dengan stok menipis.' : 'Spare part tidak ditemukan.'} />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>

      {editing && <AddSparePartModal sparePart={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={afterSave} />}
      {deleting && <ConfirmDialog title="Hapus spare part?" message={`"${deleting.name}" (${deleting.code}) akan dihapus permanen dari daftar persediaan.`} onConfirm={confirmDelete} onClose={() => { setDeleting(null); setDeleteState({ busy: false, error: '' }) }} busy={deleteState.busy} error={deleteState.error} />}
    </>
  )
}

function HeaderAddButton({ onAdd }) {
  const user = useCurrentUser()
  if (!isOwner(user)) return null
  return <Button icon="plus" onClick={onAdd}>Tambah Spare Part</Button>
}

function SparePartsPage() {
  const [editing, setEditing] = useState(null)
  return (
    <AppLayout title="Daftar Spare Part" subtitle="Kelola data spare part dan pantau ketersediaan stok." roles={['owner', 'mekanik']} actions={<HeaderAddButton onAdd={() => setEditing('new')} />}>
      <SparePartsContent editing={editing} setEditing={setEditing} />
    </AppLayout>
  )
}

export default SparePartsPage
