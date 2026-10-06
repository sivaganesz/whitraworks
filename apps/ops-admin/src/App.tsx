import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@whitraworks/ui';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OpsLayout } from './components/layout/OpsLayout';
import { OverviewPage } from './pages/Overview';
import { TenantsListPage } from './pages/TenantsList';
import { AuditLogsPage } from './pages/AuditLogs';
import { LoginPage } from './pages/Login';

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="whitraworks_ops_theme">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Ops Admin Control Plane Shell */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<OpsLayout />}>
                <Route index element={<OverviewPage />} />
                <Route path="tenants" element={<TenantsListPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="health" element={<OverviewPage />} />
              </Route>
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
