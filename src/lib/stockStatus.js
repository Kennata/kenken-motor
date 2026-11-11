export function stockStatus(part) {
  const stock = Number(part?.stock || 0)
  if (stock <= 0) return { label: 'Habis', tone: 'red' }
  if (part?.is_low_stock || stock <= Number(part?.min_stock || 0)) return { label: 'Menipis', tone: 'amber' }
  return { label: 'Aman', tone: 'green' }
}
