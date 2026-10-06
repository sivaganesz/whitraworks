import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { workspaceApi, TenantCapability, ApiError } from '../lib/api';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';

interface CapabilityContextValue {
  capabilities: TenantCapability[];
  enabledCapabilityCodes: string[];
  isLoading: boolean;
  error: string | null;
  refreshCapabilities: () => Promise<void>;
  isCapabilityEnabled: (code: string) => boolean;
  getCapabilityConfig: (code: string) => Record<string, unknown>;
}

const CapabilityContext = createContext<CapabilityContextValue | undefined>(undefined);

export function CapabilityProvider({ children }: { children: React.ReactNode }) {
  const { slug } = useTenant();
  const { isAuthenticated } = useAuth();
  const [capabilities, setCapabilities] = useState<TenantCapability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCapabilities = useCallback(async () => {
    if (!isAuthenticated) {
      setCapabilities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await workspaceApi.getCapabilities(slug);
      setCapabilities(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to fetch workspace capabilities.');
      }
      setCapabilities([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug, isAuthenticated]);

  useEffect(() => {
    refreshCapabilities();
  }, [refreshCapabilities]);

  const enabledCapabilityCodes = useMemo(() => {
    return capabilities.filter((c) => c.enabled).map((c) => c.code);
  }, [capabilities]);

  const isCapabilityEnabled = useCallback(
    (code: string) => {
      const found = capabilities.find((c) => c.code.toLowerCase() === code.toLowerCase());
      return Boolean(found?.enabled);
    },
    [capabilities]
  );

  const getCapabilityConfig = useCallback(
    (code: string) => {
      const found = capabilities.find((c) => c.code.toLowerCase() === code.toLowerCase());
      return (found?.config as Record<string, unknown>) || {};
    },
    [capabilities]
  );

  return (
    <CapabilityContext.Provider
      value={{
        capabilities,
        enabledCapabilityCodes,
        isLoading,
        error,
        refreshCapabilities,
        isCapabilityEnabled,
        getCapabilityConfig,
      }}
    >
      {children}
    </CapabilityContext.Provider>
  );
}

export function useCapabilities() {
  const context = useContext(CapabilityContext);
  if (!context) {
    throw new Error('useCapabilities must be used within a CapabilityProvider');
  }
  return context;
}

