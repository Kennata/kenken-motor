import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { cachedFetchAll, errorMessage, fieldErrorsFrom } from '../../lib/apiHelpers'
import { Alert, Button, Field, Modal, inputClass } from '../../components/ui'

const UNITS = ['pcs', 'set', 'buah', 'botol', 'liter', 'tube', 'roll', 'pasang', 'unit']

function formFromPart(part) {
  if (!part) return { code: '', name: '', category_id: '', unit: '', purchase_price: '', selling_price: '', opening_stock: '0', min_stock: '0' }
  return {
    code: part.code || '',
    name: part.name || '',
    category_id: String(part.category_id ?? part.category?.id ?? ''),
    unit: part.unit || '',
    purchase_price: String(Number(part.purchase_price || 0)),
    selling_price: String(Number(part.selling_price || 0)),
    opening_stock: String(part.stock ?? 0),
    min_stock: String(part.min_stock ?? 0),
  }
}

// FR-01: tambah / ubah spare part. Kirim `sparePart` untuk mode ubah.
function AddSparePartModal({ sparePart = null, onClose, onSaved }) {
  const isEdit = Boolean(sparePart)
  const [form, setForm] = useState(() => formFromPart(sparePart))
  const [categories, setCategories] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [saving, setSaving] = useState(false)
  const [optionsError, setOptionsError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    let active = true
    cachedFetchAll(api, '/categories')
      .then((rows) => { if (active) setCategories(rows) })
      .catch((error) => { if (active) setOptionsError(errorMessage(error, 'Kategori gagal dimuat dari server.')) })
      .finally(() => { if (active) setLoadingOptions(false) })
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
    const body = {
      code: form.code.trim(),
      name: form.name.trim(),
      category_id: Number(form.category_id),
      unit: form.unit,
      purchase_price: Number(form.purchase_price),
      selling_price: Number(form.selling_price),
      min_stock: Number(form.min_stock),
    }
    try {
      if (isEdit) await api.patch(`/spare-parts/${sparePart.id}`, body)
      else await api.post('/spare-parts', { ...body, opening_stock: Number(form.opening_stock) })
      await onSaved?.()
      onClose()
    } catch (error) {
      setFieldErrors(fieldErrorsFrom(error))
      setSubmitError(errorMessage(error, 'Spare part gagal disimpan. Periksa data dan koneksi backend.'))
    } finally {
      setSaving(false)
    }
  }

  const units = form.unit && !UNITS.includes(form.unit) ? [form.unit, ...UNITS] : UNITS
  const invalid = (name) => (fieldErrors[name] ? 'true' : undefined)
  const margin = Number(form.selling_price) - Number(form.purchase_price)

  return (
    <Modal title={isEdit ? 'Ubah Spare Part' : 'Tambah Spare Part'} description="Lengkapi informasi berikut dengan benar." onClose={onClose} busy={saving}>
      {optionsError && <Alert tone="error" className="mt-4">{optionsError}</Alert>}
      {submitError && <Alert tone="error" className="mt-4">{submitError}</Alert>}

      <form className="mt-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
          <Field label="Kode / SKU" error={fieldErrors.code}><input className={inputClass} aria-invalid={invalid('code')} name="code" value={form.code} onChange={updateField} placeholder="Contoh: OLI-001" maxLength={100} required autoFocus /></Field>
          <Field label="Nama Spare Part" error={fieldErrors.name}><input className={inputClass} aria-invalid={invalid('name')} name="name" value={form.name} onChange={updateField} placeholder="Nama produk" maxLength={255} required /></Field>

          <Field label="Kategori" error={fieldErrors.category_id}>
            <select className={inputClass} aria-invalid={invalid('category_id')} name="category_id" value={form.category_id} onChange={updateField} required disabled={loadingOptions}>
              <option value="">{loadingOptions ? 'Memuat kategori...' : 'Pilih kategori'}</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>
          <Field label="Satuan" error={fieldErrors.unit}>
            <select className={inputClass} aria-invalid={invalid('unit')} name="unit" value={form.unit} onChange={updateField} required>
              <option value="">Pilih satuan</option>
              {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </Field>

          <Field label="Harga Beli (Rp)" error={fieldErrors.purchase_price}><input className={inputClass} aria-invalid={invalid('purchase_price')} name="purchase_price" type="number" min="0" step="1" value={form.purchase_price} onChange={updateField} placeholder="0" required /></Field>
          <Field label="Harga Jual (Rp)" error={fieldErrors.selling_price || (form.selling_price && form.purchase_price && margin < 0 ? 'Harga jual lebih rendah dari harga beli.' : '')}><input className={inputClass} aria-invalid={invalid('selling_price')} name="selling_price" type="number" min="0" step="1" value={form.selling_price} onChange={updateField} placeholder="0" required /></Field>

          {isEdit ? (
            <Field label="Stok Saat Ini"><input className={inputClass} value={`${form.opening_stock} ${form.unit}`} disabled /><span className="mt-1 block text-[10px] text-[#77767e]">Stok berubah lewat penerimaan barang, work order, atau stock opname.</span></Field>
          ) : (
            <Field label="Stok Awal" error={fieldErrors.opening_stock}><input className={inputClass} aria-invalid={invalid('opening_stock')} name="opening_stock" type="number" min="0" step="1" value={form.opening_stock} onChange={updateField} required /></Field>
          )}
          <Field label="Minimum Stok" error={fieldErrors.min_stock}><input className={inputClass} aria-invalid={invalid('min_stock')} name="min_stock" type="number" min="0" step="1" value={form.min_stock} onChange={updateField} required /></Field>
        </div>

        <footer className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button type="submit" icon="check" disabled={saving || loadingOptions}>{saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Spare Part'}</Button>
        </footer>
      </form>
    </Modal>
  )
}

export default AddSparePartModal
