import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ThemeToggle, Button } from '@whitraworks/ui';
import {
  Menu,
  X,
  LogOut,
  User,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from '../Sidebar';
import { WorkspaceSwitcher } from '../WorkspaceSwitcher';

export function TenantLayout() {
  const { resolution } = useTenant();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex">
      {/* Desktop Dynamic Sidebar */}
      <Sidebar className="hidden md:flex w-64" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Navbar */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Workspace Switcher in Header */}
            <WorkspaceSwitcher />
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="h-4 w-px bg-zinc-200 dark:border-zinc-800 hidden sm:block" />

            {/* User Profile & Sign Out */}
            {user && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 max-w-[140px] truncate">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  className="h-8 px-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 gap-1 text-xs"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Mobile Navigation Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} className="w-full border-none" />
          </div>
        )}

        {/* Main Body View */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {resolution.error && (
            <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-700 dark:text-amber-400">
              <p className="font-semibold">Subdomain Resolution Warning</p>
              <p className="mt-1">{resolution.error}</p>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
