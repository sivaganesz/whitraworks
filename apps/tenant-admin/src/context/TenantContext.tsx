import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  resolveTenantSubdomain,
  SubdomainResolution,
  setDevWorkspaceSlug,
} from '../lib/subdomain';

interface TenantContextValue {
  slug: string | null;
  resolution: SubdomainResolution;
  setDevSlug: (newSlug: string) => void;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [resolution, setResolution] = useState<SubdomainResolution>(() =>
    resolveTenantSubdomain()
  );

  useEffect(() => {
    const handlePopState = () => {
      setResolution(resolveTenantSubdomain());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSetDevSlug = (newSlug: string) => {
    setDevWorkspaceSlug(newSlug);
    setResolution(resolveTenantSubdomain());
  };

  return (
    <TenantContext.Provider
      value={{
        slug: resolution.slug,
        resolution,
        setDevSlug: handleSetDevSlug,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
