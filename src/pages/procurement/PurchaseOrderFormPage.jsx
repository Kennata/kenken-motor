import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Alert, Button, Card, Field, IconButton, inputClass } from '../../components/ui'
import { handleUnauthorized } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { cachedFetchAll, errorMessage, fetchAll, fieldErrorsFrom, objectFrom } from '../../lib/apiHelpers'
import { formatDate, formatNumber, formatRupiah, toInputDate } from '../../lib/format'
import { navigate } from '../../lib/router'

let nextKey = 1
function newItem(partial = {}) {
  nextKey += 1
  return { key: nextKey, spare_part_id: '', quantity: '1', unit_price: '', ...partial }
}

// Saran jumlah pesan: isi ulang sampai dua kali batas minimum.
function suggestedQuantity(part) {
  return Math.max(1, Number(part.min_stock || 0) * 2 - Number(part.stock || 0))
}

// FR-06: buat PO baru atau ubah PO yang masih draft.
function PurchaseOrderFormPage({ id }) {
  const isEdit = Boolean(id)
  const [suppliers, setSuppliers] = useState([])
  const [parts, setParts] = useState([])
  const [form, setForm] = useState({ supplier_id: '', order_date: toInputDate(), number: '', notes: '' })
  const [items, setItems] = useState(() => [newItem()])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [supplierRows, partRows, orderResponse] = await Promise.all([
          cachedFetchAll(api, '/suppliers'),
          fetchAll(api, '/spare-parts'),
          isEdit ? api.get(`/purchase-orders/${id}`) : Promise.resolve(null),
        ])
        if (!active) return
        setSuppliers(supplierRows)
        setParts(partRows)
        if (orderResponse) {
          const order = objectFrom(orderResponse)
          if (order.status !== 'draft') { setLoadError(`PO ${order.number} berstatus ${order.status} dan tidak bisa diubah lagi. Hanya PO draft yang bisa diedit.`); return }
          setForm({ supplier_id: String(order.supplier_id), order_date: toInputDate(order.order_date), number: order.number || '', notes: order.notes || '' })
          setItems((order.items || []).map((item) => newItem({ spare_part_id: String(item.spare_part_id), quantity: String(item.quantity), unit_price: String(Number(item.unit_price)) })))
        }
      } catch (requestError) {
        if (active && !handleUnauthorized(requestError)) setLoadError(errorMessage(requestError, 'Data purchase order gagal dimuat.'))
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [id, isEdit])

  const partsById = useMemo(() => Object.fromEntries(parts.map((part) => [String(part.id), part])), [parts])
  const total = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0)
  const selectedIds = new Set(items.map((item) => item.spare_part_id).filter(Boolean))
  const lowStockCandidates = parts.filter((part) => part.is_low_stock && !selectedIds.has(String(part.id)) && (!form.supplier_id || String(part.supplier_id) === form.supplier_id))

  function updateForm(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
  }

  function updateItem(key, field, value) {
    setItems((current) => current.map((item) => {
      if (item.key !== key) return item
      const next = { ...item, [field]: value }
      // Harga satuan otomatis mengikuti harga beli barang yang dipilih.
      if (field === 'spare_part_id' && partsById[value]) next.unit_price = String(Number(partsById[value].purchase_price || 0))
      return next
    }))
  }

  function addLowStockItems() {
    const additions = lowStockCandidates.map((part) => newItem({ spare_part_id: String(part.id), quantity: String(suggestedQuantity(part)), unit_price: String(Number(part.purchase_price || 0)) }))
    setItems((current) => [...current.filter((item) => item.spare_part_id), ...additions])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setFieldErrors({})
    const filledItems = items.filter((item) => item.spare_part_id)
    if (filledItems.length === 0) { setError('Tambahkan minimal satu spare part ke purchase order.'); return }
    setSaving(true)
    const body = {
      supplier_id: Number(form.supplier_id),
      order_date: form.order_date,
      notes: form.notes.trim() || null,
      items: filledItems.map((item) => ({ spare_part_id: Number(item.spare_part_id), quantity: Number(item.quantity), unit_price: Number(item.unit_price) })),
    }
    if (!isEdit && form.number.trim()) body.number = form.number.trim()
    try {
      const response = isEdit ? await api.patch(`/purchase-orders/${id}`, body) : await api.post('/purchase-orders', body)
      const saved = objectFrom(response)
      navigate(`/procurement/purchase-orders/${saved?.id ?? id}`)
    } catch (requestError) {
      setFieldErrors(fieldErrorsFrom(requestError))
      setError(errorMessage(requestError, 'Purchase order gagal disimpan.'))
      setSaving(false)
    }
  }

  const supplier = suppliers.find((entry) => String(entry.id) === form.supplier_id)
  const itemError = (index, field) => fieldErrors[`items.${index}.${field}`]

  return (
    <AppLayout title={isEdit ? 'Ubah Purchase Order' : 'Buat Purchase Order'} subtitle="PO baru tersimpan sebagai draft sebelum dikirim ke supplier." actions={<Button variant="outline" icon="arrowLeft" to={isEdit ? `/procurement/purchase-orders/${id}` : '/procurement/purchase-orders'}>Kembali</Button>}>
      {loading ? <Card className="py-16 text-center text-[12px] text-[#77767e]">Memuat data...</Card> : loadError ? <Alert tone="error">{loadError}</Alert> : (
        <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <h2 className="text-[14px] font-semibold">Informasi Purchase Order</h2>
            <p className="mt-1 text-[11px] text-[#77767e]">Pilih supplier dan spare part yang akan dipesan.</p>
            {error && <Alert tone="error" className="mt-4">{error}</Alert>}

            <div className="mt-5 grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
              <Field label="Supplier" error={fieldErrors.supplier_id}>
                <select className={inputClass} name="supplier_id" value={form.supplier_id} onChange={updateForm} required>
                  <option value="">Pilih supplier</option>
                  {suppliers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                </select>
              </Field>
              <Field label="Tanggal Order" error={fieldErrors.order_date}><input type="date" className={inputClass} name="order_date" value={form.order_date} onChange={updateForm} required /></Field>
              {!isEdit && <Field label="Nomor PO (opsional)" error={fieldErrors.number}><input className={inputClass} name="number" value={form.number} onChange={updateForm} placeholder="Kosongkan untuk nomor otomatis" maxLength={100} /></Field>}
              <Field label="Catatan (opsional)" error={fieldErrors.notes} className={isEdit ? 'sm:col-span-2' : ''}><input className={inputClass} name="notes" value={form.notes} onChange={updateForm} placeholder="Contoh: Kirim pada jam kerja" maxLength={1000} /></Field>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[13px] font-semibold">Daftar Barang</h3>
              {lowStockCandidates.length > 0 && <Button variant="lime" icon="alert" onClick={addLowStockItems}>Tambah {lowStockCandidates.length} barang stok menipis</Button>}
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-[11px]">
                <thead><tr className="text-[10px] text-[#77767e]"><th className="pb-2 font-medium">Spare Part</th><th className="w-24 pb-2 font-medium">Jumlah</th><th className="w-36 pb-2 font-medium">Harga Satuan (Rp)</th><th className="w-32 pb-2 text-right font-medium">Subtotal</th><th className="w-10" /></tr></thead>
                <tbody>
                  {items.map((item, index) => {
                    const part = partsById[item.spare_part_id]
                    return (
                      <tr key={item.key} className="align-top">
                        <td className="py-1.5 pr-2">
                          <select className={`${inputClass} h-10`} aria-label={`Spare part baris ${index + 1}`} value={item.spare_part_id} onChange={(event) => updateItem(item.key, 'spare_part_id', event.target.value)} required={index === 0}>
                            <option value="">Pilih spare part</option>
                            {parts.map((option) => <option key={option.id} value={option.id} disabled={selectedIds.has(String(option.id)) && String(option.id) !== item.spare_part_id}>{option.name} ({option.code}){option.is_low_stock ? ' · stok menipis' : ''}</option>)}
                          </select>
                          {part && <p className="mt-1 text-[10px] text-[#77767e]">Stok {formatNumber(part.stock)} {part.unit} · min. {part.min_stock}</p>}
                          {itemError(index, 'spare_part_id') && <p className="mt-1 text-[10px] text-red-600">{itemError(index, 'spare_part_id')}</p>}
                        </td>
                        <td className="py-1.5 pr-2"><input type="number" min="1" step="1" className={`${inputClass} h-10`} aria-label={`Jumlah baris ${index + 1}`} value={item.quantity} onChange={(event) => updateItem(item.key, 'quantity', event.target.value)} required={Boolean(item.spare_part_id)} />{itemError(index, 'quantity') && <p className="mt-1 text-[10px] text-red-600">{itemError(index, 'quantity')}</p>}</td>
                        <td className="py-1.5 pr-2"><input type="number" min="0" step="1" className={`${inputClass} h-10`} aria-label={`Harga satuan baris ${index + 1}`} value={item.unit_price} onChange={(event) => updateItem(item.key, 'unit_price', event.target.value)} required={Boolean(item.spare_part_id)} />{itemError(index, 'unit_price') && <p className="mt-1 text-[10px] text-red-600">{itemError(index, 'unit_price')}</p>}</td>
                        <td className="py-4 pr-2 text-right font-semibold">{formatRupiah(Number(item.quantity || 0) * Number(item.unit_price || 0))}</td>
                        <td className="py-2.5"><IconButton icon="trash" tone="danger" label={`Hapus baris ${index + 1}`} disabled={items.length === 1} onClick={() => setItems((current) => current.filter((entry) => entry.key !== item.key))} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Button variant="outline" icon="plus" className="mt-3" onClick={() => setItems((current) => [...current, newItem()])} disabled={items.length >= parts.length}>Tambah Baris</Button>
          </Card>

          <Card className="h-fit xl:sticky xl:top-6">
            <h2 className="text-[14px] font-semibold">Ringkasan</h2>
            <dl className="mt-4 space-y-2.5 text-[11px]">
              <div className="flex justify-between gap-3"><dt className="text-[#77767e]">Supplier</dt><dd className="text-right font-medium">{supplier?.name || '-'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#77767e]">Tanggal PO</dt><dd className="font-medium">{form.order_date ? formatDate(form.order_date) : '-'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#77767e]">Jumlah item</dt><dd className="font-medium">{selectedIds.size} barang</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#77767e]">Total unit</dt><dd className="font-medium">{formatNumber(items.reduce((sum, item) => sum + (item.spare_part_id ? Number(item.quantity || 0) : 0), 0))}</dd></div>
            </dl>
            <div className="mt-4 flex items-end justify-between border-t border-[#ececef] pt-4"><span className="text-[11px] text-[#77767e]">Total</span><strong className="text-[22px] tracking-[-.03em]">{formatRupiah(total)}</strong></div>
            <Button type="submit" icon="check" className="mt-5 w-full" disabled={saving}>{saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan sebagai Draft'}</Button>
          </Card>
        </form>
      )}
    </AppLayout>
  )
}

export default PurchaseOrderFormPage
