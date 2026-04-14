import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ServiceFrame from './pages/ServiceFrame'
import Assets from './pages/assets'
import Accessories from './pages/accessories'
import Consumables from './pages/consumables'
import Settings from './pages/settings'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" />
  if (!['superadmin', 'admin'].includes(user.role)) return <Navigate to="/" />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tickets" element={<ServiceFrame service="tickets" />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/accessories" element={<Accessories />} />
                <Route path="/consumables" element={<Consumables />} />
                <Route path="/chat" element={<ServiceFrame service="chat" />} />
                <Route path="/files" element={<ServiceFrame service="files" />} />
                <Route path="/projects" element={<ServiceFrame service="projects" />} />
                <Route path="/status" element={<ServiceFrame service="status" />} />
                <Route path="/grafana" element={<ServiceFrame service="grafana" />} />
                <Route path="/users" element={<ServiceFrame service="users" />} />
                <Route path="/billing" element={<ServiceFrame service="billing" />} />
                <Route path="/profile" element={<ServiceFrame service="profile" />} />
                <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
