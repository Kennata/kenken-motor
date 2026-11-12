import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import Icon from '../../components/Icon'
import { Alert, Badge, Button, Card, Field, Modal, Pagination, SearchInput, inputClass } from '../../components/ui'
import { handleUnauthorized } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { errorMessage, fetchAll, objectFrom } from '../../lib/apiHelpers'
import { formatDateTime } from '../../lib/format'

const PAGE_SIZE = 8
const STEPS = [
  { key: 'pending', label: 'Disiapkan' },
  { key: 'shipped', label: 'Dikirim' },
  { key: 'delivered', label: 'Diterima' },
]
const STATUS_INFO = {
  pending: { label: 'Disiapkan', tone: 'gray' },
  shipped: { label: 'Dikirim', tone: 'amber' },
  delivered: { label: 'Diterima', tone: 'green' },
  cancelled: { label: 'Dibatalkan', tone: 'red' },
}

function ShipmentStatusModal({ shipment, onClose, onUpdated }) {
  const [trackingNumber, setTrackingNumber] = useState(shipment.tracking_number || '')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const info = STATUS_INFO[shipment.status] || STATUS_INFO.pending
  const nextStatus = shipment.status === 'pending' ? 'shipped' : shipment.status === 'shipped' ? 'delivered' : ''

  async function transition() {
    if (!nextStatus) return
    setSaving(true)
    setError('')
    try {
      if (shipment.status === 'pending' && trackingNumber.trim() !== (shipment.tracking_number || '')) {
        await api.patch(`/shipments/${shipment.id}`, { tracking_number: trackingNumber.trim() || null })
      }
      const updated = objectFrom(await api.post(`/shipments/${shipment.id}/statuses`, { status: nextStatus, notes: notes.trim() || null }))
      await onUpdated(updated)
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) setError(errorMessage(requestError, 'Status pengiriman gagal diperbarui.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={shipment.number} description="Detail dan perkembangan pesanan kirim." onClose={onClose} busy={saving}>
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[12px] font-semibold">{shipment.recipient_name}</p><p className="mt-1 text-[10px] text-[#77767e]">{shipment.vehicle?.plate_number || 'Pengiriman umum'}{shipment.vehicle?.owner_name ? ` · ${shipment.vehicle.owner_name}` : ''}</p></div><Badge tone={info.tone}>{info.label}</Badge></div>
      <dl className="mt-4 grid gap-3 rounded-2xl bg-[#f7f7f8] p-4 text-[10px] sm:grid-cols-2">
        <div><dt className="text-[#77767e]">Nomor Telepon</dt><dd className="mt-1 font-medium">{shipment.phone || '-'}</dd></div>
        <div><dt className="text-[#77767e]">Kurir</dt><dd className="mt-1 font-medium">{shipment.courier || 'Kurir belum ditentukan'}</dd></div>
        <div className="sm:col-span-2"><dt className="text-[#77767e]">Alamat</dt><dd className="mt-1 font-medium">{shipment.address}</dd></div>
        {shipment.tracking_number && <div className="sm:col-span-2"><dt className="text-[#77767e]">Nomor Resi</dt><dd className="mt-1 font-medium">{shipment.tracking_number}</dd></div>}
      </dl>
      <div className="mt-5"><h3 className="text-[11px] font-semibold">Riwayat Status</h3><div className="mt-2 space-y-2">{(shipment.status_logs || []).map((log) => <div key={log.id} className="flex items-start justify-between gap-4 rounded-xl border border-[#ececef] px-3 py-2.5"><div><p className="text-[10px] font-semibold">{STATUS_INFO[log.status]?.label || log.status}</p>{log.notes && <p className="mt-1 text-[9px] text-[#77767e]">{log.notes}</p>}<p className="mt-1 text-[9px] text-[#77767e]">{log.user?.name || 'Pengguna'}</p></div><time className="whitespace-nowrap text-[9px] text-[#77767e]">{formatDateTime(log.created_at)}</time></div>)}</div></div>
      {nextStatus && <div className="mt-5 space-y-3">
        {shipment.status === 'pending' && <Field label="Nomor Resi (opsional)"><input className={inputClass} value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="Masukkan nomor resi" maxLength={255} disabled={saving} /></Field>}
        <Field label="Catatan Status (opsional)"><input className={inputClass} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={nextStatus === 'shipped' ? 'Contoh: Paket diserahkan ke kurir' : 'Contoh: Barang diterima dengan baik'} maxLength={2000} disabled={saving} /></Field>
        <footer className="flex justify-end"><Button icon="check" onClick={transition} disabled={saving}>{saving ? 'Memperbarui...' : nextStatus === 'shipped' ? 'Tandai Dikirim' : 'Tandai Diterima'}</Button></footer>
      </div>}
    </Modal>
  )
}

function ShipmentStatusPage() {
  const [shipments, setShipments] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  async function loadShipments() {
    setLoading(true)
    setError('')
    try {
      const [shipmentRows, workOrders] = await Promise.all([fetchAll(api, '/shipments'), fetchAll(api, '/work-orders')])
      const workOrderById = new Map(workOrders.map((order) => [Number(order.id), order]))
      setShipments(shipmentRows.map((shipment) => ({
        ...shipment,
        work_order_detail: workOrderById.get(Number(shipment.work_order_id)) || shipment.work_order || null,
        vehicle: workOrderById.get(Number(shipment.work_order_id))?.vehicle || null,
      })))
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) setError(errorMessage(requestError, 'Status pengiriman gagal dimuat.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(loadShipments, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => shipments.filter((shipment) => {
    const searchable = `${shipment.number || ''} ${shipment.recipient_name || ''} ${shipment.phone || ''} ${shipment.tracking_number || ''} ${shipment.vehicle?.plate_number || ''} ${shipment.vehicle?.owner_name || ''}`.toLocaleLowerCase('id-ID')
    return searchable.includes(search.trim().toLocaleLowerCase('id-ID')) && (!statusFilter || shipment.status === statusFilter)
  }), [shipments, search, statusFilter])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE
  const rows = filtered.slice(start, start + PAGE_SIZE)
  const meta = { current_page: currentPage, last_page: pageCount, from: filtered.length ? start + 1 : 0, to: Math.min(start + PAGE_SIZE, filtered.length), total: filtered.length }

  function changeSearch(value) { setSearch(value); setPage(1) }

  const toolbar = (
    <>
      <SearchInput value={search} onChange={changeSearch} placeholder="Cari di sini..." className="w-[min(38vw,230px)]" />
      <div className="relative"><button type="button" onClick={() => setFilterOpen((open) => !open)} aria-label="Filter status pengiriman" aria-expanded={filterOpen} className="grid h-11 w-11 place-items-center rounded-full border border-[#e2e2e5] bg-white text-[#55555d] hover:bg-[#f7f7f8]"><Icon name="filter" className="h-5 w-5" /></button>{filterOpen && <div className="absolute right-0 top-12 z-30 w-48 rounded-xl border border-[#e5e5e8] bg-white p-3 shadow-xl"><label className="text-[10px] font-medium text-[#55555c]">Status Pengiriman<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }} className="mt-2 h-9 w-full rounded-lg border border-[#e1e1e5] bg-white px-2 text-[10px] outline-none focus:border-[#a5b900]"><option value="">Semua status</option><option value="pending">Disiapkan</option><option value="shipped">Dikirim</option><option value="delivered">Diterima</option><option value="cancelled">Dibatalkan</option></select></label></div>}</div>
    </>
  )

  return (
    <AppLayout title="Status Pengiriman" subtitle="Berikut ringkasan bengkel hari ini." toolbar={toolbar}>
      {error && <Alert tone="error" className="mb-4">{error}<button type="button" onClick={loadShipments} className="ml-2 font-semibold underline">Coba lagi</button></Alert>}
      <div className="-mx-2 space-y-4">
        {loading && Array.from({ length: 3 }, (_, index) => <Card key={index} className="flex h-[112px] items-center gap-5"><span className="h-12 w-48 animate-pulse rounded bg-[#efeff1]" /><span className="h-10 flex-1 animate-pulse rounded bg-[#efeff1]" /></Card>)}
        {!loading && !error && rows.length === 0 && <Card className="py-14 text-center text-[11px] text-[#77767e]">Belum ada pesanan pengiriman untuk filter ini.</Card>}
        {!loading && !error && rows.map((shipment) => {
          const info = STATUS_INFO[shipment.status] || STATUS_INFO.pending
          const currentIndex = STEPS.findIndex((step) => step.key === shipment.status)
          const logs = shipment.status_logs || []
          return <button key={shipment.id} type="button" onClick={() => setSelected(shipment)} className="grid w-full items-center gap-4 rounded-[20px] border border-[#e5e5e8] bg-white px-5 py-4 text-left shadow-[0_12px_28px_rgba(20,20,25,.05)] transition hover:border-[#d8d8dc] hover:shadow-[0_14px_32px_rgba(20,20,25,.08)] md:grid-cols-[300px_minmax(0,1fr)]">
            <span className="flex min-h-[72px] items-center justify-between gap-4 border-b border-[#e5e5e8] pb-3 md:border-b-0 md:border-r md:pb-0 md:pr-6">
              <span className="min-w-0"><span className="block text-[9px] text-[#77767e]">Nomor Pengiriman</span><span className="mt-2 block truncate text-[15px] font-medium text-[#222226]">{shipment.number}</span><span className="mt-1 block truncate text-[9px] text-[#77767e]">{shipment.vehicle?.plate_number ? `${shipment.vehicle.plate_number} · ` : ''}{shipment.recipient_name}</span></span>
              <span className={`grid h-[70px] w-[70px] shrink-0 place-items-center rounded-full px-2 text-center text-[9px] font-semibold ${info.tone === 'green' ? 'bg-[#e7f5ea] text-[#23874a]' : info.tone === 'amber' ? 'bg-[#fff3dc] text-[#b86e00]' : info.tone === 'red' ? 'bg-red-50 text-red-600' : 'bg-[#efeff1] text-[#55555c]'}`}>{info.label}</span>
            </span>
            <span className="grid grid-cols-3 items-start gap-1 md:pl-5">
              {STEPS.map((step, index) => {
                const completed = currentIndex >= index
                const log = logs.find((entry) => entry.status === step.key)
                return <span key={step.key} className="relative flex min-w-0 flex-col items-center text-center">
                  {index > 0 && <span className={`absolute right-1/2 top-[12px] h-[2px] w-full ${currentIndex >= index ? 'bg-[#dfff00]' : 'bg-[#e5e5e8]'}`} />}
                  <span className={`relative z-10 grid h-6 w-6 place-items-center rounded-full text-[9px] ${completed ? 'bg-[#dfff00] text-[#18181a]' : 'bg-[#efeff1] text-[#77767e]'}`}>{completed ? <Icon name="check" className="h-3.5 w-3.5" /> : index + 1}</span>
                  <span className="mt-2 block truncate text-[9px] font-semibold text-[#222226]">{step.label}</span>
                  <span className="mt-1 block truncate text-[8px] text-[#77767e]">{log ? formatDateTime(log.created_at) : 'Menunggu'}</span>
                </span>
              })}
            </span>
          </button>
        })}
      </div>
      {!loading && !error && <div className="-mx-2"><Pagination meta={meta} onPageChange={setPage} /></div>}
      {selected && <ShipmentStatusModal shipment={selected} onClose={() => setSelected(null)} onUpdated={async () => { setSelected(null); await loadShipments() }} />}
    </AppLayout>
  )
}

export default ShipmentStatusPage
