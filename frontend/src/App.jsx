import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import UserManagement from './pages/UserManagement'
import RoleManagement from './pages/RoleManagement'
import Preferences from './pages/Preferences'
import K8sManagement from './pages/K8sManagement'
import K8sClusterDetail from './pages/K8sClusterDetail'
import Authorization from './pages/Authorization'
import Audit from './pages/Audit'
import PolicyManagement from './pages/PolicyManagement'
import ConfigInspection from './pages/ConfigInspection'
import SecurityMonitoring from './pages/SecurityMonitoring'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles"
              element={
                <ProtectedRoute>
                  <RoleManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/preferences"
              element={
                <ProtectedRoute>
                  <Preferences />
                </ProtectedRoute>
              }
            />
            <Route
              path="/k8s"
              element={
                <ProtectedRoute>
                  <K8sManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/k8s/cluster/:id"
              element={
                <ProtectedRoute>
                  <K8sClusterDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/security/authorization"
              element={
                <ProtectedRoute>
                  <Authorization />
                </ProtectedRoute>
              }
            />
            <Route
              path="/security/roles"
              element={
                <ProtectedRoute>
                  <RoleManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/security/audit"
              element={
                <ProtectedRoute>
                  <Audit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/security/policy"
              element={
                <ProtectedRoute>
                  <PolicyManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/security/inspection"
              element={
                <ProtectedRoute>
                  <ConfigInspection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/security/monitoring"
              element={
                <ProtectedRoute>
                  <SecurityMonitoring />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
