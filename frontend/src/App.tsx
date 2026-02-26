import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Clusters from '@/pages/Clusters'
import ClusterDetail from '@/pages/ClusterDetail'
import Namespaces from '@/pages/Namespaces'
import NamespaceDetail from '@/pages/NamespaceDetail'
import Teams from '@/pages/Teams'
import BusinessUnits from '@/pages/BusinessUnits'
import Documents from '@/pages/Documents'
import Dependencies from '@/pages/Dependencies'
import Reports from '@/pages/Reports'
import AuditLogs from '@/pages/AuditLogs'
import Settings from '@/pages/Settings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="clusters" element={<Clusters />} />
        <Route path="clusters/:id" element={<ClusterDetail />} />
        <Route path="namespaces" element={<Namespaces />} />
        <Route path="namespaces/:id" element={<NamespaceDetail />} />
        <Route path="teams" element={<Teams />} />
        <Route path="business-units" element={<BusinessUnits />} />
        <Route path="documents" element={<Documents />} />
        <Route path="dependencies" element={<Dependencies />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<AuditLogs />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
