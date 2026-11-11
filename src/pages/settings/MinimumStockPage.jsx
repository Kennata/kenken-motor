import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { notifyStockChanged } from '../../lib/stockEvents'
import { Alert, Badge, Button, Card, DataTable, Pagination, PartAvatar, SearchInput, SelectFilter } from '../../components/ui'
import { stockStatus } from '../../lib/stockStatus'
import { useDebouncedValue, useResourceList } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { cachedFetchAll, errorMessage } from '../../lib/apiHelpers'
import { formatNumber } from '../../lib/format'
import Link from '../../components/Link'

// FR-04: atur batas stok minimum yang memicu notifikasi stok menipis.
function MinimumStockPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [edits, setEdits] = useState({})
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const q = useDebouncedValue(search)
  const { rows, meta, loading, error, reload } = useResourceList('/spare-parts', { q, category_id: categoryId, page, per_page: 10 })
  const lowStock = useResourceList('/minimum-stock', { per_page: 1 })

  useEffect(() => {
    cachedFetchAll(api, '/categories').then(setCategories).catch(() => {})
  }, [])

  const changed = Object.entries(edits).filter(([, entry]) => entry.value !== '' && Number(entry.value) !== Number(entry.original))

  function updateValue(part, value) {
    setResult(null)
    setEdits((current) => ({ ...current, [part.id]: { value, original: part.min_stock, name: part.name } }))
  }

  async function saveChanges() {
    setSaving(true)
    setResult(null)
    const failures = []
    const failedIds = new Set()
    for (const [id, entry] of changed) {
      try {
        await api.patch(`/minimum-stock/${id}`, { min_stock: Number(entry.value) })
      } catch (requestError) {
        failedIds.add(id)
        failures.push(`${entry.name}: ${errorMessage(requestError, 'gagal disimpan')}`)
      }
    }
    const savedCount = changed.length - failures.length
    setEdits((current) => Object.fromEntries(Object.entries(current).filter(([id]) => failedIds.has(id))))
    setResult({ savedCount, failures })
    setSaving(false)
    await Promise.all([reload(), lowStock.reload()])
    notifyStockChanged()
  }

  const lowCount = lowStock.meta?.total ?? 0
  const columns = [
    { key: 'name', label: 'Nama Spare Part', render: (part) => <div className="flex items-center gap-3"><PartAvatar /><span className="font-medium text-[#222226]">{part.name}</span></div> },
    { key: 'code', label: 'SKU / Kode', className: 'whitespace-nowrap text-[#55555c]' },
    { key: 'category', label: 'Kategori', render: (part) => part.category?.name || '-' },
    { key: 'stock', label: 'Stok', align: 'right', render: (part) => <span className="font-semibold">{formatNumber(part.stock)} <span className="font-normal text-[#77767e]">{part.unit}</span></span> },
    { key: 'min_stock', label: 'Minimum Stok', render: (part) => {
      const value = edits[part.id]?.value ?? String(part.min_stock ?? 0)
      const dirty = edits[part.id] && Number(value) !== Number(part.min_stock)
      return <input type="number" min="0" step="1" aria-label={`Minimum stok ${part.name}`} value={value} onChange={(event) => updateValue(part, event.target.value)} className={`h-9 w-20 rounded-lg border px-2 text-[12px] outline-none focus:ring-2 focus:ring-[#dfff00]/25 ${dirty ? 'border-[#a5b900] bg-[#dfff00]/10' : 'border-[#e1e1e5]'}`} />
    } },
    { key: 'status', label: 'Status', render: (part) => {
      const value = edits[part.id]?.value
      const preview = value !== undefined && value !== '' ? { ...part, min_stock: Number(value), is_low_stock: Number(part.stock) <= Number(value) } : part
      const status = stockStatus(preview)
      return <Badge tone={status.tone}>{status.label}</Badge>
    } },
  ]

  return (
    <AppLayout title="Pengaturan Minimum Stok" subtitle="Tentukan batas minimum untuk memicu peringatan stok menipis.">
      <div className="space-y-4">
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 place-items-center rounded-full text-[15px] font-bold ${lowCount ? 'bg-red-50 text-red-600' : 'bg-[#e7f5ea] text-[#23874a]'}`}>{lowCount}</span>
            <div><p className="text-[13px] font-semibold">{lowCount ? `${lowCount} spare part sudah mencapai batas minimum` : 'Semua stok masih di atas batas minimum'}</p><p className="text-[11px] text-[#77767e]">Barang masuk daftar peringatan ketika stok kurang dari atau sama dengan minimum stok.</p></div>
          </div>
          {lowCount > 0 && <Link to="/inventory/spare-parts?low_stock=1" className="text-[11px] font-semibold text-[#33333a] underline">Lihat barang menipis</Link>}
        </Card>

        <Card>
          <Alert className="mb-4">Sesuaikan batas minimum untuk menerima peringatan stok menipis. Perubahan dari beberapa halaman tabel disimpan sekaligus.</Alert>
          {result && result.savedCount > 0 && <Alert tone="success" className="mb-4">{result.savedCount} batas minimum berhasil diperbarui.</Alert>}
          {result && result.failures.length > 0 && <Alert tone="error" className="mb-4">{result.failures.map((failure) => <p key={failure}>{failure}</p>)}</Alert>}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Cari spare part..." className="w-full sm:w-[260px]" />
            <SelectFilter label="Filter kategori" value={categoryId} onChange={(value) => { setCategoryId(value); setPage(1) }} className="w-[180px]">
              <option value="">Semua kategori</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </SelectFilter>
          </div>
          <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} emptyText="Spare part tidak ditemukan." />
          <Pagination meta={meta} onPageChange={setPage} />
          <div className="mt-5 flex items-center justify-end gap-3">
            {changed.length > 0 && <span className="text-[11px] text-[#77767e]">{changed.length} perubahan belum disimpan</span>}
            {changed.length > 0 && <Button variant="outline" onClick={() => setEdits({})} disabled={saving}>Batalkan</Button>}
            <Button icon="check" onClick={saveChanges} disabled={saving || changed.length === 0}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}

export default MinimumStockPage
