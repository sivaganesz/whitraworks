import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Badge, Button, Input, ThemeToggle } from '@whitraworks/ui';
import {
  LayoutDashboard,
  Users,
  Settings,
  Building,
  Globe,
  Sliders,
  Menu,
  X,
  Layers,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export function TenantLayout() {
  const { slug, resolution, setDevSlug } = useTenant();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [slugInput, setSlugInput] = useState(slug || '');

  const navItems = [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
    { label: 'Members & Roles', to: '/members', icon: Users },
    { label: 'Workspace Settings', to: '/settings', icon: Settings },
  ];

  const handleSlugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slugInput.trim()) {
      setDevSlug(slugInput.trim());
      setIsEditingSlug(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        {/* Workspace Brand / Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-sm">
            W
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {slug ? slug.toUpperCase() : 'WORKSPACE'}
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              WhitraWorks Tenant
            </p>
          </div>
        </div>

        {/* Workspace Subdomain Status Pill */}
        <div className="p-3 mx-3 my-2 rounded-lg bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-800/80">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Subdomain</span>
            {resolution.isDevFallback ? (
              <Badge variant="provisioning" className="text-[10px]">Dev Mock</Badge>
            ) : (
              <Badge variant="active" className="text-[10px]">Live Host</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">{slug || 'unknown'}.whitraworks.com</span>
          </div>

          {resolution.isDevFallback && (
            <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              {isEditingSlug ? (
                <form onSubmit={handleSlugSubmit} className="flex gap-1.5">
                  <Input
                    type="text"
                    value={slugInput}
                    onChange={(e) => setSlugInput(e.target.value)}
                    className="h-7 text-xs"
                    placeholder="e.g. acme-corp"
                  />
                  <Button type="submit" size="sm" variant="secondary" className="h-7 px-2 text-xs">
                    Set
                  </Button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingSlug(true)}
                  className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 flex items-center gap-1"
                >
                  <Sliders className="w-3 h-3" /> Change dev slug
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-600 hover:bg-zinc-100/60 dark:text-zinc-400 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Workspace Tier Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-400" />
            <div className="min-w-0 flex-1 truncate">
              <p className="font-medium text-zinc-700 dark:text-zinc-300">Data Plane Isolated</p>
              <p className="text-[11px] text-zinc-400">Golden Rule 2 & 5</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Navbar */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Workspace /</span>
              <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {slug || 'Workspace'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Active</span>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
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
