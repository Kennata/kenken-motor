// Struktur menu sidebar. `roles` membatasi siapa yang melihat item (default: owner saja),
// mengikuti hak akses di Panduan API: Mekanik hanya melihat spare part dan modul Bengkel.
export const navigation = [
  { id: 'dashboard', title: 'Dashboard', icon: 'grid', to: '/dashboard', roles: ['owner'] },
  {
    id: 'inventory', title: 'Inventory', icon: 'box', roles: ['owner', 'mekanik'], items: [
      { title: 'Daftar Spare Part', to: '/inventory/spare-parts', roles: ['owner', 'mekanik'] },
      { title: 'Stok Masuk', to: '/inventory/stock-in' },
      { title: 'Stok Keluar', to: '/inventory/stock-out' },
      { title: 'Stock Opname', to: '/inventory/stock-opname' },
    ],
  },
  {
    id: 'procurement', title: 'Procurement', icon: 'cart', items: [
      { title: 'Supplier', to: '/procurement/suppliers' },
      { title: 'Purchase Order', to: '/procurement/purchase-orders' },
      { title: 'Penerimaan Barang', to: '/procurement/goods-receipts' },
    ],
  },
  {
    id: 'bengkel', title: 'Bengkel', icon: 'wrench', roles: ['owner', 'mekanik'], items: [
      { title: 'Data Kendaraan', to: '/bengkel/vehicles', roles: ['owner', 'mekanik'] },
      { title: 'Work Order', to: '/bengkel/work-orders', roles: ['owner', 'mekanik'] },
      { title: 'Penggunaan Spare Part', to: '/bengkel/spare-part-usage', roles: ['owner', 'mekanik'] },
    ],
  },
  {
    id: 'shipping', title: 'Pengiriman', icon: 'truck', items: [
      { title: 'Pesanan Kirim', to: '/shipping/orders' },
      { title: 'Status Pengiriman', to: '/shipping/status' },
    ],
  },
  {
    id: 'reports', title: 'Laporan', icon: 'chart', items: [
      { title: 'Laporan Stok', to: '/reports/stock' },
      { title: 'Laporan Pembelian', to: '/reports/purchases' },
      { title: 'Laporan Penggunaan', to: '/reports/spare-part-usage' },
      { title: 'Laporan Supplier', to: '/reports/suppliers' },
    ],
  },
]

export const generalNavigation = [
  {
    id: 'settings', title: 'Pengaturan', icon: 'settings', items: [
      { title: 'User & Role', to: '/settings/users' },
      { title: 'Minimum Stok', to: '/settings/minimum-stock' },
      { title: 'Audit Log', to: '/settings/audit-logs' },
    ],
  },
  { id: 'help', title: 'Bantuan', icon: 'help', to: '/help', roles: ['owner', 'mekanik'] },
]

export function canSee(entry, role) {
  return (entry.roles || ['owner']).includes(role)
}

export function filterNavigation(entries, role) {
  return entries
    .filter((entry) => canSee(entry, role))
    .map((entry) => (entry.items ? { ...entry, items: entry.items.filter((item) => canSee(item, role)) } : entry))
    .filter((entry) => !entry.items || entry.items.length > 0)
}

export function isActivePath(to, pathname) {
  return pathname === to || pathname.startsWith(`${to}/`)
}
