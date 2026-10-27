import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'

function App() {
  if (window.location.pathname === '/login') return <LoginPage />
  if (window.location.pathname === '/dashboard') return <DashboardPage />
  return <HomePage />
}

export default App
