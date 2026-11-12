import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import Icon from '../../components/Icon'
import { Alert, Button, Card, Field, SearchInput, inputClass } from '../../components/ui'
import { handleUnauthorized } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { errorMessage, fetchAll, fieldErrorsFrom, objectFrom } from '../../lib/apiHelpers'

const COURIERS = ['Kurir Bengkel', 'JNE', 'J&T Express', 'SiCepat', 'AnterAja', 'Lainnya']

function ShipmentsPage() {
  const [workOrders, setWorkOrders] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [shipmentType, setShipmentType] = useState('spare_part')
  const [choiceKey, setChoiceKey] = useState('')
  const [form, setForm] = useState({ recipient_name: '', phone: '', address: '', courier: 'Kurir Bengkel' })
  const [search, setSearch] = useState('')
  const [workOrderStatus, setWorkOrderStatus] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true
    async function loadWorkOrders() {
      setLoadingOptions(true)
      setLoadError('')
      try {
        const rows = await fetchAll(api, '/work-orders')
        if (active) setWorkOrders(rows.filter((order) => order.status !== 'cancelled'))
      } catch (requestError) {
        if (!handleUnauthorized(requestError) && active) setLoadError(errorMessage(requestError, 'Daftar work order gagal dimuat.'))
      } finally {
        if (active) setLoadingOptions(false)
      }
    }
    const timer = window.setTimeout(loadWorkOrders, 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [])

  const allChoices = useMemo(() => {
    const orders = workOrders
    if (shipmentType === 'vehicle') {
      return orders.filter((order) => order.vehicle).map((order) => ({
        key: `vehicle:${order.id}`,
        order,
        vehicle: order.vehicle,
        description: `${order.vehicle.plate_number} — ${order.vehicle.brand} ${order.vehicle.type}`,
        label: `${order.vehicle.plate_number} — ${order.vehicle.owner_name} · ${order.number}`,
      }))
    }
    return orders.flatMap((order) => (order.items || []).map((item) => ({
      key: `part:${order.id}:${item.id}`,
      order,
      vehicle: order.vehicle,
      item,
      description: `${item.spare_part?.name || 'Spare part'} — ${item.quantity} ${item.spare_part?.unit || 'unit'}`,
      label: `${item.spare_part?.name || 'Spare part'} — ${item.quantity} ${item.spare_part?.unit || 'unit'} · ${order.number}`,
    })))
  }, [workOrders, shipmentType])
  const visibleChoices = allChoices.filter((choice) => {
    const matchesStatus = !workOrderStatus || choice.order.status === workOrderStatus
    const query = search.trim().toLocaleLowerCase('id-ID')
    const searchable = `${choice.label} ${choice.description} ${choice.vehicle?.plate_number || ''} ${choice.vehicle?.owner_name || ''}`.toLocaleLowerCase('id-ID')
    return matchesStatus && searchable.includes(query)
  })
  const selectedChoice = allChoices.find((choice) => choice.key === choiceKey) || null
  const dropdownChoices = visibleChoices.some((choice) => choice.key === choiceKey) || !selectedChoice ? visibleChoices : [selectedChoice, ...visibleChoices]

  function update(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
  }

  function changeType(event) {
    setShipmentType(event.target.value)
    setChoiceKey('')
    setFieldErrors((current) => ({ ...current, work_order_id: '' }))
  }

  function chooseItem(event) {
    const key = event.target.value
    setChoiceKey(key)
    const choice = allChoices.find((option) => option.key === key)
    if (choice) setForm((current) => ({ ...current, recipient_name: choice.vehicle?.owner_name || current.recipient_name, phone: choice.vehicle?.phone || current.phone }))
    setFieldErrors((current) => ({ ...current, work_order_id: '' }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    setFieldErrors({})
    if (!selectedChoice) {
      setError('Pilih item atau kendaraan yang akan dikirim.')
      setSaving(false)
      return
    }
    const kindLabel = shipmentType === 'vehicle' ? 'Kendaraan' : 'Spare Part'
    const body = {
      work_order_id: Number(selectedChoice.order.id),
      recipient_name: form.recipient_name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim(),
      courier: form.courier.trim() || null,
      notes: `Jenis pengiriman: ${kindLabel}\nItem yang dikirim: ${selectedChoice.description}`,
    }
    try {
      const shipment = objectFrom(await api.post('/shipments', body))
      setSuccess(`Pesanan ${shipment?.number || 'pengiriman'} berhasil dibuat dengan status Disiapkan.`)
      setChoiceKey('')
      setForm({ recipient_name: '', phone: '', address: '', courier: 'Kurir Bengkel' })
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) {
        setFieldErrors(fieldErrorsFrom(requestError))
        setError(errorMessage(requestError, 'Pesanan kirim gagal dibuat.'))
      }
    } finally {
      setSaving(false)
    }
  }

  const toolbar = (
    <>
      <SearchInput value={search} onChange={setSearch} placeholder="Cari di sini..." className="w-[min(38vw,230px)]" />
      <div className="relative"><button type="button" onClick={() => setFilterOpen((open) => !open)} aria-label="Filter work order untuk pengiriman" aria-expanded={filterOpen} className="grid h-11 w-11 place-items-center rounded-full border border-[#e2e2e5] bg-white text-[#55555d] hover:bg-[#f7f7f8]"><Icon name="filter" className="h-5 w-5" /></button>{filterOpen && <div className="absolute right-0 top-12 z-30 w-48 rounded-xl border border-[#e5e5e8] bg-white p-3 shadow-xl"><label className="text-[10px] font-medium text-[#55555c]">Status Work Order<select value={workOrderStatus} onChange={(event) => setWorkOrderStatus(event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-[#e1e1e5] bg-white px-2 text-[10px] outline-none focus:border-[#a5b900]"><option value="">Semua status</option><option value="open">Baru</option><option value="in_progress">Dikerjakan</option><option value="completed">Selesai</option></select></label></div>}</div>
    </>
  )

  const actions = <Button icon="plus" onClick={() => document.getElementById('shipment-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Buat Pesanan</Button>

  return (
    <AppLayout title="Pesanan Kirim" subtitle="Berikut ringkasan bengkel hari ini." toolbar={toolbar} actions={actions}>
      {loadError && <Alert tone="error" className="mb-4">{loadError}</Alert>}
      {success && <Alert tone="success" className="mb-4">{success} <a href="/shipping/status" className="ml-1 font-semibold underline">Lihat status pengiriman</a></Alert>}
      <div className="-mx-2 grid items-start gap-5 xl:grid-cols-[minmax(0,1.82fr)_minmax(280px,1fr)]">
        <Card id="shipment-form" className="p-5">
          <h2 className="text-[15px] font-semibold text-[#222226]">Buat Pesanan Kirim</h2>
          <p className="mt-1 text-[10px] text-[#77767e]">Atur pengiriman spare part atau kendaraan pelanggan</p>
          {error && <Alert tone="error" className="mt-4">{error}</Alert>}
          <form onSubmit={submit} className="mt-5">
            <div className="grid gap-x-3.5 gap-y-3.5 sm:grid-cols-2">
              <Field label="Penerima" error={fieldErrors.recipient_name}><input className={inputClass} name="recipient_name" value={form.recipient_name} onChange={update} placeholder="Nama penerima" maxLength={255} required disabled={saving} /></Field>
              <Field label="Nomor Telepon" error={fieldErrors.phone}><input className={inputClass} name="phone" type="tel" value={form.phone} onChange={update} placeholder="08xx xxxx xxxx" maxLength={50} disabled={saving} /></Field>
              <Field label="Alamat Pengiriman" error={fieldErrors.address} className="sm:col-span-2"><textarea className="min-h-[90px] w-full resize-y rounded-xl border border-[#e1e1e5] bg-white px-4 py-3 text-[11px] text-[#25252a] outline-none placeholder:text-[#92929a] focus:border-[#a5b900] focus:ring-2 focus:ring-[#dfff00]/25" name="address" value={form.address} onChange={update} placeholder="Masukkan alamat lengkap..." maxLength={2000} required disabled={saving} /></Field>
              <Field label="Jenis Pengiriman" error={fieldErrors.work_order_id}><select className={`${inputClass} appearance-none`} value={shipmentType} onChange={changeType} disabled={saving}><option value="spare_part">Spare Part</option><option value="vehicle">Kendaraan</option></select></Field>
              <Field label="Kurir" error={fieldErrors.courier}><select className={`${inputClass} appearance-none`} name="courier" value={form.courier} onChange={update} disabled={saving}>{COURIERS.map((courier) => <option key={courier} value={courier}>{courier}</option>)}</select></Field>
              <Field label="Item yang Dikirim" error={fieldErrors.work_order_id} className="sm:col-span-2"><select className={`${inputClass} appearance-none`} value={choiceKey} onChange={chooseItem} disabled={loadingOptions || saving || allChoices.length === 0} required><option value="">{loadingOptions ? 'Memuat item...' : allChoices.length ? 'Pilih item yang dikirim' : 'Tidak ada item untuk jenis pengiriman ini'}</option>{dropdownChoices.map((choice) => <option key={choice.key} value={choice.key}>{choice.label}</option>)}</select></Field>
            </div>
            <Button type="submit" icon="truck" className="mt-5 h-11 w-full" disabled={saving || loadingOptions || !selectedChoice}>{saving ? 'Membuat Pesanan...' : 'Buat Pesanan Kirim'}</Button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="grid h-[150px] place-items-center rounded-2xl bg-[#18181a] text-[#dfff00]"><Icon name="truck" className="h-12 w-12" /></div>
          <h2 className="mt-4 text-[14px] font-medium text-[#222226]">Pengiriman Aman</h2>
          <p className="mt-2 text-[10px] leading-[1.7] text-[#77767e]">Pastikan alamat, nomor telepon, dan detail barang sudah benar sebelum membuat pesanan.</p>
        </Card>
      </div>
    </AppLayout>
  )
}

export default ShipmentsPage
