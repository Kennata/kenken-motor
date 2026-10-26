import { useEffect, useState } from 'react'
import api from '../../lib/api'

const emptyForm = {
  code: '',
  name: '',
  category_id: '',
  unit: '',
  purchase_price: '',
  selling_price: '',
  opening_stock: '0',
  min_stock: '0',
  supplier_id: '',
}

function rowsFrom(response) {
  const payload = response?.data?.data ?? response?.data
  const rows = payload?.data ?? payload
  return Array.isArray(rows) ? rows : []
}

function AddSparePartModal({ onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [saving, setSaving] = useState(false)
  const [optionsError, setOptionsError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    let active = true
    async function loadOptions() {
      setLoadingOptions(true)
      setOptionsError('')
      try {
        const [categoryResponse, supplierResponse] = await Promise.all([
          api.get('/categories', { params: { per_page: 100 } }),
          api.get('/suppliers', { params: { per_page: 100 } }),
        ])
        if (!active) return
        setCategories(rowsFrom(categoryResponse))
        setSuppliers(rowsFrom(supplierResponse))
      } catch (error) {
        if (active) setOptionsError(error.response?.data?.message || 'Kategori dan supplier gagal dimuat dari server.')
      } finally {
        if (active) setLoadingOptions(false)
      }
    }
    loadOptions()
    return () => { active = false }
  }, [])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
    setSubmitError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setSubmitError('')
    setFieldErrors({})

    try {
      await api.post('/spare-parts', {
        code: form.code.trim(),
        name: form.name.trim(),
        category_id: Number(form.category_id),
        supplier_id: Number(form.supplier_id),
        unit: form.unit,
        purchase_price: Number(form.purchase_price),
        selling_price: Number(form.selling_price),
        opening_stock: Number(form.opening_stock),
        min_stock: Number(form.min_stock),
      })
      await onSaved?.()
      onClose()
    } catch (error) {
      const response = error.response?.data
      setFieldErrors(Object.fromEntries(Object.entries(response?.errors || {}).map(([key, messages]) => [key, messages?.[0] || 'Periksa kembali isian ini.'])))
      setSubmitError(response?.message || 'Spare part gagal disimpan. Periksa data dan koneksi backend.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'h-11 w-full rounded-xl border border-[#e1e1e5] bg-white px-4 text-[11px] text-[#25252a] outline-none transition placeholder:text-[#92929a] focus:border-[#a5b900] focus:ring-2 focus:ring-[#dfff00]/25 disabled:bg-[#f7f7f8]'
  const labelClass = 'mb-2 block text-[10px] font-medium text-[#33333a]'

  function fieldError(name) {
    return fieldErrors[name] ? <span className="mt-1 block text-[9px] text-red-600">{fieldErrors[name]}</span> : null
  }

  function handleBackdrop(event) {
    if (event.target === event.currentTarget && !saving) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-[5px] sm:p-6" onMouseDown={handleBackdrop}>
      <section role="dialog" aria-modal="true" aria-labelledby="add-spare-part-title" className="my-auto w-full max-w-[680px] rounded-[24px] bg-white px-6 py-6 shadow-2xl sm:px-7 sm:py-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-spare-part-title" className="text-[19px] font-medium tracking-[-.03em] text-[#222226]">Tambah Spare Part</h2>
            <p className="mt-1.5 text-[10px] text-[#77767e]">Lengkapi informasi berikut dengan benar.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Tutup modal" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4f4f5] text-[22px] leading-none text-[#25252a] transition hover:bg-[#e9e9eb] disabled:opacity-50">×</button>
        </header>

        {optionsError && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[10px] text-red-700" role="alert">{optionsError}<button type="button" className="ml-2 font-semibold underline" onClick={() => window.location.reload()}>Muat ulang</button></div>}
        {submitError && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[10px] text-red-700" role="alert">{submitError}</div>}

        <form className="mt-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
            <label className="block"><span className={labelClass}>Kode / SKU</span><input className={inputClass} name="code" value={form.code} onChange={updateField} placeholder="Contoh: OLI-001" maxLength={100} required />{fieldError('code')}</label>
            <label className="block"><span className={labelClass}>Nama Spare Part</span><input className={inputClass} name="name" value={form.name} onChange={updateField} placeholder="Nama produk" maxLength={255} required />{fieldError('name')}</label>

            <label className="block"><span className={labelClass}>Kategori</span><select className={inputClass} name="category_id" value={form.category_id} onChange={updateField} required disabled={loadingOptions || categories.length === 0}><option value="">{loadingOptions ? 'Memuat kategori...' : 'Pilih kategori'}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{fieldError('category_id')}</label>
            <label className="block"><span className={labelClass}>Satuan</span><select className={inputClass} name="unit" value={form.unit} onChange={updateField} required><option value="">Pilih satuan</option>{['pcs', 'set', 'buah', 'botol', 'liter', 'tube', 'pasang', 'roll'].map((unit) => <option key={unit} value={unit}>{unit.charAt(0).toUpperCase() + unit.slice(1)}</option>)}</select>{fieldError('unit')}</label>

            <label className="block"><span className={labelClass}>Harga Beli</span><input className={inputClass} name="purchase_price" type="number" min="0" step="0.01" value={form.purchase_price} onChange={updateField} placeholder="Rp 0" required />{fieldError('purchase_price')}</label>
            <label className="block"><span className={labelClass}>Harga Jual</span><input className={inputClass} name="selling_price" type="number" min="0" step="0.01" value={form.selling_price} onChange={updateField} placeholder="Rp 0" required />{fieldError('selling_price')}</label>

            <label className="block"><span className={labelClass}>Stok Awal</span><input className={inputClass} name="opening_stock" type="number" min="0" step="1" value={form.opening_stock} onChange={updateField} required />{fieldError('opening_stock')}</label>
            <label className="block"><span className={labelClass}>Minimum Stok</span><input className={inputClass} name="min_stock" type="number" min="0" step="1" value={form.min_stock} onChange={updateField} required />{fieldError('min_stock')}</label>

            <label className="block sm:col-span-2"><span className={labelClass}>Supplier</span><select className={inputClass} name="supplier_id" value={form.supplier_id} onChange={updateField} required disabled={loadingOptions || suppliers.length === 0}><option value="">{loadingOptions ? 'Memuat supplier...' : 'Pilih supplier'}</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>{fieldError('supplier_id')}</label>
          </div>

          <footer className="mt-5 flex justify-end gap-2.5">
            <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-full border border-[#e1e1e5] px-5 text-[10px] font-medium text-[#33333a] transition hover:bg-[#f7f7f8] disabled:opacity-50">Batal</button>
            <button type="submit" disabled={saving || loadingOptions || Boolean(optionsError)} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#18181a] px-5 text-[10px] font-semibold text-white transition hover:bg-[#343438] disabled:cursor-wait disabled:opacity-60"><span className="grid h-6 w-6 place-items-center rounded-full bg-white/15 text-[13px]">✓</span>{saving ? 'Menyimpan...' : 'Simpan Spare Part'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default AddSparePartModal