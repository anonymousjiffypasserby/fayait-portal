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
import Whiteboard from './pages/Whiteboard'
import Meetings from './pages/Meetings'
import Wiki from './pages/Wiki'
import Documents from './pages/Documents'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" />
}

function ServiceRoute({ service, children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" />
  if (user.services?.[service] !== 'active') return <Navigate to="/" />
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
                <Route path="/hr/*" element={<ServiceRoute service="hr"><HR /></ServiceRoute>} />
                <Route path="/tickets/*" element={<ServiceRoute service="tickets"><Tickets /></ServiceRoute>} />
                <Route path="/whiteboard" element={<PrivateRoute><Whiteboard /></PrivateRoute>} />
                <Route path="/meetings" element={<ServiceRoute service="meetings"><Meetings /></ServiceRoute>} />
                {/* /chat /files /grafana /status /wiki /documents /passwords
                    rendered as native pages — routes added here as modules are built */}
                <Route path="/chat"      element={<ServiceFrame service="chat" />} />
                <Route path="/files"     element={<ServiceFrame service="files" />} />
                <Route path="/grafana"   element={<ServiceFrame service="grafana" />} />
                <Route path="/status"    element={<ServiceFrame service="status" />} />
                <Route path="/wiki"      element={<ServiceRoute service="wiki"><Wiki /></ServiceRoute>} />
                <Route path="/documents" element={<ServiceRoute service="documents"><Documents /></ServiceRoute>} />
                <Route path="/passwords" element={<ServiceFrame service="passwords" />} />
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
