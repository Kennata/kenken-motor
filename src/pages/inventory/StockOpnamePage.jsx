import { useCallback, useEffect, useMemo, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { notifyStockChanged } from '../../lib/stockEvents'
import { Alert, Badge, Button, Card, DataTable, DateRange, Field, Modal, Pagination, PartAvatar, SearchInput, inputClass } from '../../components/ui'
import { handleUnauthorized, useDebouncedValue, useResourceList } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { errorMessage, fetchAll, fieldErrorsFrom } from '../../lib/apiHelpers'
import { formatDate, formatNumber, toInputDate } from '../../lib/format'

function DifferenceText({ value }) {
  if (value === 0 || Number.isNaN(value)) return <span className="font-semibold text-[#77767e]">0</span>
  return <span className={`font-semibold ${value > 0 ? 'text-[#23874a]' : 'text-red-600'}`}>{value > 0 ? `+${value}` : value}</span>
}

// FR-03: form pencatatan stock opname fisik.
function OpnameForm() {
  const [parts, setParts] = useState([])
  const [counts, setCounts] = useState({})
  const [itemNotes, setItemNotes] = useState({})
  const [date, setDate] = useState(toInputDate())
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState('')

  const loadParts = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const rows = await fetchAll(api, '/spare-parts')
      setParts(rows)
      setCounts(Object.fromEntries(rows.map((part) => [part.id, String(part.stock ?? 0)])))
      setItemNotes({})
    } catch (error) {
      if (!handleUnauthorized(error)) setLoadError(errorMessage(error, 'Data spare part gagal dimuat.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(loadParts, 0)
    return () => window.clearTimeout(timer)
  }, [loadParts])

  const differences = useMemo(() => Object.fromEntries(parts.map((part) => [part.id, Number(counts[part.id]) - Number(part.stock || 0)])), [parts, counts])
  const changedCount = parts.filter((part) => counts[part.id] !== '' && differences[part.id] !== 0).length
  const emptyCount = parts.filter((part) => counts[part.id] === '').length
  const visibleParts = parts.filter((part) => `${part.name} ${part.code}`.toLowerCase().includes(search.toLowerCase()))

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    setFieldErrors({})
    setSuccess('')
    if (emptyCount > 0) { setSubmitError(`${emptyCount} spare part belum diisi stok fisiknya.`); return }
    setSaving(true)
    try {
      await api.post('/stock-opnames', {
        opname_date: date,
        notes: notes.trim() || undefined,
        items: parts.map((part) => ({
          spare_part_id: part.id,
          system_stock: Number(part.stock || 0),
          physical_stock: Number(counts[part.id]),
          notes: itemNotes[part.id]?.trim() || undefined,
        })),
      })
      setSuccess(`Stock opname tanggal ${formatDate(date)} tersimpan. ${changedCount} barang memiliki selisih.`)
      setNotes('')
      notifyStockChanged()
      await loadParts()
    } catch (error) {
      setFieldErrors(fieldErrorsFrom(error))
      setSubmitError(errorMessage(error, 'Stock opname gagal disimpan.'))
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'name', label: 'Nama Spare Part', render: (part) => <div className="flex items-center gap-3"><PartAvatar /><span className="font-medium text-[#222226]">{part.name}</span></div> },
    { key: 'code', label: 'SKU / Kode', className: 'whitespace-nowrap text-[#55555c]' },
    { key: 'category', label: 'Kategori', render: (part) => part.category?.name || '-' },
    { key: 'system', label: 'Stok Sistem', align: 'right', render: (part) => <span className="font-semibold">{formatNumber(part.stock)}</span> },
    { key: 'physical', label: 'Stok Fisik', render: (part) => <input type="number" min="0" step="1" required aria-label={`Stok fisik ${part.name}`} value={counts[part.id] ?? ''} onChange={(event) => setCounts((current) => ({ ...current, [part.id]: event.target.value }))} className="h-9 w-20 rounded-lg border border-[#e1e1e5] px-2 text-[12px] outline-none focus:border-[#a5b900] focus:ring-2 focus:ring-[#dfff00]/25" /> },
    { key: 'difference', label: 'Selisih', align: 'right', render: (part) => (counts[part.id] === '' ? '-' : <DifferenceText value={differences[part.id]} />) },
    { key: 'notes', label: 'Catatan', render: (part) => <input type="text" maxLength={255} aria-label={`Catatan ${part.name}`} placeholder={differences[part.id] ? 'Alasan selisih' : 'Opsional'} value={itemNotes[part.id] || ''} onChange={(event) => setItemNotes((current) => ({ ...current, [part.id]: event.target.value }))} className="h-9 w-full min-w-[140px] rounded-lg border border-[#e1e1e5] px-2 text-[11px] outline-none focus:border-[#a5b900]" /> },
  ]

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <Alert className="mb-4">Masukkan jumlah stok fisik hasil hitung gudang. Selisih dihitung otomatis dan stok sistem akan disesuaikan setelah opname disimpan.</Alert>
        {success && <Alert tone="success" className="mb-4">{success}</Alert>}
        {(submitError || loadError) && <Alert tone="error" className="mb-4">{submitError || loadError}{loadError && <button type="button" onClick={loadParts} className="ml-2 font-semibold underline">Coba lagi</button>}</Alert>}

        <div className="mb-4 grid gap-3 sm:grid-cols-[180px_1fr]">
          <Field label="Tanggal Opname" error={fieldErrors.opname_date}><input type="date" className={inputClass} value={date} max={toInputDate()} onChange={(event) => setDate(event.target.value)} required /></Field>
          <Field label="Catatan Opname (opsional)" error={fieldErrors.notes}><input type="text" className={inputClass} value={notes} maxLength={255} onChange={(event) => setNotes(event.target.value)} placeholder="Contoh: Opname akhir bulan gudang utama" /></Field>
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari spare part..." className="w-full sm:w-[260px]" />
          <div className="flex gap-2 text-[11px]"><Badge tone="gray">{parts.length} barang</Badge><Badge tone={changedCount ? 'amber' : 'green'}>{changedCount} selisih</Badge></div>
        </div>
        <DataTable columns={columns} rows={visibleParts} loading={loading} emptyText="Spare part tidak ditemukan." />

        <div className="mt-5 flex justify-end">
          <Button type="submit" icon="check" disabled={saving || loading || parts.length === 0}>{saving ? 'Menyimpan...' : 'Simpan Stock Opname'}</Button>
        </div>
      </form>
    </Card>
  )
}

function OpnameDetail({ opname, onClose }) {
  const columns = [
    { key: 'name', label: 'Spare Part', render: (item) => <div><p className="font-medium text-[#222226]">{item.spare_part?.name || '-'}</p><p className="text-[10px] text-[#77767e]">{item.spare_part?.code}</p></div> },
    { key: 'system_stock', label: 'Sistem', align: 'right' },
    { key: 'physical_stock', label: 'Fisik', align: 'right' },
    { key: 'difference', label: 'Selisih', align: 'right', render: (item) => <DifferenceText value={Number(item.difference ?? item.physical_stock - item.system_stock)} /> },
    { key: 'notes', label: 'Catatan', render: (item) => item.notes || '-' },
  ]
  return (
    <Modal title={opname.number} description={`${formatDate(opname.opname_date)} · oleh ${opname.user?.name || '-'}${opname.notes ? ` · ${opname.notes}` : ''}`} onClose={onClose} size="max-w-[760px]">
      <div className="mt-5"><DataTable columns={columns} rows={opname.items || []} emptyText="Tidak ada item." /></div>
    </Modal>
  )
}

function OpnameHistory() {
  const [search, setSearch] = useState('')
  const [range, setRange] = useState({ from: '', to: '' })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const q = useDebouncedValue(search)
  const { rows, meta, loading, error, reload } = useResourceList('/stock-opnames', { q, from: range.from, to: range.to, page, per_page: 10 })

  const columns = [
    { key: 'number', label: 'Nomor', className: 'whitespace-nowrap font-semibold text-[#222226]' },
    { key: 'date', label: 'Tanggal', className: 'whitespace-nowrap', render: (row) => formatDate(row.opname_date) },
    { key: 'items', label: 'Jumlah Barang', render: (row) => `${row.items?.length || 0} barang` },
    { key: 'diff', label: 'Barang Selisih', render: (row) => { const count = (row.items || []).filter((item) => Number(item.difference) !== 0).length; return <Badge tone={count ? 'amber' : 'green'}>{count} selisih</Badge> } },
    { key: 'user', label: 'Petugas', render: (row) => row.user?.name || '-' },
    { key: 'action', label: '', align: 'right', render: (row) => <Button variant="outline" className="h-8" onClick={() => setSelected(row)}>Lihat Detail</Button> },
  ]

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Cari nomor opname..." className="w-full sm:w-[260px]" />
        <DateRange from={range.from} to={range.to} onChange={(value) => { setRange(value); setPage(1) }} />
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} emptyText="Belum ada riwayat stock opname." />
      <Pagination meta={meta} onPageChange={setPage} />
      {selected && <OpnameDetail opname={selected} onClose={() => setSelected(null)} />}
    </Card>
  )
}

function StockOpnamePage() {
  const [tab, setTab] = useState('form')
  const tabClass = (active) => `h-9 rounded-full px-4 text-[11px] font-semibold transition ${active ? 'bg-[#18181a] text-white' : 'text-[#55555c] hover:bg-white'}`
  return (
    <AppLayout title="Stock Opname" subtitle="Cocokkan stok fisik gudang dengan stok di sistem.">
      <div role="tablist" aria-label="Stock opname" className="mb-4 inline-flex gap-1 rounded-full border border-[#e5e5e8] bg-[#ececef] p-1">
        <button type="button" role="tab" aria-selected={tab === 'form'} className={tabClass(tab === 'form')} onClick={() => setTab('form')}>Catat Opname</button>
        <button type="button" role="tab" aria-selected={tab === 'history'} className={tabClass(tab === 'history')} onClick={() => setTab('history')}>Riwayat Opname</button>
      </div>
      {tab === 'form' ? <OpnameForm /> : <OpnameHistory />}
    </AppLayout>
  )
}

export default StockOpnamePage
