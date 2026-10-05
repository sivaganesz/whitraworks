import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Badge } from '@whitraworks/ui';
import {
  X,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  opsApi,
  type TenantListItem,
  type CapabilityItem,
  ApiError,
} from '../lib/api';

interface CapabilityManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantListItem | null;
  onSuccess: () => void;
}

const CATEGORY_LABELS: Record<CapabilityItem['category'], string> = {
  core: 'Core Architecture',
  operations: 'Operations & Kitchen',
  fulfillment: 'Fulfillment & Logistics',
  intelligence: 'Business Intelligence & Reporting',
};

export function CapabilityManagerDrawer({
  isOpen,
  onClose,
  tenant,
  onSuccess,
}: CapabilityManagerDrawerProps) {
  const [capabilities, setCapabilities] = useState<CapabilityItem[]>([]);
  const [toggleState, setToggleState] = useState<Record<string, boolean>>({});
  const [initialState, setInitialState] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationNotice, setValidationNotice] = useState<string | null>(null);

  const loadCapabilities = useCallback(async (tenantId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setValidationNotice(null);
    try {
      const res = await opsApi.getTenantCapabilities(tenantId);
      setCapabilities(res.capabilities);
      const stateMap: Record<string, boolean> = {};
      for (const cap of res.capabilities) {
        stateMap[cap.code] = cap.isEnabled;
      }
      setToggleState(stateMap);
      setInitialState(stateMap);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load capability configurations.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && tenant) {
      loadCapabilities(tenant.id);
    }
  }, [isOpen, tenant, loadCapabilities]);

  // Group capabilities by category
  const groupedCapabilities = useMemo(() => {
    const groups: Record<CapabilityItem['category'], CapabilityItem[]> = {
      core: [],
      operations: [],
      fulfillment: [],
      intelligence: [],
    };
    for (const cap of capabilities) {
      const grp = groups[cap.category];
      if (grp) {
        grp.push(cap);
      }
    }
    return groups;
  }, [capabilities]);

  // Check if any change has been made
  const isDirty = useMemo(() => {
    for (const code of Object.keys(toggleState)) {
      if (toggleState[code] !== initialState[code]) {
        return true;
      }
    }
    return false;
  }, [toggleState, initialState]);

  const handleToggle = (code: string) => {
    setErrorMessage(null);
    setValidationNotice(null);
    const willEnable = !toggleState[code];
    const targetCap = capabilities.find((c) => c.code === code);
    if (!targetCap) return;

    const nextState = { ...toggleState };

    if (willEnable) {
      // If enabling, ensure all dependencies are also enabled
      nextState[code] = true;
      const autoEnabledDeps: string[] = [];

      const enableDepsRecursively = (capCode: string) => {
        const item = capabilities.find((c) => c.code === capCode);
        if (!item) return;
        for (const dep of item.dependencies) {
          if (!nextState[dep]) {
            nextState[dep] = true;
            const depName = capabilities.find((c) => c.code === dep)?.name || dep;
            autoEnabledDeps.push(depName);
            enableDepsRecursively(dep);
          }
        }
      };

      enableDepsRecursively(code);

      if (autoEnabledDeps.length > 0) {
        setValidationNotice(
          `Auto-enabled required dependency: ${autoEnabledDeps.join(', ')}`
        );
      }
    } else {
      // If disabling, disable all dependent capabilities
      nextState[code] = false;
      const autoDisabledDependents: string[] = [];

      const disableDependentsRecursively = (disabledCode: string) => {
        for (const other of capabilities) {
          if (other.dependencies.includes(disabledCode) && nextState[other.code]) {
            nextState[other.code] = false;
            autoDisabledDependents.push(other.name);
            disableDependentsRecursively(other.code);
          }
        }
      };

      disableDependentsRecursively(code);

      if (autoDisabledDependents.length > 0) {
        setValidationNotice(
          `Deactivating "${targetCap.name}" also deactivated dependent modules: ${autoDisabledDependents.join(', ')}`
        );
      }
    }

    setToggleState(nextState);
  };

  const handleSave = async () => {
    if (!tenant) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await opsApi.updateTenantCapabilities(tenant.id, toggleState);
      setInitialState(toggleState);
      setSuccessMessage('Capabilities successfully updated and audit logged.');
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to update tenant capabilities.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setToggleState(initialState);
    setValidationNotice(null);
    setErrorMessage(null);
  };

  if (!isOpen || !tenant) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-xl bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                  Manage Tenant Capabilities
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {tenant.name}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <code className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    {tenant.slug}.whitraworks.com
                  </code>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback banners */}
          {(errorMessage || successMessage || validationNotice) && (
            <div className="px-6 pt-4 space-y-2">
              {errorMessage && (
                <div className="p-3 text-xs flex items-center gap-2 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/60">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="p-3 text-xs flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-900/60">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}
              {validationNotice && (
                <div className="p-3 text-xs flex items-center gap-2 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/60">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{validationNotice}</span>
                </div>
              )}
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-zinc-500 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
                Loading capabilities registry...
              </div>
            ) : (
              (Object.keys(groupedCapabilities) as Array<CapabilityItem['category']>).map(
                (category) => {
                  const items = groupedCapabilities[category];
                  if (!items || items.length === 0) return null;

                  return (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center gap-2 pb-1 border-b border-zinc-100 dark:border-zinc-800/80">
                        <Layers className="w-3.5 h-3.5 text-zinc-400" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          {CATEGORY_LABELS[category]}
                        </h3>
                      </div>

                      <div className="space-y-2.5">
                        {items.map((cap) => {
                          const isEnabled = Boolean(toggleState[cap.code]);
                          return (
                            <div
                              key={cap.code}
                              className={`p-4 rounded-xl border transition-all ${
                                isEnabled
                                  ? 'bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-300 dark:border-zinc-700 shadow-sm'
                                  : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 opacity-75'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-zinc-950 dark:text-zinc-100">
                                      {cap.name}
                                    </span>
                                    <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                      {cap.code}
                                    </code>
                                  </div>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                    {cap.description}
                                  </p>

                                  {/* Dependencies list */}
                                  {cap.dependencies.length > 0 && (
                                    <div className="flex items-center gap-1.5 pt-1.5 text-[11px] text-zinc-400">
                                      <span className="flex items-center gap-1 font-medium">
                                        Requires:
                                      </span>
                                      {cap.dependencies.map((dep: string) => (
                                        <Badge
                                          key={dep}
                                          variant="neutral"
                                          className="text-[10px] py-0 px-1.5"
                                        >
                                          {dep}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Custom Toggle Switch */}
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isEnabled}
                                  onClick={() => handleToggle(cap.code)}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:ring-offset-2 ${
                                    isEnabled
                                      ? 'bg-zinc-900 dark:bg-zinc-100'
                                      : 'bg-zinc-200 dark:bg-zinc-800'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${
                                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>

          {/* Drawer Footer */}
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!isDirty || isSaving}
              className="text-xs"
            >
              Reset
            </Button>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSaving}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || isSaving || isLoading}
                className="flex items-center gap-1.5 text-xs bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Changes
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
