import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import Icon from '../../components/Icon'
import { Alert, Badge, Button, Card, ConfirmDialog, Field, Modal, Pagination, SearchInput, inputClass } from '../../components/ui'
import { handleUnauthorized } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { errorMessage, fetchAll, fieldErrorsFrom, objectFrom } from '../../lib/apiHelpers'
import { formatDateTime, formatNumber, formatRupiah, toInputDate } from '../../lib/format'
import { useCurrentUser } from '../../lib/userContext'

const PAGE_SIZE = 8
const STATUS_TABS = [
  { key: '', label: 'Semua' },
  { key: 'open', label: 'Baru' },
  { key: 'in_progress', label: 'Dikerjakan' },
  { key: 'completed', label: 'Selesai' },
]
const STATUS_INFO = {
  open: { label: 'Baru', tone: 'gray' },
  in_progress: { label: 'Dikerjakan', tone: 'amber' },
  completed: { label: 'Selesai', tone: 'green' },
  cancelled: { label: 'Dibatalkan', tone: 'red' },
}

function statusInfo(status) { return STATUS_INFO[status] || { label: status || '-', tone: 'gray' } }

function WorkOrderFormModal({ user, onClose, onSaved }) {
  const [vehicles, setVehicles] = useState([])
  const [mechanics, setMechanics] = useState([])
  const [form, setForm] = useState({ vehicle_id: '', mechanic_id: user?.role === 'mekanik' ? String(user.id) : '', complaint: '', notes: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    let active = true
    async function loadOptions() {
      try {
        const vehicleRows = await fetchAll(api, '/vehicles')
        const mechanicRows = user?.role === 'owner' ? await fetchAll(api, '/users') : []
        if (active) {
          setVehicles(vehicleRows)
          setMechanics(user?.role === 'owner' ? mechanicRows.filter((entry) => entry.role === 'mekanik') : [user].filter(Boolean))
        }
      } catch (requestError) {
        if (!handleUnauthorized(requestError) && active) setError(errorMessage(requestError, 'Pilihan kendaraan atau mekanik gagal dimuat.'))
      } finally {
        if (active) setLoading(false)
      }
    }
    const timer = window.setTimeout(loadOptions, 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [user])

  function update(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      const saved = objectFrom(await api.post('/work-orders', {
        vehicle_id: Number(form.vehicle_id),
        mechanic_id: Number(form.mechanic_id),
        complaint: form.complaint.trim(),
        status: 'open',
        notes: form.notes.trim() || null,
      }))
      await onSaved(saved)
      onClose()
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) {
        setFieldErrors(fieldErrorsFrom(requestError))
        setError(errorMessage(requestError, 'Work order gagal dibuat.'))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Buat Work Order" description="Pilih kendaraan dan mekanik, lalu jelaskan keluhan servis." onClose={onClose} busy={saving}>
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      <form onSubmit={submit} className="mt-5">
        <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
          <Field label="Kendaraan" error={fieldErrors.vehicle_id} className="sm:col-span-2"><select className={`${inputClass} appearance-none`} name="vehicle_id" value={form.vehicle_id} onChange={update} required disabled={loading || saving}><option value="">{loading ? 'Memuat kendaraan...' : 'Pilih kendaraan'}</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate_number} — {vehicle.owner_name} · {vehicle.brand} {vehicle.type}</option>)}</select></Field>
          <Field label="Mekanik" error={fieldErrors.mechanic_id} className="sm:col-span-2"><select className={`${inputClass} appearance-none`} name="mechanic_id" value={form.mechanic_id} onChange={update} required disabled={loading || saving || user?.role === 'mekanik'}><option value="">{loading ? 'Memuat mekanik...' : 'Pilih mekanik'}</option>{mechanics.map((mechanic) => <option key={mechanic.id} value={mechanic.id}>{mechanic.name}</option>)}</select></Field>
          <Field label="Keluhan / Pekerjaan Servis" error={fieldErrors.complaint} className="sm:col-span-2"><textarea className="min-h-[100px] w-full rounded-xl border border-[#e1e1e5] bg-white px-4 py-3 text-[12px] text-[#25252a] outline-none placeholder:text-[#92929a] focus:border-[#a5b900] focus:ring-2 focus:ring-[#dfff00]/25" name="complaint" value={form.complaint} onChange={update} placeholder="Contoh: Ganti oli dan periksa kampas rem" maxLength={5000} required disabled={saving} /></Field>
          <Field label="Catatan (opsional)" error={fieldErrors.notes} className="sm:col-span-2"><textarea className="min-h-[72px] w-full rounded-xl border border-[#e1e1e5] bg-white px-4 py-3 text-[12px] text-[#25252a] outline-none placeholder:text-[#92929a] focus:border-[#a5b900] focus:ring-2 focus:ring-[#dfff00]/25" name="notes" value={form.notes} onChange={update} placeholder="Catatan tambahan untuk mekanik" maxLength={2000} disabled={saving} /></Field>
        </div>
        <footer className="mt-6 flex justify-end gap-2.5"><Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button><Button type="submit" icon="check" disabled={loading || saving || !vehicles.length || !mechanics.length}>{saving ? 'Menyimpan...' : 'Buat Work Order'}</Button></footer>
      </form>
    </Modal>
  )
}

function WorkOrderDetailModal({ order, onClose, onUpdated }) {
  const [savingStatus, setSavingStatus] = useState('')
  const [error, setError] = useState('')
  const [confirmStatus, setConfirmStatus] = useState('')
  const status = statusInfo(order.status)
  const itemTotal = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0)
  const total = Number(order.service_fee || 0) + itemTotal

  async function updateStatus(nextStatus) {
    setSavingStatus(nextStatus)
    setError('')
    try {
      const updated = objectFrom(await api.patch(`/work-orders/${order.id}`, { status: nextStatus }))
      await onUpdated(updated)
      setConfirmStatus('')
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) setError(errorMessage(requestError, 'Status work order gagal diperbarui.'))
    } finally {
      setSavingStatus('')
    }
  }

  return (
    <Modal title={order.number} description="Detail pekerjaan servis dan status work order." onClose={onClose} busy={Boolean(savingStatus)}>
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><Badge tone={status.tone}>{status.label}</Badge><span className="text-[10px] text-[#77767e]">{formatDateTime(order.created_at)}</span></div>
      <dl className="mt-4 grid gap-3 rounded-2xl bg-[#f7f7f8] p-4 text-[11px] sm:grid-cols-2">
        <div><dt className="text-[#77767e]">Pelanggan</dt><dd className="mt-1 font-semibold">{order.vehicle?.owner_name || '-'}</dd></div>
        <div><dt className="text-[#77767e]">Kendaraan</dt><dd className="mt-1 font-semibold">{order.vehicle?.plate_number} · {order.vehicle?.brand} {order.vehicle?.type}</dd></div>
        <div><dt className="text-[#77767e]">Mekanik</dt><dd className="mt-1 font-semibold">{order.mechanic?.name || '-'}</dd></div>
        <div><dt className="text-[#77767e]">Biaya jasa</dt><dd className="mt-1 font-semibold">{formatRupiah(order.service_fee)}</dd></div>
      </dl>
      <div className="mt-4"><p className="text-[10px] font-medium text-[#77767e]">Keluhan / Pekerjaan</p><p className="mt-1 whitespace-pre-wrap text-[12px] text-[#222226]">{order.complaint}</p></div>
      {order.notes && <div className="mt-3"><p className="text-[10px] font-medium text-[#77767e]">Catatan</p><p className="mt-1 whitespace-pre-wrap text-[11px] text-[#33333a]">{order.notes}</p></div>}
      <div className="mt-5 overflow-hidden rounded-xl border border-[#e5e5e8]">
        <div className="flex justify-between bg-[#f8f8f9] px-3 py-2.5 text-[10px] font-medium text-[#77767e]"><span>Spare Part Terpakai</span><span>Subtotal</span></div>
        {(order.items || []).length === 0 && <p className="px-3 py-5 text-center text-[10px] text-[#77767e]">Belum ada spare part yang digunakan.</p>}
        {(order.items || []).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-t border-[#ececef] px-3 py-2.5 text-[10px]"><span className="min-w-0"><span className="block truncate font-medium">{item.spare_part?.name || 'Spare part'}</span><span className="text-[#77767e]">{formatNumber(item.quantity)} {item.spare_part?.unit || 'unit'} × {formatRupiah(item.unit_price)}</span></span><span className="shrink-0 font-semibold">{formatRupiah(Number(item.quantity) * Number(item.unit_price))}</span></div>)}
        <div className="flex justify-between border-t border-[#e5e5e8] px-3 py-3 text-[11px]"><span>Total</span><strong>{formatRupiah(total)}</strong></div>
      </div>
      {order.status !== 'completed' && order.status !== 'cancelled' && <footer className="mt-5 flex flex-wrap justify-end gap-2">
        {order.status === 'open' && <Button variant="outline" onClick={() => updateStatus('in_progress')} disabled={Boolean(savingStatus)}>{savingStatus === 'in_progress' ? 'Memproses...' : 'Mulai Dikerjakan'}</Button>}
        <Button onClick={() => order.status === 'in_progress' ? setConfirmStatus('completed') : setConfirmStatus('completed')} disabled={Boolean(savingStatus)}>{savingStatus === 'completed' ? 'Menyelesaikan...' : 'Tandai Selesai'}</Button>
        <Button variant="ghost" className="text-red-600" onClick={() => setConfirmStatus('cancelled')} disabled={Boolean(savingStatus)}>Batalkan</Button>
      </footer>}
      {confirmStatus && <ConfirmDialog title={confirmStatus === 'cancelled' ? 'Batalkan work order?' : 'Selesaikan work order?'} message={confirmStatus === 'cancelled' ? 'Work order dibatalkan. Stok spare part yang sudah dipakai akan dikembalikan oleh sistem.' : 'Pastikan pekerjaan servis sudah selesai sebelum menutup work order.'} confirmLabel={confirmStatus === 'cancelled' ? 'Ya, batalkan' : 'Ya, selesaikan'} confirmVariant={confirmStatus === 'cancelled' ? 'danger' : 'dark'} onConfirm={() => updateStatus(confirmStatus)} onClose={() => setConfirmStatus('')} busy={Boolean(savingStatus)} error={error} />}
    </Modal>
  )
}

function WorkOrdersPage() {
  const user = useCurrentUser()
  const [workOrders, setWorkOrders] = useState([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('')
  const [period, setPeriod] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)

  async function loadWorkOrders() {
    setLoading(true)
    setError('')
    try {
      setWorkOrders(await fetchAll(api, '/work-orders'))
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) setError(errorMessage(requestError, 'Work order gagal dimuat.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(loadWorkOrders, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekStartKey = toInputDate(weekStart)
  const weekEndKey = toInputDate(weekEnd)
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const filtered = workOrders.filter((order) => {
    const text = `${order.number || ''} ${order.vehicle?.owner_name || ''} ${order.vehicle?.plate_number || ''} ${order.complaint || ''}`.toLocaleLowerCase('id-ID')
    const matchesText = text.includes(search.trim().toLocaleLowerCase('id-ID'))
    const matchesTab = !activeTab || order.status === activeTab
    const date = String(order.created_at || '').slice(0, 10)
    const matchesPeriod = period === 'all' || (period === 'week' && date >= weekStartKey && date <= weekEndKey) || (period === 'month' && date.slice(0, 7) === monthKey)
    return matchesText && matchesTab && matchesPeriod
  })
  const statusCounts = STATUS_TABS.reduce((counts, tab) => ({ ...counts, [tab.key]: tab.key ? workOrders.filter((order) => order.status === tab.key).length : workOrders.length }), {})
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const meta = { current_page: currentPage, last_page: pageCount, from: filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0, to: Math.min(currentPage * PAGE_SIZE, filtered.length), total: filtered.length }

  function changeSearch(value) { setSearch(value); setPage(1) }

  const toolbar = (
    <>
      <SearchInput value={search} onChange={changeSearch} placeholder="Cari di sini..." className="w-[min(38vw,230px)]" />
      <button type="button" onClick={() => setFilterOpen((open) => !open)} aria-label="Filter work order" aria-expanded={filterOpen} className="grid h-11 w-11 place-items-center rounded-full border border-[#e2e2e5] bg-white text-[#55555d] hover:bg-[#f7f7f8]"><Icon name="filter" className="h-5 w-5" /></button>
    </>
  )

  return (
    <AppLayout title="Work Order" subtitle="Berikut ringkasan bengkel hari ini." toolbar={toolbar} actions={<Button icon="plus" onClick={() => setShowCreate(true)}>Buat Work Order</Button>} roles={['owner', 'mekanik']}>
      <Card className="-mx-2 p-5">
        <div className="flex gap-5 overflow-x-auto border-b border-[#e5e5e8] px-1">
          {STATUS_TABS.map((tab) => <button key={tab.key || 'all'} type="button" onClick={() => { setActiveTab(tab.key); setPage(1) }} className={`relative flex shrink-0 items-center gap-1.5 px-2 pb-3 text-[10px] transition ${activeTab === tab.key ? 'font-semibold text-[#222226]' : 'text-[#77767e] hover:text-[#222226]'}`}><span>{tab.label}</span><span className="rounded-full bg-[#f0f0f1] px-1.5 py-0.5 text-[8px]">{statusCounts[tab.key] || 0}</span>{activeTab === tab.key && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 rounded-full bg-[#18181a]" />}</button>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <SearchInput value={search} onChange={changeSearch} placeholder="Cari work order..." className="w-full sm:w-[280px]" />
          <div className="relative">
            <button type="button" onClick={() => setFilterOpen((open) => !open)} aria-expanded={filterOpen} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e2e2e5] bg-white px-3.5 text-[10px] text-[#55555c]"><Icon name="calendar" className="h-4 w-4" />{period === 'week' ? 'Minggu ini' : period === 'month' ? 'Bulan ini' : 'Semua waktu'}</button>
            {filterOpen && <div className="absolute right-0 top-12 z-30 w-40 rounded-xl border border-[#e5e5e8] bg-white p-1.5 shadow-xl">{[['all', 'Semua waktu'], ['week', 'Minggu ini'], ['month', 'Bulan ini']].map(([key, label]) => <button key={key} type="button" onClick={() => { setPeriod(key); setPage(1); setFilterOpen(false) }} className={`block w-full rounded-lg px-3 py-2 text-left text-[10px] hover:bg-[#f7f7f8] ${period === key ? 'font-semibold text-[#222226]' : 'text-[#77767e]'}`}>{label}</button>)}</div>}
          </div>
        </div>
        <div className="divide-y divide-[#ececef]">
          {loading && Array.from({ length: 4 }, (_, index) => <div key={index} className="flex h-[74px] items-center gap-4 px-1"><span className="h-10 w-10 animate-pulse rounded-xl bg-[#efeff1]" /><span className="h-3 w-1/2 animate-pulse rounded bg-[#efeff1]" /></div>)}
          {!loading && error && <div className="py-12 text-center text-[11px] text-red-600">{error}<button type="button" onClick={loadWorkOrders} className="ml-2 font-semibold underline">Coba lagi</button></div>}
          {!loading && !error && rows.length === 0 && <div className="py-14 text-center text-[11px] text-[#77767e]">Tidak ada work order untuk filter ini.</div>}
          {!loading && !error && rows.map((order) => {
            const status = statusInfo(order.status)
            return <button key={order.id} type="button" onClick={() => setSelectedOrder(order)} className="grid min-h-[74px] w-full grid-cols-[40px_minmax(90px,.7fr)_minmax(0,1.8fr)_minmax(80px,.8fr)_20px] items-center gap-3 px-1 text-left hover:bg-[#fafafa] sm:gap-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#dfff00]/35 text-[#18181a]"><Icon name="wrench" className="h-5 w-5" /></span>
              <span className="truncate text-[10px] font-semibold text-[#222226]">{order.number}</span>
              <span className="min-w-0"><span className="block truncate text-[11px] font-medium text-[#222226]">{order.vehicle?.owner_name || 'Pelanggan'}</span><span className="mt-1 block truncate text-[9px] text-[#77767e]">{order.vehicle?.plate_number || '-'} · {order.complaint || 'Servis'}</span></span>
              <span className="text-right"><span className="mb-1 block text-[9px] text-[#77767e]">{formatDateTime(order.created_at)}</span><Badge tone={status.tone}>{status.label}</Badge></span>
              <Icon name="arrow" className="h-4 w-4 text-[#222226]" />
            </button>
          })}
        </div>
        {!loading && !error && <Pagination meta={meta} onPageChange={setPage} />}
      </Card>
      {showCreate && <WorkOrderFormModal user={user} onClose={() => setShowCreate(false)} onSaved={async (saved) => { await loadWorkOrders(); if (saved) setSelectedOrder(saved); setPage(1) }} />}
      {selectedOrder && <WorkOrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdated={async (updated) => { await loadWorkOrders(); setSelectedOrder(updated) }} />}
    </AppLayout>
  )
}

export default WorkOrdersPage
