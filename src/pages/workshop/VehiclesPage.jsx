import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import Icon from '../../components/Icon'
import { Alert, Button, Card, DataTable, Field, Modal, Pagination, SearchInput, inputClass } from '../../components/ui'
import { handleUnauthorized } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { errorMessage, fetchAll, fieldErrorsFrom, objectFrom } from '../../lib/apiHelpers'
import { formatDate, formatRupiah } from '../../lib/format'

const PAGE_SIZE = 8
const EMPTY_VEHICLE = { owner_name: '', phone: '', plate_number: '', brand: '', type: '', year: '' }

function VehicleFormModal({ onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_VEHICLE)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  function update(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: name === 'plate_number' ? value.toUpperCase() : value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})
    const body = {
      owner_name: form.owner_name.trim(),
      phone: form.phone.trim() || null,
      plate_number: form.plate_number.trim().toUpperCase(),
      brand: form.brand.trim(),
      type: form.type.trim(),
      year: form.year ? Number(form.year) : null,
    }
    try {
      const saved = objectFrom(await api.post('/vehicles', body))
      await onSaved(saved)
      onClose()
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) {
        setFieldErrors(fieldErrorsFrom(requestError))
        setError(errorMessage(requestError, 'Data kendaraan gagal disimpan.'))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Tambah Kendaraan" description="Lengkapi data kendaraan pelanggan bengkel." onClose={onClose} busy={saving}>
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      <form onSubmit={submit} className="mt-5">
        <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
          <Field label="Nama Pelanggan" error={fieldErrors.owner_name}><input className={inputClass} name="owner_name" value={form.owner_name} onChange={update} placeholder="Nama pemilik kendaraan" maxLength={255} required autoFocus /></Field>
          <Field label="Nomor Telepon" error={fieldErrors.phone}><input className={inputClass} name="phone" type="tel" value={form.phone} onChange={update} placeholder="08xx xxxx xxxx" maxLength={50} /></Field>
          <Field label="Plat Nomor" error={fieldErrors.plate_number}><input className={inputClass} name="plate_number" value={form.plate_number} onChange={update} placeholder="D 1234 ABC" maxLength={30} required /></Field>
          <Field label="Merek" error={fieldErrors.brand}><input className={inputClass} name="brand" value={form.brand} onChange={update} placeholder="Honda" maxLength={100} required /></Field>
          <Field label="Tipe Kendaraan" error={fieldErrors.type}><input className={inputClass} name="type" value={form.type} onChange={update} placeholder="Vario 125" maxLength={100} required /></Field>
          <Field label="Tahun" error={fieldErrors.year}><input className={inputClass} name="year" type="number" min="1900" max={new Date().getFullYear() + 1} value={form.year} onChange={update} placeholder="2024" /></Field>
        </div>
        <footer className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button type="submit" icon="check" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Kendaraan'}</Button>
        </footer>
      </form>
    </Modal>
  )
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'KN'
}

function VehiclesPage() {
  const [vehicles, setVehicles] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [historyLoading, setHistoryLoading] = useState(true)

  async function loadVehicles() {
    setLoading(true)
    setError('')
    try {
      setVehicles(await fetchAll(api, '/vehicles'))
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) setError(errorMessage(requestError, 'Data kendaraan gagal dimuat.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(loadVehicles, 0)
    async function loadWorkOrders() {
      setHistoryLoading(true)
      setHistoryError('')
      try {
        const rows = await fetchAll(api, '/work-orders')
        if (active) setWorkOrders(rows.sort((a, b) => String(b.completed_at || b.created_at).localeCompare(String(a.completed_at || a.created_at))))
      } catch (requestError) {
        if (!handleUnauthorized(requestError) && active) setHistoryError(errorMessage(requestError, 'Riwayat servis gagal dimuat.'))
      } finally {
        if (active) setHistoryLoading(false)
      }
    }
    const historyTimer = window.setTimeout(loadWorkOrders, 0)
    return () => { active = false; window.clearTimeout(timer); window.clearTimeout(historyTimer) }
  }, [])

  const normalizedSearch = search.trim().toLocaleLowerCase('id-ID')
  const brands = [...new Set(vehicles.map((vehicle) => vehicle.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'))
  const years = [...new Set(vehicles.map((vehicle) => vehicle.year).filter(Boolean))].sort((a, b) => Number(b) - Number(a))
  const filteredVehicles = useMemo(() => vehicles.filter((vehicle) => {
    const searchable = `${vehicle.owner_name || ''} ${vehicle.plate_number || ''} ${vehicle.brand || ''} ${vehicle.type || ''}`.toLocaleLowerCase('id-ID')
    return searchable.includes(normalizedSearch) && (!brandFilter || vehicle.brand === brandFilter) && (!yearFilter || String(vehicle.year) === yearFilter)
  }), [vehicles, normalizedSearch, brandFilter, yearFilter])
  const pageCount = Math.max(1, Math.ceil(filteredVehicles.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE
  const rows = filteredVehicles.slice(start, start + PAGE_SIZE)
  const meta = { current_page: currentPage, last_page: pageCount, from: filteredVehicles.length ? start + 1 : 0, to: Math.min(start + PAGE_SIZE, filteredVehicles.length), total: filteredVehicles.length }
  const selectedVehicle = rows.find((vehicle) => vehicle.id === selectedId) || vehicles.find((vehicle) => vehicle.id === selectedId) || rows[0] || null
  const recentWorkOrders = selectedVehicle ? workOrders.filter((order) => Number(order.vehicle_id) === Number(selectedVehicle.id)).slice(0, 3) : []

  function changeSearch(value) { setSearch(value); setPage(1) }

  const columns = [
    { key: 'owner_name', label: 'Pelanggan', render: (vehicle) => <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f2f2f3] text-[9px] font-semibold text-[#62616a]">{initials(vehicle.owner_name)}</span><span className="truncate font-medium text-[#222226]">{vehicle.owner_name}</span></div> },
    { key: 'plate_number', label: 'Plat Nomor', className: 'whitespace-nowrap', render: (vehicle) => <span className="inline-flex rounded-md border border-[#e2e2e5] bg-white px-2 py-1 text-[9px] font-medium text-[#33333a]">{vehicle.plate_number}</span> },
    { key: 'brand', label: 'Merek', className: 'whitespace-nowrap', render: (vehicle) => vehicle.brand || '-' },
    { key: 'type', label: 'Tipe', className: 'whitespace-nowrap', render: (vehicle) => vehicle.type || '-' },
    { key: 'year', label: 'Tahun', className: 'whitespace-nowrap', render: (vehicle) => vehicle.year || '-' },
    { key: 'history', label: 'Aksi', align: 'right', render: (vehicle) => <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedId(vehicle.id) }} className="whitespace-nowrap text-[9px] font-semibold text-[#222226] hover:text-[#748400]">Lihat riwayat</button> },
  ]

  const toolbar = (
    <>
      <SearchInput value={search} onChange={changeSearch} placeholder="Cari di sini..." className="w-[min(38vw,230px)]" />
      <button type="button" onClick={() => setFilterOpen((open) => !open)} aria-label="Buka filter kendaraan" aria-expanded={filterOpen} className="grid h-11 w-11 place-items-center rounded-full border border-[#e2e2e5] bg-white text-[#55555d] hover:bg-[#f7f7f8]"><Icon name="filter" className="h-5 w-5" /></button>
    </>
  )

  return (
    <AppLayout title="Data Kendaraan" subtitle="Berikut ringkasan bengkel hari ini." toolbar={toolbar} actions={<Button icon="plus" onClick={() => setShowAdd(true)}>Tambah Kendaraan</Button>} roles={['owner', 'mekanik']}>
      <div className="-mx-2 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SearchInput value={search} onChange={changeSearch} placeholder="Cari pelanggan atau plat..." className="w-full sm:w-[280px]" />
            <div className="relative flex items-center gap-2">
              <label className="relative block"><span className="sr-only">Filter merek kendaraan</span><select value={brandFilter} onChange={(event) => { setBrandFilter(event.target.value); setPage(1) }} className="h-10 w-[126px] appearance-none rounded-full border border-[#e2e2e5] bg-white pl-4 pr-8 text-[10px] text-[#55555c] outline-none focus:border-[#a5b900]"><option value="">Semua kategori</option>{brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select><Icon name="chevronDown" className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-[#77767e]" /></label>
              <button type="button" onClick={() => setFilterOpen((open) => !open)} aria-label="Filter tahun kendaraan" aria-expanded={filterOpen} className="grid h-10 w-10 place-items-center rounded-full border border-[#e2e2e5] bg-white text-[#55555d] hover:bg-[#f7f7f8]"><Icon name="filter" className="h-4 w-4" /></button>
              {filterOpen && <div className="absolute right-0 top-12 z-30 w-44 rounded-xl border border-[#e5e5e8] bg-white p-3 shadow-xl"><label className="text-[10px] font-medium text-[#55555c]">Tahun kendaraan<select value={yearFilter} onChange={(event) => { setYearFilter(event.target.value); setPage(1) }} className="mt-2 h-9 w-full rounded-lg border border-[#e1e1e5] bg-white px-2 text-[10px] outline-none focus:border-[#a5b900]"><option value="">Semua tahun</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div>}
            </div>
          </div>
          <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={loadVehicles} emptyText="Kendaraan tidak ditemukan." onRowClick={(vehicle) => setSelectedId(vehicle.id)} selectedKey={selectedVehicle?.id} />
          <Pagination meta={meta} onPageChange={setPage} />
        </Card>

        <Card className="p-5">
          <h2 className="text-[14px] font-semibold text-[#222226]">Riwayat Servis</h2>
          <p className="mt-1 truncate text-[10px] text-[#77767e]">{selectedVehicle ? `${selectedVehicle.plate_number} · ${selectedVehicle.brand} ${selectedVehicle.type}` : 'Pilih kendaraan pada tabel'}</p>
          {historyLoading && <p className="py-8 text-center text-[10px] text-[#77767e]">Memuat riwayat servis...</p>}
          {!historyLoading && historyError && <Alert tone="error" className="mt-4">{historyError}</Alert>}
          {!historyLoading && !historyError && recentWorkOrders.length === 0 && <p className="py-8 text-center text-[10px] text-[#77767e]">Belum ada riwayat servis untuk kendaraan ini.</p>}
          {!historyLoading && !historyError && recentWorkOrders.length > 0 && <div className="mt-3 divide-y divide-[#ececef]">{recentWorkOrders.map((order) => (
            <div key={order.id} className="flex items-center gap-2.5 py-3 first:pt-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#dfff00]/35 text-[#222226]"><Icon name="wrench" className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-[#222226]">{order.complaint || order.number}</p><p className="mt-1 text-[9px] text-[#77767e]">{formatDate(order.completed_at || order.created_at)}</p></div>
              <span className="whitespace-nowrap text-[9px] font-semibold text-[#222226]">{formatRupiah(order.total ?? order.service_fee)}</span>
            </div>
          ))}</div>}
        </Card>
      </div>
      {showAdd && <VehicleFormModal onClose={() => setShowAdd(false)} onSaved={async () => { await loadVehicles(); setPage(1) }} />}
    </AppLayout>
  )
}

export default VehiclesPage
