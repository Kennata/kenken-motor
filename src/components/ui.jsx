import { useEffect, useId } from 'react'
import Icon from './Icon'
import Link from './Link'

const buttonVariants = {
  dark: 'bg-[#18181a] text-white hover:bg-[#343438]',
  lime: 'bg-[#dfff00] text-[#18181a] hover:bg-[#ccec00]',
  outline: 'border border-[#e1e1e5] bg-white text-[#33333a] hover:bg-[#f7f7f8]',
  ghost: 'text-[#33333a] hover:bg-[#f0f0f2]',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

export function Button({ variant = 'dark', icon, children, className = '', to, ...props }) {
  const classes = `inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${className}`
  const content = <>{icon && <span className={`grid h-5 w-5 place-items-center rounded-full ${variant === 'dark' ? 'bg-white/15' : ''}`}><Icon name={icon} className="h-3.5 w-3.5" /></span>}{children}</>
  if (to) return <Link to={to} className={classes} {...props}>{content}</Link>
  return <button type="button" className={classes} {...props}>{content}</button>
}

export function IconButton({ icon, label, tone = 'default', className = '', ...props }) {
  const tones = {
    default: 'border-[#e5e5e8] text-[#55555c] hover:bg-[#f4f4f5]',
    danger: 'border-red-100 text-red-500 hover:bg-red-50',
  }
  return (
    <button type="button" aria-label={label} title={label} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-white transition disabled:opacity-40 ${tones[tone]} ${className}`} {...props}>
      <Icon name={icon} className="h-4 w-4" />
    </button>
  )
}

export function Card({ className = '', children, ...props }) {
  return <section className={`rounded-[20px] border border-[#e5e5e8] bg-white p-4 sm:p-5 ${className}`} {...props}>{children}</section>
}

export function SearchInput({ value, onChange, placeholder = 'Cari data...', className = '' }) {
  return (
    <label className={`flex h-10 items-center gap-2 rounded-full border border-[#e2e2e5] bg-white px-4 text-[#9999a1] focus-within:border-[#a5b900] focus-within:ring-2 focus-within:ring-[#dfff00]/25 ${className}`}>
      <Icon name="search" className="h-4 w-4 shrink-0" />
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} className="min-w-0 flex-1 bg-transparent text-[11px] text-[#25252a] outline-none placeholder:text-[#9999a1]" />
    </label>
  )
}

export function SelectFilter({ value, onChange, children, label, className = '' }) {
  return (
    <label className={`relative inline-flex h-10 items-center ${className}`}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full appearance-none rounded-full border border-[#e2e2e5] bg-white pl-4 pr-9 text-[11px] text-[#33333a] outline-none focus:border-[#a5b900]">
        {children}
      </select>
      <Icon name="chevronDown" className="pointer-events-none absolute right-3 h-4 w-4 text-[#77767e]" />
    </label>
  )
}

export function DateRange({ from, to, onChange }) {
  const inputClass = 'h-10 rounded-full border border-[#e2e2e5] bg-white px-3 text-[11px] text-[#33333a] outline-none focus:border-[#a5b900]'
  return (
    <div className="flex items-center gap-2 text-[11px] text-[#77767e]">
      <Icon name="calendar" className="h-4 w-4" />
      <input type="date" aria-label="Dari tanggal" value={from} max={to || undefined} onChange={(event) => onChange({ from: event.target.value, to })} className={inputClass} />
      <span>–</span>
      <input type="date" aria-label="Sampai tanggal" value={to} min={from || undefined} onChange={(event) => onChange({ from, to: event.target.value })} className={inputClass} />
    </div>
  )
}

const badgeTones = {
  green: 'bg-[#e7f5ea] text-[#23874a]',
  amber: 'bg-[#fff3dc] text-[#b86e00]',
  red: 'bg-red-50 text-red-600',
  gray: 'bg-[#efeff1] text-[#55555c]',
  blue: 'bg-[#e8f0ff] text-[#2f5bd3]',
  lime: 'bg-[#dfff00]/30 text-[#4d5900]',
}

export function Badge({ tone = 'gray', children, className = '' }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${badgeTones[tone]} ${className}`}>{children}</span>
}

export function PartAvatar() {
  return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f4f4f5] text-[#55555c]"><Icon name="wrench" className="h-4 w-4" /></span>
}

export function DataTable({ columns, rows, loading, error, onRetry, emptyText = 'Belum ada data.', rowKey = (row) => row.id, onRowClick, selectedKey }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-[11px]">
        <thead>
          <tr>
            {columns.map((column) => <th key={column.key} scope="col" className={`whitespace-nowrap border-b border-[#ececef] bg-[#f7f7f8] px-3 py-3 text-[10px] font-medium text-[#77767e] first:rounded-l-lg last:rounded-r-lg ${column.align === 'right' ? 'text-right' : ''} ${column.headerClassName || ''}`}>{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 && Array.from({ length: 5 }).map((_, index) => (
            <tr key={`skeleton-${index}`}>{columns.map((column) => <td key={column.key} className="border-b border-[#f0f0f2] px-3 py-4"><span className="block h-3 w-3/4 animate-pulse rounded bg-[#efeff1]" /></td>)}</tr>
          ))}
          {!loading && error && <tr><td colSpan={columns.length} className="px-3 py-10 text-center text-red-600">{error}{onRetry && <button type="button" onClick={onRetry} className="ml-2 font-semibold underline">Coba lagi</button>}</td></tr>}
          {!loading && !error && rows.length === 0 && <tr><td colSpan={columns.length} className="px-3 py-10 text-center text-[#77767e]">{emptyText}</td></tr>}
          {!error && rows.map((row, index) => {
            const key = rowKey(row, index)
            return (
              <tr key={key} onClick={onRowClick ? () => onRowClick(row) : undefined} className={`${onRowClick ? 'cursor-pointer' : ''} ${selectedKey === key ? 'bg-[#dfff00]/10' : 'hover:bg-[#fafafa]'} ${loading ? 'opacity-50' : ''}`}>
                {columns.map((column) => <td key={column.key} className={`border-b border-[#f0f0f2] px-3 py-3 text-[#33333a] ${column.align === 'right' ? 'text-right' : ''} ${column.className || ''}`}>{column.render ? column.render(row, index) : row[column.key]}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ meta, onPageChange }) {
  if (!meta) return null
  const current = meta.current_page || 1
  const last = meta.last_page || 1
  const start = Math.max(1, Math.min(current - 1, last - 2))
  const pages = Array.from({ length: Math.min(3, last) }, (_, index) => start + index)
  const pageClass = 'grid h-8 min-w-8 place-items-center rounded-full border px-2 text-[10px] font-semibold transition disabled:opacity-40'
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] text-[#77767e]">
      <p>Menampilkan {meta.from || 0}–{meta.to || 0} dari {meta.total || 0} data</p>
      <nav className="flex items-center gap-1.5" aria-label="Paginasi">
        <button type="button" className={`${pageClass} border-[#e5e5e8] bg-white`} disabled={current <= 1} onClick={() => onPageChange(current - 1)} aria-label="Halaman sebelumnya"><Icon name="chevronLeft" className="h-3.5 w-3.5" /></button>
        {pages.map((page) => <button key={page} type="button" aria-current={page === current ? 'page' : undefined} className={`${pageClass} ${page === current ? 'border-[#18181a] bg-[#18181a] text-white' : 'border-[#e5e5e8] bg-white text-[#33333a]'}`} onClick={() => onPageChange(page)}>{page}</button>)}
        <button type="button" className={`${pageClass} border-[#e5e5e8] bg-white`} disabled={current >= last} onClick={() => onPageChange(current + 1)} aria-label="Halaman berikutnya"><Icon name="chevronRight" className="h-3.5 w-3.5" /></button>
      </nav>
    </div>
  )
}

export function Alert({ tone = 'info', children, className = '' }) {
  const tones = {
    info: 'border-[#e8eec0] bg-[#f8fbe3] text-[#4d5900]',
    error: 'border-red-100 bg-red-50 text-red-700',
    success: 'border-[#cfe9d6] bg-[#e7f5ea] text-[#23874a]',
  }
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] ${tones[tone]} ${className}`}><Icon name={tone === 'error' ? 'alert' : tone === 'success' ? 'check' : 'info'} className="mt-px h-4 w-4 shrink-0" /><div className="min-w-0 flex-1">{children}</div></div>
}

export function Modal({ title, description, onClose, children, busy = false, size = 'max-w-[680px]' }) {
  const titleId = useId()
  useEffect(() => {
    function onKey(event) { if (event.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-[5px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className={`my-auto w-full ${size} rounded-[24px] bg-white px-6 py-6 shadow-2xl sm:px-7 sm:py-7`}>
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-[19px] font-medium tracking-[-.03em] text-[#222226]">{title}</h2>
            {description && <p className="mt-1.5 text-[11px] text-[#77767e]">{description}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Tutup" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4f4f5] text-[#25252a] transition hover:bg-[#e9e9eb] disabled:opacity-50"><Icon name="close" className="h-4 w-4" /></button>
        </header>
        {children}
      </section>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'Hapus', confirmVariant = 'danger', onConfirm, onClose, busy, error }) {
  return (
    <Modal title={title} onClose={onClose} busy={busy} size="max-w-[420px]">
      <p className="mt-4 text-[12px] leading-relaxed text-[#55555c]">{message}</p>
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      <footer className="mt-6 flex justify-end gap-2.5">
        <Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={busy}>{busy ? 'Memproses...' : confirmLabel}</Button>
      </footer>
    </Modal>
  )
}

export const inputClass = 'h-11 w-full rounded-xl border border-[#e1e1e5] bg-white px-4 text-[12px] text-[#25252a] outline-none transition placeholder:text-[#92929a] focus:border-[#a5b900] focus:ring-2 focus:ring-[#dfff00]/25 disabled:bg-[#f7f7f8] aria-[invalid=true]:border-red-400'

export function Field({ label, error, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[11px] font-medium text-[#33333a]">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[10px] text-red-600">{error}</span>}
    </label>
  )
}
