import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ComingSoonPage from './pages/ComingSoonPage'
import SparePartsPage from './pages/inventory/SparePartsPage'
import StockMovementsPage from './pages/inventory/StockMovementsPage'
import StockOpnamePage from './pages/inventory/StockOpnamePage'
import SuppliersPage from './pages/procurement/SuppliersPage'
import PurchaseOrdersPage from './pages/procurement/PurchaseOrdersPage'
import PurchaseOrderFormPage from './pages/procurement/PurchaseOrderFormPage'
import PurchaseOrderDetailPage from './pages/procurement/PurchaseOrderDetailPage'
import MinimumStockPage from './pages/settings/MinimumStockPage'
import { matchPath, useLocation } from './lib/router'
import { generalNavigation, navigation } from './components/layout/navigation'

const routes = [
  { path: '/', render: () => <HomePage /> },
  { path: '/login', render: () => <LoginPage /> },
  { path: '/dashboard', render: () => <DashboardPage /> },
  // FR-01 s.d. FR-04
  { path: '/inventory/spare-parts', render: () => <SparePartsPage /> },
  { path: '/inventory/stock-in', render: () => <StockMovementsPage key="in" type="in" /> },
  { path: '/inventory/stock-out', render: () => <StockMovementsPage key="out" type="out" /> },
  { path: '/inventory/stock-opname', render: () => <StockOpnamePage /> },
  { path: '/settings/minimum-stock', render: () => <MinimumStockPage /> },
  // FR-05 dan FR-06
  { path: '/procurement/suppliers', render: () => <SuppliersPage /> },
  { path: '/procurement/purchase-orders', render: () => <PurchaseOrdersPage /> },
  { path: '/procurement/purchase-orders/new', render: () => <PurchaseOrderFormPage /> },
  { path: '/procurement/purchase-orders/:id/edit', render: ({ id }) => <PurchaseOrderFormPage key={id} id={id} /> },
  { path: '/procurement/purchase-orders/:id', render: ({ id }) => <PurchaseOrderDetailPage key={id} id={id} /> },
]

// Menu yang belum dibuat halamannya tetap bisa dibuka dan menampilkan placeholder.
const menuTitles = Object.fromEntries([...navigation, ...generalNavigation].flatMap((entry) => entry.items ? entry.items.map((item) => [item.to, { title: item.title, roles: item.roles }]) : [[entry.to, { title: entry.title, roles: entry.roles }]]))

function App() {
  const { pathname } = useLocation()
  for (const route of routes) {
    const params = matchPath(route.path, pathname)
    if (params) return route.render(params)
  }
  if (menuTitles[pathname]) return <ComingSoonPage key={pathname} title={menuTitles[pathname].title} roles={menuTitles[pathname].roles} />
  return <HomePage />
}

export default App
