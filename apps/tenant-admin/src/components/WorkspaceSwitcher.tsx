import { useState, useRef, useEffect } from 'react';
import { Badge } from '@whitraworks/ui';
import { Building2, Check, ChevronsUpDown, Loader2, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

export function WorkspaceSwitcher() {
  const { slug } = useTenant();
  const { activeWorkspace, availableWorkspaces, switchWorkspace } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switchingSlug, setSwitchingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleSelectWorkspace = async (targetSlug: string) => {
    if (targetSlug === slug) {
      setIsOpen(false);
      return;
    }

    try {
      setSwitchingSlug(targetSlug);
      setError(null);
      await switchWorkspace(targetSlug);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch workspace.');
    } finally {
      setSwitchingSlug(null);
    }
  };

  const currentWorkspaceName = activeWorkspace?.name || (slug ? slug.toUpperCase() : 'Select Workspace');

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Switcher Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-50"
        aria-expanded={isOpen}
      >
        <div className="w-5 h-5 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-[10px] shrink-0">
          {currentWorkspaceName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 max-w-[130px] sm:max-w-[180px]">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {currentWorkspaceName}
          </p>
          <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
            {slug || 'workspace'}
          </p>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
      </button>

      {/* Switcher Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-72 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl py-1 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Workspaces ({availableWorkspaces.length})
            </p>
            {error && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{error}</p>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800/60 p-1">
            {availableWorkspaces.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-500">
                No accessible workspaces found.
              </div>
            ) : (
              availableWorkspaces.map((ws) => {
                const isActive = ws.slug === slug;
                const isTargetSwitching = switchingSlug === ws.slug;

                return (
                  <button
                    key={ws.id}
                    onClick={() => handleSelectWorkspace(ws.slug)}
                    disabled={isTargetSwitching}
                    className={`w-full px-3 py-2 flex items-center justify-between text-left rounded-lg transition-colors text-xs ${
                      isActive
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 font-medium'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                      <div className="min-w-0 flex-1 truncate">
                        <p className="truncate font-medium">{ws.name}</p>
                        <p className="text-[10px] font-mono text-zinc-400 truncate">
                          {ws.slug}.whitraworks.com
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <Badge variant="neutral" className="text-[9px] px-1.5 py-0">
                        {ws.role}
                      </Badge>
                      {isTargetSwitching ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                      ) : isActive ? (
                        <Check className="w-3.5 h-3.5 text-zinc-950 dark:text-zinc-50" />
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Scenario A Notice */}
          <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
            <PlusCircle className="w-3 h-3 text-zinc-400 shrink-0" />
            <span>Additional workspaces are invite-only (Rule 10).</span>
          </div>
        </div>
      )}
    </div>
  );
}
