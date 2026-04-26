import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ServiceFrame from './pages/ServiceFrame'
import Assets from './pages/assets'
import Projects from './pages/projects'
import HR from './pages/hr'
import Tickets from './pages/tickets'
import Settings from './pages/settings'
import Notifications from './pages/Notifications'
import Reports from './pages/reports'
import Users from './pages/users'
import Admin from './pages/admin'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" />
}

function HRRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" />
  if (user.services?.hr !== 'active') return <Navigate to="/" />
  return children
}

function TicketsRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" />
  if (user.services?.tickets !== 'active') return <Navigate to="/" />
  return children
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
                <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/projects/*" element={<PrivateRoute><Projects /></PrivateRoute>} />
                <Route path="/hr/*" element={<HRRoute><HR /></HRRoute>} />
                <Route path="/tickets/*" element={<TicketsRoute><Tickets /></TicketsRoute>} />
                {/* iframe services (/chat /grafana /files /status)
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
