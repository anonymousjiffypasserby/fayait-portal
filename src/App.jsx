import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ServiceFrame from './pages/ServiceFrame'
import Assets from './pages/assets'
import Settings from './pages/settings'
import Notifications from './pages/Notifications'
import Reports from './pages/reports'
import Users from './pages/Users'
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
                <Route path="/assets/*" element={<Assets />} />
                <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
                <Route path="/billing" element={<ServiceFrame service="billing" />} />
                <Route path="/profile" element={<ServiceFrame service="profile" />} />
                <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
                <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
                <Route path="/notifications" element={<Notifications />} />
                {/* iframe services (/tickets /chat /grafana /files /projects /status)
                    are rendered persistently in Layout — no routes needed here */}
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
