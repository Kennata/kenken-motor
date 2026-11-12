import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import HelpPage from './pages/HelpPage'
import ComingSoonPage from './pages/ComingSoonPage'
import SparePartsPage from './pages/inventory/SparePartsPage'
import StockMovementsPage from './pages/inventory/StockMovementsPage'
import StockOpnamePage from './pages/inventory/StockOpnamePage'
import SuppliersPage from './pages/procurement/SuppliersPage'
import PurchaseOrdersPage from './pages/procurement/PurchaseOrdersPage'
import PurchaseOrderFormPage from './pages/procurement/PurchaseOrderFormPage'
import PurchaseOrderDetailPage from './pages/procurement/PurchaseOrderDetailPage'
import GoodsReceiptsPage from './pages/procurement/GoodsReceiptsPage'
import MinimumStockPage from './pages/settings/MinimumStockPage'
import UsersPage from './pages/settings/UsersPage'
import AuditLogsPage from './pages/settings/AuditLogsPage'
import VehiclesPage from './pages/workshop/VehiclesPage'
import WorkOrdersPage from './pages/workshop/WorkOrdersPage'
import SparePartUsagePage from './pages/workshop/SparePartUsagePage'
import ShipmentsPage from './pages/shipping/ShipmentsPage'
import ShipmentStatusPage from './pages/shipping/ShipmentStatusPage'
import StockReportPage from './pages/reports/StockReportPage'
import PurchaseReportPage from './pages/reports/PurchaseReportPage'
import UsageReportPage from './pages/reports/UsageReportPage'
import SupplierReportPage from './pages/reports/SupplierReportPage'
import { matchPath, useLocation } from './lib/router'
import { generalNavigation, navigation } from './components/layout/navigation'

const routes = [
  { path: '/', render: () => <HomePage /> },
  { path: '/login', render: () => <LoginPage /> },
  { path: '/dashboard', render: () => <DashboardPage /> },
  { path: '/help', render: () => <HelpPage /> },
  // FR-01 s.d. FR-04
  { path: '/inventory/spare-parts', render: () => <SparePartsPage /> },
  { path: '/inventory/stock-in', render: () => <StockMovementsPage key="in" type="in" /> },
  { path: '/inventory/stock-out', render: () => <StockMovementsPage key="out" type="out" /> },
  { path: '/inventory/stock-opname', render: () => <StockOpnamePage /> },
  { path: '/settings/minimum-stock', render: () => <MinimumStockPage /> },
  { path: '/settings/users', render: () => <UsersPage /> },
  { path: '/settings/audit-logs', render: () => <AuditLogsPage /> },
  // FR-05 dan FR-06
  { path: '/procurement/suppliers', render: () => <SuppliersPage /> },
  { path: '/procurement/purchase-orders', render: () => <PurchaseOrdersPage /> },
  { path: '/procurement/purchase-orders/new', render: () => <PurchaseOrderFormPage /> },
  { path: '/procurement/purchase-orders/:id/edit', render: ({ id }) => <PurchaseOrderFormPage key={id} id={id} /> },
  { path: '/procurement/purchase-orders/:id', render: ({ id }) => <PurchaseOrderDetailPage key={id} id={id} /> },
  { path: '/procurement/goods-receipts', render: () => <GoodsReceiptsPage /> },
  { path: '/bengkel/vehicles', render: () => <VehiclesPage /> },
  { path: '/bengkel/work-orders', render: () => <WorkOrdersPage /> },
  { path: '/bengkel/spare-part-usage', render: () => <SparePartUsagePage /> },
  { path: '/shipping/orders', render: () => <ShipmentsPage /> },
  { path: '/shipping/status', render: () => <ShipmentStatusPage /> },
  { path: '/reports/stock', render: () => <StockReportPage /> },
  { path: '/reports/purchases', render: () => <PurchaseReportPage /> },
  { path: '/reports/spare-part-usage', render: () => <UsageReportPage /> },
  { path: '/reports/suppliers', render: () => <SupplierReportPage /> },
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
