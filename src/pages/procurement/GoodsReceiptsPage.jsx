import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import Icon from '../../components/Icon'
import { Alert, Button, Card, Field, inputClass } from '../../components/ui'
import { handleUnauthorized } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { errorMessage, fetchAll, fieldErrorsFrom, objectFrom } from '../../lib/apiHelpers'
import { formatDate, formatNumber, formatRupiah, toInputDate } from '../../lib/format'
import { notifyStockChanged } from '../../lib/stockEvents'

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}

function printPurchaseOrder(order) {
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) return false

  const itemRows = (order.items || []).map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.spare_part?.code || '-')}</td>
      <td>${escapeHtml(item.spare_part?.name || 'Spare part')}</td>
      <td class="number">${formatNumber(item.quantity)} ${escapeHtml(item.spare_part?.unit || 'unit')}</td>
      <td class="number">${formatRupiah(item.unit_price)}</td>
      <td class="number">${formatRupiah(Number(item.quantity) * Number(item.unit_price || 0))}</td>
    </tr>`).join('')
  const supplier = order.supplier || {}
  const html = `<!doctype html>
    <html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(order.number)}</title><style>
      *{box-sizing:border-box}body{margin:0;color:#222;font:13px Arial,sans-serif}.sheet{max-width:900px;margin:32px auto;padding:36px}
      header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #222;padding-bottom:18px}h1{font-size:22px;margin:0 0 6px}h2{font-size:18px;letter-spacing:2px;margin:0}
      .muted{color:#666;font-size:11px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}.meta strong{display:block;margin:5px 0}
      table{width:100%;border-collapse:collapse;margin-top:22px}th,td{padding:10px 8px;border-bottom:1px solid #ddd;text-align:left}th{background:#f4f4f5;font-size:11px}.number{text-align:right;white-space:nowrap}
      .total{display:flex;justify-content:flex-end;gap:40px;border-top:2px solid #222;margin-top:16px;padding-top:14px;font-size:16px;font-weight:bold}.notes{margin-top:22px;white-space:pre-wrap}
      .signatures{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:90px;text-align:center}.signatures div{border-top:1px solid #555;padding-top:8px}
      @page{size:A4;margin:16mm}@media print{.sheet{max-width:none;margin:0;padding:0}tr{break-inside:avoid}}
    </style></head><body><main class="sheet">
      <header><div><h1>KEN-KEN Motor</h1><div class="muted">Bengkel &amp; Spare Part Motor</div></div><h2>PURCHASE ORDER</h2></header>
      <div class="meta"><div><span class="muted">Nomor PO</span><strong>${escapeHtml(order.number)}</strong><span class="muted">Supplier</span><strong>${escapeHtml(supplier.name || '-')}</strong>${supplier.address ? `<span>${escapeHtml(supplier.address)}</span>` : ''}${supplier.phone ? `<div>${escapeHtml(supplier.phone)}</div>` : ''}</div>
      <div><span class="muted">Tanggal Order</span><strong>${escapeHtml(formatDate(order.order_date, { day: 'numeric', month: 'long', year: 'numeric' }))}</strong><span class="muted">Status</span><strong>${escapeHtml(order.status || '-')}</strong></div></div>
      <table><thead><tr><th>No</th><th>Kode</th><th>Spare Part</th><th class="number">Jumlah</th><th class="number">Harga Satuan</th><th class="number">Subtotal</th></tr></thead><tbody>${itemRows}</tbody></table>
      <div class="total"><span>Total</span><span>${formatRupiah(order.items?.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0))}</span></div>
      ${order.notes ? `<div class="notes"><strong>Catatan</strong><br>${escapeHtml(order.notes)}</div>` : ''}
      <div class="signatures"><div>Hormat kami,</div><div>Disetujui supplier,</div></div>
    </main><script>window.addEventListener('load',()=>setTimeout(()=>{window.focus();window.print()},250));window.addEventListener('afterprint',()=>window.close())</script></body></html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}

async function fetchReceivableOrders() {
  const [ordered, partial] = await Promise.all([
    fetchAll(api, '/purchase-orders', { status: 'ordered' }),
    fetchAll(api, '/purchase-orders', { status: 'partial' }),
  ])
  return [...ordered, ...partial]
    .filter((order) => (order.items || []).some((item) => Number(item.quantity) > Number(item.received_quantity || 0)))
    .sort((a, b) => String(b.order_date).localeCompare(String(a.order_date)))
}

function GoodsReceiptsPage() {
  const [orders, setOrders] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [quantities, setQuantities] = useState({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState('')
  const [printError, setPrintError] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    let active = true
    async function loadOrders() {
      setLoading(true)
      setLoadError('')
      try {
        const openOrders = await fetchReceivableOrders()
        if (!active) return
        setOrders(openOrders)
        setSelectedId((current) => openOrders.some((order) => String(order.id) === current) ? current : String(openOrders[0]?.id || ''))
      } catch (requestError) {
        if (!handleUnauthorized(requestError) && active) setLoadError(errorMessage(requestError, 'Daftar PO yang menunggu barang gagal dimuat.'))
      } finally {
        if (active) setLoading(false)
      }
    }
    const timer = window.setTimeout(loadOrders, 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [])

  const selectedOrder = orders.find((order) => String(order.id) === selectedId) || null
  const visibleOrders = orders.filter((order) => {
    const matchesSearch = `${order.number || ''} ${order.supplier?.name || ''}`.toLowerCase().includes(orderSearch.toLowerCase())
    const matchesStatus = !statusFilter || order.status === statusFilter
    return matchesSearch && matchesStatus
  })
  const dropdownOrders = visibleOrders.some((order) => String(order.id) === selectedId) || !selectedOrder
    ? visibleOrders
    : [selectedOrder, ...visibleOrders]
  const remainingItems = (selectedOrder?.items || [])
    .map((item) => ({ ...item, remaining: Math.max(0, Number(item.quantity) - Number(item.received_quantity || 0)) }))
    .filter((item) => item.remaining > 0)
  const orderTotalUnits = (selectedOrder?.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0)
  const orderTotalPrice = (selectedOrder?.items || []).reduce((total, item) => total + Number(item.quantity || 0) * Number(item.unit_price || 0), 0)

  function selectOrder(event) {
    setSelectedId(event.target.value)
    setQuantities({})
    setFieldErrors({})
    setSubmitError('')
    setSuccess('')
  }

  async function confirmReceipt(event) {
    event.preventDefault()
    if (!selectedOrder) return
    const items = remainingItems
      .map((item) => ({ purchase_order_item_id: item.id, quantity: Number(quantities[item.id] ?? item.remaining) }))
      .filter((item) => item.quantity > 0)
    if (items.length === 0) {
      setSubmitError('Isi jumlah minimal satu barang yang diterima.')
      return
    }

    setSaving(true)
    setSubmitError('')
    setFieldErrors({})
    setSuccess('')
    try {
      const response = await api.post('/goods-receipts', {
        purchase_order_id: selectedOrder.id,
        received_date: toInputDate(),
        notes: notes.trim() || null,
        items,
      })
      const receipt = objectFrom(response)
      notifyStockChanged()
      setSuccess(`Penerimaan ${receipt?.number || ''} berhasil disimpan. Stok spare part sudah diperbarui.`)
      setNotes('')
      setQuantities({})
      try {
        const openOrders = await fetchReceivableOrders()
        setOrders(openOrders)
        setSelectedId((current) => openOrders.some((order) => String(order.id) === current) ? current : String(openOrders[0]?.id || ''))
      } catch {
        // Penerimaan sudah tersimpan; data PO tetap bisa dimuat ulang melalui halaman.
      }
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) {
        setFieldErrors(fieldErrorsFrom(requestError))
        setSubmitError(errorMessage(requestError, 'Penerimaan barang gagal disimpan.'))
      }
    } finally {
      setSaving(false)
    }
  }

  const toolbar = (
    <>
      <label className="flex h-11 w-[min(44vw,230px)] items-center gap-3 rounded-full border border-[#e2e2e5] bg-white px-4 text-[#9999a1]">
        <Icon name="search" className="h-4 w-4 shrink-0" />
        <input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="Cari di sini..." aria-label="Cari purchase order" className="min-w-0 flex-1 bg-transparent text-[11px] text-[#222226] outline-none placeholder:text-[#9999a1]" />
      </label>
      <div className="relative">
        <button type="button" onClick={() => setFilterOpen((open) => !open)} aria-label="Filter purchase order" aria-expanded={filterOpen} className="grid h-11 w-11 place-items-center rounded-full border border-[#e2e2e5] bg-white text-[#55555d] hover:bg-[#f7f7f8]"><Icon name="filter" className="h-5 w-5" /></button>
        {filterOpen && <div className="absolute right-0 top-12 z-30 w-48 rounded-xl border border-[#e5e5e8] bg-white p-3 shadow-xl"><label className="text-[10px] font-medium text-[#55555c]">Status PO<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-[#e1e1e5] bg-white px-2 text-[10px] outline-none focus:border-[#a5b900]"><option value="">Semua status</option><option value="ordered">Dipesan</option><option value="partial">Diterima sebagian</option></select></label></div>}
      </div>
    </>
  )

  return (
    <AppLayout title="Penerimaan Barang" subtitle="Berikut ringkasan bengkel hari ini." toolbar={toolbar}>
      {loadError && <Alert tone="error" className="mb-4">{loadError}</Alert>}
      {success && <Alert tone="success" className="mb-4">{success}</Alert>}
      <div className="-mx-2 grid items-start gap-5 xl:grid-cols-[minmax(0,1.82fr)_minmax(280px,1fr)]">
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold text-[#222226]">Penerimaan Barang</h2>
          <p className="mt-1 text-[10px] text-[#77767e]">Cocokkan jumlah barang yang diterima dengan purchase order</p>

          <form onSubmit={confirmReceipt}>
            <Field label="Pilih Purchase Order" error={fieldErrors.purchase_order_id} className="mt-6">
              <select value={selectedId} onChange={selectOrder} disabled={loading || saving || orders.length === 0} className={`${inputClass} appearance-none pr-10`}>
                <option value="">{loading ? 'Memuat purchase order...' : orders.length ? 'Pilih purchase order' : 'Tidak ada PO yang menunggu barang'}</option>
                {dropdownOrders.map((order) => <option key={order.id} value={order.id}>{order.number} — {order.supplier?.name || 'Supplier'}</option>)}
              </select>
            </Field>

            {selectedOrder ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-[#e2e2e5]">
                <div className="grid grid-cols-[minmax(0,1fr)_84px_92px] items-center gap-3 bg-[#f8f8f9] px-3 py-3 text-[9px] font-medium text-[#77767e] sm:grid-cols-[minmax(0,1fr)_100px_104px] sm:px-4">
                  <span>Item</span><span className="text-right">Dipesan</span><span className="text-center">Diterima</span>
                </div>
                {remainingItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_84px_92px] items-center gap-3 border-t border-[#ececef] px-3 py-3 sm:grid-cols-[minmax(0,1fr)_100px_104px] sm:px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#f3f3f4] text-[#77767e]"><Icon name="wrench" className="h-4 w-4" /></span>
                      <p className="truncate text-[10px] font-semibold text-[#222226]">{item.spare_part?.name || 'Spare part'}</p>
                    </div>
                    <span className="text-right text-[10px] text-[#33333a]">{formatNumber(item.quantity)} {item.spare_part?.unit || 'unit'}{Number(item.received_quantity) > 0 && <span className="block text-[9px] text-[#88878f]">Sisa {formatNumber(item.remaining)}</span>}</span>
                    <input type="number" inputMode="numeric" min="0" max={item.remaining} step="1" aria-label={`Jumlah diterima ${item.spare_part?.name || ''}`} value={quantities[item.id] ?? item.remaining} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: event.target.value }))} className="h-9 w-full rounded-xl border border-[#e1e1e5] bg-white px-3 text-[10px] text-[#222226] outline-none focus:border-[#a5b900] focus:ring-2 focus:ring-[#dfff00]/25" disabled={saving} />
                  </div>
                ))}
                {remainingItems.length === 0 && <p className="px-4 py-8 text-center text-[11px] text-[#77767e]">Semua item dalam PO ini sudah diterima.</p>}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#dedee2] px-4 py-12 text-center text-[11px] text-[#77767e]">
                {loading ? 'Memuat purchase order...' : 'Pilih PO berstatus Dipesan atau Diterima Sebagian untuk mencatat barang.'}
              </div>
            )}

            <Field label="Catatan Penerimaan" error={fieldErrors.notes} className="mt-5">
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} placeholder="Tambahkan catatan kondisi barang..." className="min-h-[90px] w-full resize-y rounded-xl border border-[#e1e1e5] bg-white px-4 py-3 text-[11px] text-[#25252a] outline-none placeholder:text-[#92929a] focus:border-[#a5b900] focus:ring-2 focus:ring-[#dfff00]/25" disabled={saving} />
            </Field>

            {submitError && <Alert tone="error" className="mt-4">{submitError}</Alert>}
            <Alert className="mt-4"><span className="text-[#55555c]">Stok akan diperbarui otomatis setelah penerimaan dikonfirmasi.</span></Alert>
            <Button type="submit" icon="check" className="mt-8 h-11 w-full" disabled={loading || saving || !selectedOrder || remainingItems.length === 0}>
              {saving ? 'Menyimpan Penerimaan...' : 'Konfirmasi Penerimaan'}
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="text-[14px] font-semibold text-[#222226]">Ringkasan PO</h2>
          {selectedOrder ? (
            <>
              <dl className="mt-5 space-y-4 text-[10px]">
                <div className="flex items-start justify-between gap-4"><dt className="text-[#77767e]">Supplier</dt><dd className="text-right font-semibold text-[#222226]">{selectedOrder.supplier?.name || '-'}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#77767e]">Tanggal PO</dt><dd className="text-right font-medium text-[#222226]">{formatDate(selectedOrder.order_date)}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#77767e]">Jumlah item</dt><dd className="text-right font-medium text-[#222226]">{(selectedOrder.items || []).length} jenis</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#77767e]">Total unit</dt><dd className="text-right font-medium text-[#222226]">{formatNumber(orderTotalUnits)} unit</dd></div>
              </dl>
              <div className="mt-5 flex items-center justify-between border-t border-dashed border-[#dedee2] pt-4"><span className="text-[12px] text-[#77767e]">Total</span><strong className="text-[14px] font-semibold text-[#222226]">{formatRupiah(orderTotalPrice)}</strong></div>
              <Button variant="outline" icon="download" className="mt-6 w-full" onClick={() => { setPrintError(''); if (!printPurchaseOrder(selectedOrder)) setPrintError('Popup cetak diblokir browser. Izinkan pop-up untuk membuka lembar cetak PO.') }}>Cetak PO</Button>
              {printError && <Alert tone="error" className="mt-3">{printError}</Alert>}
            </>
          ) : (
            <p className="mt-5 text-[11px] leading-5 text-[#77767e]">Ringkasan supplier, tanggal, jumlah item, dan nilai PO akan tampil setelah purchase order dipilih.</p>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}

export default GoodsReceiptsPage
