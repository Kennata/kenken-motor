import { useCallback, useEffect, useMemo, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import Icon from '../../components/Icon'
import { Alert, Badge, Button, Card, ConfirmDialog, DataTable, Field, IconButton, Modal, Pagination, SearchInput, SelectFilter, inputClass } from '../../components/ui'
import { handleUnauthorized, useDebouncedValue } from '../../hooks/useResourceList'
import api from '../../lib/api'
import { errorMessage, fetchAll, fieldErrorsFrom, invalidateCache, objectFrom } from '../../lib/apiHelpers'
import { getStoredUser } from '../../lib/session'

const PAGE_SIZE = 8
const EMPTY_FORM = { name: '', email: '', role: 'mekanik', password: '', password_confirmation: '' }

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'
}

function UserForm({ user, onClose, onSaved }) {
  const editing = Boolean(user)
  const [form, setForm] = useState(() => editing ? { ...EMPTY_FORM, name: user.name, email: user.email, role: user.role } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})

  function update(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setErrors({})
    const body = { name: form.name.trim(), email: form.email.trim(), role: form.role }
    if (!editing || form.password) {
      body.password = form.password
      body.password_confirmation = form.password_confirmation
    }
    try {
      const response = editing ? await api.patch(`/users/${user.id}`, body) : await api.post('/users', body)
      invalidateCache('/users')
      await onSaved(objectFrom(response))
      onClose()
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) {
        setErrors(fieldErrorsFrom(requestError))
        setError(errorMessage(requestError, 'Pengguna gagal disimpan.'))
      }
    } finally { setSaving(false) }
  }

  return <Modal title={editing ? 'Ubah Pengguna' : 'Tambah Pengguna'} description="Atur nama, email, role, dan kata sandi akun bengkel." onClose={onClose} busy={saving}>
    {error && <Alert tone="error" className="mt-4">{error}</Alert>}
    <form onSubmit={submit} className="mt-5 space-y-3.5">
      <Field label="Nama Pengguna" error={errors.name}><input className={inputClass} name="name" value={form.name} onChange={update} placeholder="Nama lengkap" maxLength={255} required disabled={saving}/></Field>
      <Field label="Email" error={errors.email}><input className={inputClass} name="email" type="email" value={form.email} onChange={update} placeholder="nama@bengkel.id" maxLength={255} required disabled={saving}/></Field>
      <Field label="Role" error={errors.role}><select className={`${inputClass} appearance-none`} name="role" value={form.role} onChange={update} disabled={saving}><option value="owner">Owner</option><option value="mekanik">Mekanik</option></select></Field>
      <Field label={editing ? 'Kata Sandi Baru (opsional)' : 'Kata Sandi'} error={errors.password}><input className={inputClass} name="password" type="password" value={form.password} onChange={update} minLength={8} autoComplete="new-password" placeholder={editing ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'} required={!editing} disabled={saving}/></Field>
      {(!editing || form.password) && <Field label="Konfirmasi Kata Sandi" error={errors.password_confirmation}><input className={inputClass} name="password_confirmation" type="password" value={form.password_confirmation} onChange={update} minLength={8} autoComplete="new-password" required disabled={saving}/></Field>}
      <footer className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button><Button type="submit" icon="check" disabled={saving}>{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Simpan Pengguna'}</Button></footer>
    </form>
  </Modal>
}

function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteState, setDeleteState] = useState({ busy: false, error: '' })
  const debouncedSearch = useDebouncedValue(search)
  const currentUser = getStoredUser()

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setUsers(await fetchAll(api, '/users', { q: debouncedSearch || undefined })) }
    catch (requestError) { if (!handleUnauthorized(requestError)) setError(errorMessage(requestError, 'Daftar pengguna gagal dimuat.')) }
    finally { setLoading(false) }
  }, [debouncedSearch])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])

  const filtered = useMemo(() => users.filter((user) => !roleFilter || user.role === roleFilter), [users, roleFilter])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE
  const rows = filtered.slice(start, start + PAGE_SIZE)
  const meta = { current_page: currentPage, last_page: pageCount, from: filtered.length ? start + 1 : 0, to: Math.min(start + PAGE_SIZE, filtered.length), total: filtered.length }

  async function removeUser() {
    setDeleteState({ busy: true, error: '' })
    try {
      await api.delete(`/users/${deleting.id}`)
      setDeleting(null); setDeleteState({ busy: false, error: '' })
      if (rows.length === 1 && page > 1) setPage(page - 1)
      await load()
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) setDeleteState({ busy: false, error: errorMessage(requestError, 'Pengguna tidak dapat dihapus. Pastikan masih ada Owner dan akun bukan akun yang sedang digunakan.') })
    }
  }

  const columns = [
    { key: 'name', label: 'Pengguna', render: (user) => <div className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f1f1f2] text-[10px] font-semibold text-[#66666e]">{initials(user.name)}</span><span className="font-medium text-[#222226]">{user.name}</span></div> },
    { key: 'email', label: 'Email', className: 'text-[#55555c]' },
    { key: 'role', label: 'Role', render: (user) => <Badge tone={user.role === 'owner' ? 'amber' : 'gray'}>{user.role === 'owner' ? 'Owner' : 'Mekanik'}</Badge> },
    { key: 'status', label: 'Status', render: () => <Badge tone="green">Aktif</Badge> },
    { key: 'actions', label: 'Aksi', render: (user) => <div className="flex gap-1.5" onClick={(event) => event.stopPropagation()}><IconButton icon="edit" label={`Ubah ${user.name}`} onClick={() => setEditing(user)}/><IconButton icon="trash" tone="danger" label={`Hapus ${user.name}`} disabled={Number(user.id) === Number(currentUser?.id)} onClick={() => { setDeleteState({ busy: false, error: '' }); setDeleting(user) }}/></div> },
  ]

  const toolbar = <><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Cari di sini..." className="w-[min(34vw,230px)]"/><div className="relative"><button type="button" onClick={() => setFilterOpen((value) => !value)} aria-label="Filter role pengguna" aria-expanded={filterOpen} className="grid h-11 w-11 place-items-center rounded-full border border-[#e2e2e5] bg-white text-[#55555d]"><Icon name="filter" className="h-5 w-5"/></button>{filterOpen && <div className="absolute right-0 top-12 z-30 w-44 rounded-xl border border-[#e5e5e8] bg-white p-3 shadow-xl"><label className="text-[10px] font-medium text-[#55555c]">Role<SelectFilter label="Role" value={roleFilter} onChange={(value) => { setRoleFilter(value); setPage(1) }} className="mt-2 w-full"><option value="">Semua role</option><option value="owner">Owner</option><option value="mekanik">Mekanik</option></SelectFilter></label></div>}</div></>

  return <AppLayout title="User & Role" subtitle="Kelola akun dan hak akses pengguna bengkel." toolbar={toolbar} actions={<Button icon="plus" onClick={() => setEditing('new')}>Tambah Pengguna</Button>}>
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Cari pengguna..." className="w-full sm:w-[280px]"/><SelectFilter label="Filter role" value={roleFilter} onChange={(value) => { setRoleFilter(value); setPage(1) }} className="w-[130px]"><option value="">Semua role</option><option value="owner">Owner</option><option value="mekanik">Mekanik</option></SelectFilter></div>
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={load} emptyText="Pengguna tidak ditemukan." rowKey={(user) => user.id}/>
      <Pagination meta={meta} onPageChange={setPage}/>
      <p className="mt-3 text-[9px] text-[#9999a1]">Status Aktif mengikuti akun yang terdaftar. Backend saat ini belum menyediakan fitur menonaktifkan akun.</p>
    </Card>
    {editing && <UserForm user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { await load() }}/>}
    {deleting && <ConfirmDialog title="Hapus pengguna?" message={`Akun ${deleting.name} (${deleting.email}) akan dihapus permanen. Akun yang sedang digunakan tidak dapat dihapus; backend juga menjaga agar selalu ada Owner.`} confirmLabel="Hapus Pengguna" onConfirm={removeUser} onClose={() => { if (!deleteState.busy) { setDeleting(null); setDeleteState({ busy: false, error: '' }) } }} busy={deleteState.busy} error={deleteState.error}/>}
  </AppLayout>
}

export default UsersPage
