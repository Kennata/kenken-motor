import { invalidateCache } from './apiHelpers'

export const STOCK_CHANGED_EVENT = 'kenken:stock-changed'

// Dipanggil setelah stok berubah agar cache spare part dan notifikasi stok minimum ikut diperbarui.
export function notifyStockChanged() {
  invalidateCache('/spare-parts')
  invalidateCache('/minimum-stock')
  window.dispatchEvent(new Event(STOCK_CHANGED_EVENT))
}
