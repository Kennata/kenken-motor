import { useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import Link from '../../components/Link'
import { Alert, Badge, Button, Card, ConfirmDialog, DataTable, Field, IconButton, Modal, Pagination, SearchInput, inputClass } from '../../components/ui'
import { useDebouncedValue, useResourceList } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { errorMessage, fieldErrorsFrom, invalidateCache } from '../../lib/apiHelpers'
import { formatDate, formatRupiah } from '../../lib/format'
import { poStatus, poTotal } from '../../lib/purchaseOrderStatus'

const emptySupplier = { name: '', contact_name: '', phone: '', email: '', address: '' }

function SupplierFormModal({ supplier, onClose, onSaved }) {
  const isEdit = Boolean(supplier)
  const [form, setForm] = useState(() => (supplier ? Object.fromEntries(Object.keys(emptySupplier).map((key) => [key, supplier[key] || ''])) : emptySupplier))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  function update(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})
    // Field opsional yang kosong dikirim sebagai null agar bisa dikosongkan saat ubah data.
    const body = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim() || (key === 'name' ? '' : null)]))
    try {
      const response = isEdit ? await api.patch(`/suppliers/${supplier.id}`, body) : await api.post('/suppliers', body)
      invalidateCache('/suppliers')
      await onSaved(response?.data?.data)
      onClose()
    } catch (requestError) {
      setFieldErrors(fieldErrorsFrom(requestError))
      setError(errorMessage(requestError, 'Supplier gagal disimpan.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Ubah Supplier' : 'Tambah Supplier'} description="Nama supplier wajib diisi, data kontak lainnya opsional." onClose={onClose} busy={saving}>
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      <form className="mt-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
          <Field label="Nama Supplier" error={fieldErrors.name} className="sm:col-span-2"><input className={inputClass} name="name" value={form.name} onChange={update} placeholder="Contoh: PT Astra Otoparts" maxLength={255} required autoFocus /></Field>
          <Field label="Nama Kontak" error={fieldErrors.contact_name}><input className={inputClass} name="contact_name" value={form.contact_name} onChange={update} placeholder="Nama PIC" maxLength={255} /></Field>
          <Field label="Telepon" error={fieldErrors.phone}><input className={inputClass} name="phone" type="tel" value={form.phone} onChange={update} placeholder="08xx xxxx xxxx" maxLength={50} /></Field>
          <Field label="Email" error={fieldErrors.email} className="sm:col-span-2"><input className={inputClass} name="email" type="email" value={form.email} onChange={update} placeholder="pembelian@supplier.co.id" maxLength={255} /></Field>
          <Field label="Alamat" error={fieldErrors.address} className="sm:col-span-2"><textarea className={`${inputClass} h-24 py-3`} name="address" value={form.address} onChange={update} placeholder="Alamat lengkap supplier" /></Field>
        </div>
        <footer className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button type="submit" icon="check" disabled={saving}>{saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Supplier'}</Button>
        </footer>
      </form>
    </Modal>
  )
}

function PurchaseHistory({ supplier }) {
  const { rows, meta, loading, error } = useResourceList('/purchase-orders', { supplier_id: supplier?.id, per_page: 5 }, { enabled: Boolean(supplier) })
  return (
    <Card className="h-fit">
      <h2 className="text-[14px] font-semibold">Riwayat Pembelian</h2>
      <p className="mt-1 text-[11px] text-[#77767e]">{supplier ? supplier.name : 'Pilih supplier pada tabel untuk melihat riwayatnya.'}</p>
      {supplier && (
        <div className="mt-4 space-y-1">
          {loading && <p className="py-4 text-[11px] text-[#77767e]">Memuat riwayat...</p>}
          {!loading && error && <p className="py-4 text-[11px] text-red-600">{error}</p>}
          {!loading && !error && rows.length === 0 && <p className="py-4 text-[11px] text-[#77767e]">Belum ada purchase order untuk supplier ini.</p>}
          {!loading && rows.map((order) => {
            const status = poStatus(order.status)
            return (
              <Link key={order.id} to={`/procurement/purchase-orders/${order.id}`} className="flex items-start justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-[#f7f7f8]">
                <div><p className="text-[12px] font-semibold text-[#222226]">{order.number}</p><p className="text-[10px] text-[#77767e]">{formatDate(order.order_date)}</p></div>
                <div className="text-right"><p className="text-[12px] font-semibold">{formatRupiah(poTotal(order))}</p><Badge tone={status.tone} className="mt-1">{status.label}</Badge></div>
              </Link>
            )
          })}
          {meta?.total > rows.length && <Link to={`/procurement/purchase-orders?supplier_id=${supplier.id}`} className="block pt-2 text-center text-[11px] font-semibold text-[#33333a] underline">Lihat semua ({meta.total} PO)</Link>}
        </div>
      )}
    </Card>
  )
}

// FR-05: kelola data supplier.
function SuppliersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteState, setDeleteState] = useState({ busy: false, error: '' })
  const [selected, setSelected] = useState(null)
  const q = useDebouncedValue(search)
  const { rows, meta, loading, error, reload } = useResourceList('/suppliers', { q, page, per_page: 10 })
  const selectedSupplier = selected ?? rows[0] ?? null

  async function confirmDelete() {
    setDeleteState({ busy: true, error: '' })
    try {
      await api.delete(`/suppliers/${deleting.id}`)
      invalidateCache('/suppliers')
      if (selected?.id === deleting.id) setSelected(null)
      setDeleting(null)
      setDeleteState({ busy: false, error: '' })
      if (rows.length === 1 && page > 1) setPage(page - 1)
      else await reload()
    } catch (requestError) {
      setDeleteState({ busy: false, error: errorMessage(requestError, 'Supplier gagal dihapus. Supplier yang sudah punya purchase order mungkin tidak bisa dihapus.') })
    }
  }

  const columns = [
    { key: 'name', label: 'Supplier', render: (supplier) => <div className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#dfff00]/30 text-[10px] font-bold text-[#4d5900]">{supplier.name.slice(0, 2).toUpperCase()}</span><span className="font-medium text-[#222226]">{supplier.name}</span></div> },
    { key: 'contact', label: 'Kontak', render: (supplier) => <div><p className="font-medium">{supplier.contact_name || '-'}</p><p className="text-[10px] text-[#77767e]">{supplier.email || ''}</p></div> },
    { key: 'phone', label: 'Telepon', className: 'whitespace-nowrap', render: (supplier) => supplier.phone || '-' },
    { key: 'address', label: 'Alamat', className: 'max-w-[200px] truncate', render: (supplier) => supplier.address || '-' },
    { key: 'actions', label: 'Aksi', render: (supplier) => <div className="flex gap-1.5" onClick={(event) => event.stopPropagation()}><IconButton icon="edit" label={`Ubah ${supplier.name}`} onClick={() => setEditing(supplier)} /><IconButton icon="trash" tone="danger" label={`Hapus ${supplier.name}`} onClick={() => setDeleting(supplier)} /></div> },
  ]

  return (
    <AppLayout title="Supplier" subtitle="Kelola data pemasok spare part bengkel." actions={<Button icon="plus" onClick={() => setEditing('new')}>Tambah Supplier</Button>}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Cari supplier..." className="w-full sm:w-[280px]" />
            <p className="text-[11px] text-[#77767e]">Klik baris untuk melihat riwayat pembelian.</p>
          </div>
          <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} emptyText="Supplier tidak ditemukan." onRowClick={setSelected} selectedKey={selectedSupplier?.id} />
          <Pagination meta={meta} onPageChange={setPage} />
        </Card>
        <PurchaseHistory key={selectedSupplier?.id} supplier={selectedSupplier} />
      </div>

      {editing && <SupplierFormModal supplier={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={async (saved) => { await reload(); if (saved) setSelected(saved) }} />}
      {deleting && <ConfirmDialog title="Hapus supplier?" message={`"${deleting.name}" akan dihapus permanen.`} onConfirm={confirmDelete} onClose={() => { setDeleting(null); setDeleteState({ busy: false, error: '' }) }} busy={deleteState.busy} error={deleteState.error} />}
    </AppLayout>
  )
}

export default SuppliersPage
