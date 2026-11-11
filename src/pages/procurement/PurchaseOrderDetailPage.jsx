import { useCallback, useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import Icon from '../../components/Icon'
import { Alert, Badge, Button, Card, ConfirmDialog, DataTable } from '../../components/ui'
import { handleUnauthorized } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { errorMessage, objectFrom } from '../../lib/apiHelpers'
import { formatDate, formatDateTime, formatNumber, formatRupiah } from '../../lib/format'
import { poStatus, poTotal } from '../../lib/purchaseOrderStatus'
import { navigate } from '../../lib/router'

const STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'ordered', label: 'Dipesan' },
  { key: 'partial', label: 'Diterima Sebagian' },
  { key: 'received', label: 'Selesai' },
]

function StatusSteps({ status }) {
  if (status === 'cancelled') return <Alert tone="error">Purchase order ini sudah dibatalkan.</Alert>
  const currentIndex = STEPS.findIndex((step) => step.key === status)
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {STEPS.map((step, index) => {
        const done = index <= currentIndex
        return (
          <li key={step.key} className="flex items-center gap-2">
            <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${done ? 'bg-[#dfff00] text-[#18181a]' : 'bg-[#ececef] text-[#9999a1]'}`}>{done ? <Icon name="check" className="h-3.5 w-3.5" /> : index + 1}</span>
            <span className={`text-[11px] ${done ? 'font-semibold text-[#222226]' : 'text-[#9999a1]'}`}>{step.label}</span>
            {index < STEPS.length - 1 && <span className={`h-px w-6 ${index < currentIndex ? 'bg-[#a5b900]' : 'bg-[#e1e1e5]'}`} />}
          </li>
        )
      })}
    </ol>
  )
}

// FR-06: detail, perubahan status, dan pencetakan purchase order.
function PurchaseOrderDetailPage({ id }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      setOrder(objectFrom(await api.get(`/purchase-orders/${id}`)))
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) setError(requestError.response?.status === 404 ? 'Purchase order tidak ditemukan.' : errorMessage(requestError, 'Purchase order gagal dimuat.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function runAction() {
    setBusy(true)
    setActionError('')
    try {
      if (confirm.type === 'delete') {
        await api.delete(`/purchase-orders/${id}`)
        navigate('/procurement/purchase-orders', { replace: true })
        return
      }
      await api.patch(`/purchase-orders/${id}/status`, { status: confirm.status })
      setConfirm(null)
      await load()
    } catch (requestError) {
      setActionError(errorMessage(requestError, 'Aksi gagal diproses.'))
    } finally {
      setBusy(false)
    }
  }

  const status = order ? poStatus(order.status) : null
  const actions = order && (
    <>
      <Button variant="outline" icon="arrowLeft" to="/procurement/purchase-orders">Kembali</Button>
      <Button variant="outline" icon="printer" onClick={() => window.print()}>Cetak PO</Button>
      {order.status === 'draft' && <Button variant="outline" icon="edit" to={`/procurement/purchase-orders/${id}/edit`}>Ubah</Button>}
      {order.status === 'draft' && <Button icon="check" onClick={() => setConfirm({ type: 'status', status: 'ordered' })}>Kirim ke Supplier</Button>}
      {(order.status === 'ordered' || order.status === 'partial') && <Button icon="box" to="/procurement/goods-receipts">Terima Barang</Button>}
    </>
  )

  const confirmCopy = {
    ordered: { title: 'Kirim PO ke supplier?', message: 'Status PO akan berubah menjadi Dipesan. Setelah itu isi PO tidak bisa diubah lagi, dan barang bisa diterima lewat menu Penerimaan Barang.', label: 'Ya, tandai Dipesan' },
    cancelled: { title: 'Batalkan purchase order?', message: 'PO yang dibatalkan tidak bisa diaktifkan kembali.', label: 'Batalkan PO' },
    delete: { title: 'Hapus purchase order?', message: 'PO draft ini akan dihapus permanen.', label: 'Hapus PO' },
  }
  const currentCopy = confirm && confirmCopy[confirm.type === 'delete' ? 'delete' : confirm.status]

  const columns = [
    { key: 'no', label: 'No', render: (_, index) => index + 1 },
    { key: 'part', label: 'Spare Part', render: (item) => <div><p className="font-medium text-[#222226]">{item.spare_part?.name || '-'}</p><p className="text-[10px] text-[#77767e]">{item.spare_part?.code}</p></div> },
    { key: 'quantity', label: 'Dipesan', align: 'right', render: (item) => `${formatNumber(item.quantity)} ${item.spare_part?.unit || ''}` },
    { key: 'received', label: 'Diterima', align: 'right', headerClassName: 'print:hidden', className: 'print:hidden', render: (item) => <span className={Number(item.received_quantity) >= Number(item.quantity) ? 'font-semibold text-[#23874a]' : ''}>{formatNumber(item.received_quantity)}</span> },
    { key: 'price', label: 'Harga Satuan', align: 'right', className: 'whitespace-nowrap', render: (item) => formatRupiah(item.unit_price) },
    { key: 'subtotal', label: 'Subtotal', align: 'right', className: 'whitespace-nowrap font-semibold', render: (item) => formatRupiah(Number(item.quantity) * Number(item.unit_price)) },
  ]

  return (
    <AppLayout title={order ? order.number : 'Detail Purchase Order'} subtitle="Detail pesanan pembelian ke supplier." actions={actions}>
      {loading && <Card className="py-16 text-center text-[12px] text-[#77767e]">Memuat purchase order...</Card>}
      {!loading && error && <Alert tone="error">{error}</Alert>}
      {order && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] print:block">
          <Card className="print:border-0 print:p-0">
            <div className="mb-6 hidden items-center justify-between border-b border-[#18181a] pb-4 print:flex">
              <div><p className="text-[18px] font-bold">KEN-KEN Motor</p><p className="text-[11px]">Bengkel &amp; Spare Part Motor</p></div>
              <p className="text-[20px] font-bold tracking-[.08em]">PURCHASE ORDER</p>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[.12em] text-[#77767e]">Nomor PO</p>
                <p className="mt-1 text-[20px] font-semibold tracking-[-.03em]">{order.number}</p>
              </div>
              <Badge tone={status.tone} className="print:hidden">{status.label}</Badge>
            </div>
            <div className="mt-4 print:hidden"><StatusSteps status={order.status} /></div>

            <div className="mt-6 grid gap-4 text-[11px] sm:grid-cols-3">
              <div><p className="text-[#77767e]">Kepada (Supplier)</p><p className="mt-1 font-semibold text-[#222226]">{order.supplier?.name}</p>{order.supplier?.contact_name && <p>{order.supplier.contact_name}</p>}{order.supplier?.phone && <p>{order.supplier.phone}</p>}{order.supplier?.email && <p>{order.supplier.email}</p>}{order.supplier?.address && <p className="text-[#55555c]">{order.supplier.address}</p>}</div>
              <div><p className="text-[#77767e]">Tanggal Order</p><p className="mt-1 font-semibold text-[#222226]">{formatDate(order.order_date, { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
              <div><p className="text-[#77767e]">Dibuat oleh</p><p className="mt-1 font-semibold text-[#222226]">{order.user?.name || '-'}</p><p className="text-[#77767e]">{formatDateTime(order.created_at)}</p></div>
            </div>

            <div className="mt-6"><DataTable columns={columns} rows={order.items || []} emptyText="PO tidak memiliki item." /></div>
            <div className="mt-4 flex justify-end"><div className="w-full max-w-[260px] space-y-1 text-[12px]"><div className="flex justify-between border-t border-[#ececef] pt-3"><span className="text-[#77767e]">Total</span><strong className="text-[18px]">{formatRupiah(poTotal(order))}</strong></div></div></div>
            {order.notes && <div className="mt-4 rounded-xl bg-[#f7f7f8] p-3 text-[11px]"><p className="font-semibold">Catatan</p><p className="mt-1 text-[#55555c]">{order.notes}</p></div>}

            <div className="mt-16 hidden grid-cols-2 gap-10 text-center text-[11px] print:grid">
              <div><p>Hormat kami,</p><p className="mt-16 border-t border-[#18181a] pt-1 font-semibold">{order.user?.name || 'Owner'}</p><p>KEN-KEN Motor</p></div>
              <div><p>Disetujui supplier,</p><p className="mt-16 border-t border-[#18181a] pt-1 font-semibold">{order.supplier?.contact_name || '(.........................)'}</p><p>{order.supplier?.name}</p></div>
            </div>
          </Card>

          <Card className="no-print h-fit">
            <h2 className="text-[14px] font-semibold">Aksi</h2>
            {actionError && !confirm && <Alert tone="error" className="mt-3">{actionError}</Alert>}
            <div className="mt-4 space-y-2 text-[11px] text-[#55555c]">
              {order.status === 'draft' && <p>PO masih draft. Periksa item lalu tandai sebagai dipesan setelah dikirim ke supplier.</p>}
              {order.status === 'ordered' && <p>Menunggu barang datang. Catat kedatangan lewat menu Penerimaan Barang.</p>}
              {order.status === 'partial' && <p>Sebagian barang sudah diterima. Sisa barang masih ditunggu.</p>}
              {order.status === 'received' && <p>Seluruh barang sudah diterima dan stok sudah bertambah otomatis.</p>}
              {order.status === 'cancelled' && <p>PO dibatalkan.</p>}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {(order.status === 'draft' || order.status === 'ordered') && <Button variant="outline" className="w-full text-red-600" onClick={() => setConfirm({ type: 'status', status: 'cancelled' })}>Batalkan PO</Button>}
              {order.status === 'draft' && <Button variant="outline" icon="trash" className="w-full text-red-600" onClick={() => setConfirm({ type: 'delete' })}>Hapus PO</Button>}
            </div>
          </Card>
        </div>
      )}
      {confirm && <ConfirmDialog title={currentCopy.title} message={currentCopy.message} confirmLabel={currentCopy.label} confirmVariant={confirm.status === 'ordered' ? 'dark' : 'danger'} onConfirm={runAction} onClose={() => { setConfirm(null); setActionError('') }} busy={busy} error={actionError} />}
    </AppLayout>
  )
}

export default PurchaseOrderDetailPage
