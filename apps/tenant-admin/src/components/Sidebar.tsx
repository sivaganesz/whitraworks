import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { Badge, Button, Input } from '@whitraworks/ui';
import {
  LayoutDashboard,
  Users,
  Settings,
  Globe,
  Sliders,
  Layers,
  RefreshCw,
  BookOpen,
  ClipboardList,
  Boxes,
  ChefHat,
  Truck,
  BarChart3,
  Sparkles,
  Info,
} from 'lucide-react';
import { CAPABILITY_REGISTRY, CapabilityDefinition } from '@whitraworks/types';
import { useTenant } from '../context/TenantContext';
import { useCapabilities } from '../context/CapabilityContext';

interface SidebarProps {
  onNavigate?: () => void;
  className?: string;
}

// Map capability codes to representative Lucide icons
const CAPABILITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  catalog: BookOpen,
  orders: ClipboardList,
  inventory: Boxes,
  kitchen: ChefHat,
  delivery: Truck,
  analytics: BarChart3,
};

export function Sidebar({ onNavigate, className = '' }: SidebarProps) {
  const { slug, resolution, setDevSlug } = useTenant();
  const { capabilities, isLoading, refreshCapabilities } = useCapabilities();
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [slugInput, setSlugInput] = useState(slug || '');

  // Core navigation items (present in all workspaces)
  const coreNavItems = [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
    { label: 'Team & Access', to: '/members', icon: Users },
    { label: 'Workspace Settings', to: '/settings', icon: Settings },
  ];

  // Dynamically resolve enabled capabilities for navigation tabs
  const enabledModuleTabs = useMemo(() => {
    return capabilities
      .filter((cap) => cap.enabled)
      .map((cap) => {
        const meta: CapabilityDefinition | undefined = CAPABILITY_REGISTRY[cap.code];
        const Icon = CAPABILITY_ICONS[cap.code] || Layers;
        return {
          code: cap.code,
          label: meta?.name || cap.code.toUpperCase(),
          description: meta?.description,
          category: meta?.category || 'operations',
          to: `/${cap.code}`,
          icon: Icon,
        };
      });
  }, [capabilities]);

  const handleSlugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slugInput.trim()) {
      setDevSlug(slugInput.trim());
      setIsEditingSlug(false);
    }
  };

  return (
    <aside
      className={`flex flex-col h-full border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 ${className}`}
    >
      {/* Workspace Brand / Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-sm">
          W
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {slug ? slug.toUpperCase() : 'WORKSPACE'}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
            Tenant Data Plane
          </p>
        </div>
      </div>

      {/* Subdomain Detection Status Pill */}
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

      {/* Navigation Links Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        {/* Core Workspace Section */}
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
            Workspace
          </p>
          <nav className="space-y-1">
            {coreNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50 font-semibold'
                        : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60 hover:text-zinc-950 dark:hover:text-zinc-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Dynamic Capability Modules Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Business Modules
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-zinc-400">
                {enabledModuleTabs.length} Active
              </span>
              <button
                type="button"
                onClick={() => refreshCapabilities()}
                disabled={isLoading}
                title="Refresh workspace capabilities"
                className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {enabledModuleTabs.length === 0 ? (
            <div className="mx-2 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-3 text-center">
              <Info className="w-4 h-4 text-zinc-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                No Modules Active
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                Enabled capabilities configured by Ops Admin appear here.
              </p>
            </div>
          ) : (
            <nav className="space-y-1">
              {enabledModuleTabs.map((module) => {
                const Icon = module.icon;
                return (
                  <NavLink
                    key={module.code}
                    to={module.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                        isActive
                          ? 'bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50 font-semibold'
                          : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60 hover:text-zinc-950 dark:hover:text-zinc-100'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
                      <span className="truncate">{module.label}</span>
                    </div>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 ml-2" />
                  </NavLink>
                );
              })}
            </nav>
          )}
        </div>
      </div>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-zinc-400 shrink-0" />
          <div className="min-w-0 flex-1 truncate">
            <p className="font-medium text-zinc-700 dark:text-zinc-300">Capability Engine</p>
            <p className="text-[11px] text-zinc-400 truncate">Golden Rule 3 Enforced</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

