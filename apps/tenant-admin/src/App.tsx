import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@whitraworks/ui';
import { TenantProvider } from './context/TenantContext';
import { AuthProvider } from './context/AuthContext';
import { CapabilityProvider } from './context/CapabilityContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { TenantLayout } from './components/layout/TenantLayout';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { AcceptInvitePage } from './pages/AcceptInvite';
import { DashboardPage } from './pages/Dashboard';
import { MembersPage } from './pages/Members';
import { SettingsPage } from './pages/Settings';
import { CapabilityModulePage } from './pages/CapabilityModule';

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="whitraworks_tenant_theme">
      <TenantProvider>
        <AuthProvider>
          <CapabilityProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Onboarding & Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/invite/accept" element={<AcceptInvitePage />} />

                {/* Tenant Workspace Protected Area */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <TenantLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="members" element={<MembersPage />} />
                  <Route path="settings" element={<SettingsPage />} />

                  {/* Dynamic Capability-Based Module Routes */}
                  <Route path="catalog" element={<CapabilityModulePage />} />
                  <Route path="orders" element={<CapabilityModulePage />} />
                  <Route path="inventory" element={<CapabilityModulePage />} />
                  <Route path="kitchen" element={<CapabilityModulePage />} />
                  <Route path="delivery" element={<CapabilityModulePage />} />
                  <Route path="analytics" element={<CapabilityModulePage />} />
                </Route>

                {/* Catch-all route redirection */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </CapabilityProvider>
        </AuthProvider>
      </TenantProvider>
    </ThemeProvider>
  );
}

export default App;
