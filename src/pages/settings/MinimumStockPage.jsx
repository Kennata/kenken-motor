import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { notifyStockChanged } from '../../lib/stockEvents'
import { Alert, Button, Card, DataTable, Pagination, PartAvatar, SearchInput, SelectFilter } from '../../components/ui'
import { useDebouncedValue, useResourceList } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { cachedFetchAll, errorMessage } from '../../lib/apiHelpers'
import { formatNumber } from '../../lib/format'
import Icon from '../../components/Icon'

// FR-04: atur batas stok minimum yang memicu notifikasi stok menipis.
function MinimumStockPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [edits, setEdits] = useState({})
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const q = useDebouncedValue(search)
  const { rows, meta, loading, error, reload } = useResourceList('/spare-parts', { q, category_id: categoryId, low_stock: lowOnly ? 1 : '', page, per_page: 8 })
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

  const columns = [
    { key: 'name', label: 'Nama Spare Part', render: (part) => <div className="flex items-center gap-3"><PartAvatar /><span className="font-medium text-[#222226]">{part.name}</span></div> },
    { key: 'code', label: 'SKU / Kode', className: 'whitespace-nowrap text-[#55555c]' },
    { key: 'stock', label: 'Stok', render: (part) => <span className="font-medium">{formatNumber(part.stock)}</span> },
    { key: 'min_stock', label: 'Minimum Stok', render: (part) => {
      const value = edits[part.id]?.value ?? String(part.min_stock ?? 0)
      const dirty = edits[part.id] && Number(value) !== Number(part.min_stock)
      return <input type="number" min="0" step="1" aria-label={`Minimum stok ${part.name}`} value={value} onChange={(event) => updateValue(part, event.target.value)} className={`h-9 w-20 rounded-lg border px-2 text-[12px] outline-none focus:ring-2 focus:ring-[#dfff00]/25 ${dirty ? 'border-[#a5b900] bg-[#dfff00]/10' : 'border-[#e1e1e5]'}`} />
    } },
  ]

  const toolbar = <><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Cari di sini..." className="w-[min(34vw,230px)]"/><button type="button" onClick={() => { setLowOnly((value) => !value); setPage(1) }} aria-label={lowOnly ? 'Tampilkan semua spare part' : 'Filter stok menipis'} aria-pressed={lowOnly} className={`grid h-11 w-11 place-items-center rounded-full border bg-white transition ${lowOnly ? 'border-[#dfff00] text-[#657000]' : 'border-[#e2e2e5] text-[#55555d]'}`}><Icon name="filter" className="h-5 w-5"/></button></>

  return (
    <AppLayout title="Pengaturan Minimum Stok" subtitle="Berikut ringkasan bengkel hari ini." toolbar={toolbar}>
        <Card>
          <Alert className="mb-4">Tentukan batas minimum untuk menerima peringatan stok menipis.</Alert>
          {result && result.savedCount > 0 && <Alert tone="success" className="mb-4">{result.savedCount} batas minimum berhasil diperbarui.</Alert>}
          {result && result.failures.length > 0 && <Alert tone="error" className="mb-4">{result.failures.map((failure) => <p key={failure}>{failure}</p>)}</Alert>}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Cari data..." className="w-full sm:w-[280px]" />
            <div className="flex items-center gap-2">
            <SelectFilter label="Filter kategori" value={categoryId} onChange={(value) => { setCategoryId(value); setPage(1) }} className="w-[180px]">
              <option value="">Semua kategori</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </SelectFilter>
            <button type="button" onClick={() => { setLowOnly((value) => !value); setPage(1) }} aria-label={lowOnly ? 'Tampilkan semua stok' : 'Tampilkan stok menipis'} aria-pressed={lowOnly} className={`grid h-10 w-10 place-items-center rounded-full border ${lowOnly ? 'border-[#dfff00] bg-[#dfff00]/20 text-[#657000]' : 'border-[#e2e2e5] bg-white text-[#55555d]'}`}><Icon name="filter" className="h-4 w-4"/></button>
            </div>
          </div>
          <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} emptyText="Spare part tidak ditemukan." />
          <Pagination meta={meta} onPageChange={setPage} />
          <div className="mt-5 flex items-center justify-end gap-3">
            {changed.length > 0 && <span className="text-[11px] text-[#77767e]">{changed.length} perubahan belum disimpan</span>}
            {changed.length > 0 && <Button variant="outline" onClick={() => setEdits({})} disabled={saving}>Batalkan</Button>}
            <Button icon="check" onClick={saveChanges} disabled={saving || changed.length === 0}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
          </div>
        </Card>
    </AppLayout>
  )
}

export default MinimumStockPage
