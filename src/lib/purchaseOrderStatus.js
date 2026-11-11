// Status PO dari backend: draft → ordered → partial → received, atau cancelled.
export const PO_STATUSES = {
  draft: { label: 'Draft', tone: 'gray' },
  ordered: { label: 'Dipesan', tone: 'blue' },
  partial: { label: 'Diterima Sebagian', tone: 'amber' },
  received: { label: 'Selesai', tone: 'green' },
  cancelled: { label: 'Dibatalkan', tone: 'red' },
}

export function poStatus(status) {
  return PO_STATUSES[status] || { label: status || '-', tone: 'gray' }
}

export function poTotal(order) {
  if (order?.total !== undefined && order?.total !== null) return Number(order.total)
  return (order?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0)
}
