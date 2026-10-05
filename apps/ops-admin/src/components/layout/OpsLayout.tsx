import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ScrollText,
  Activity,
  LogOut,
  Sliders,
} from 'lucide-react';
import { ThemeToggle } from '@whitraworks/ui';

export function OpsLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Session logout handled in Task 4.2
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/tenants', label: 'Tenants Directory', icon: Building2 },
    { to: '/audit-logs', label: 'Audit Trail', icon: ScrollText },
    { to: '/health', label: 'Platform Health', icon: Activity },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900/60 flex flex-col fixed inset-y-0 z-30">
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-850 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
              W
            </div>
            <div>
              <div className="font-semibold text-sm tracking-tight leading-none text-zinc-950 dark:text-zinc-50">
                WhitraWorks
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-1">
                Ops Control Plane
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Platform Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-850">
          <div className="bg-zinc-100 dark:bg-zinc-800/60 rounded-lg p-3 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                ops.whitraworks.com
              </span>
            </div>
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="h-16 px-8 border-b border-zinc-200 dark:border-zinc-850 bg-white/80 dark:bg-zinc-900/40 backdrop-blur sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300">
              Root Superadmin
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-850 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Sign out of control plane"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

