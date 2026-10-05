import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@whitraworks/ui';
import { TenantProvider } from './context/TenantContext';
import { TenantLayout } from './components/layout/TenantLayout';
import { DashboardPage } from './pages/Dashboard';
import { MembersPage } from './pages/Members';
import { SettingsPage } from './pages/Settings';

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="whitraworks-tenant-theme">
      <TenantProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TenantLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TenantProvider>
    </ThemeProvider>
  );
}

export default App;
