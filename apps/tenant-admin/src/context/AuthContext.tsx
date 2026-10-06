import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@whitraworks/types';
import {
  authApi,
  ActiveWorkspace,
  AvailableWorkspace,
  SessionProfile,
  ApiError,
} from '../lib/api';
import { useTenant } from './TenantContext';

interface AuthContextValue {
  user: User | null;
  activeWorkspace: ActiveWorkspace | null;
  availableWorkspaces: AvailableWorkspace[];
  isLoading: boolean;
  isAuthenticated: boolean;
  hasWorkspaceAccess: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchWorkspace: (targetSlug: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  updateActiveWorkspaceName: (newName: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { slug, resolution, setDevSlug } = useTenant();
  const [user, setUser] = useState<User | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace | null>(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<AvailableWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const profile: SessionProfile = await authApi.getMe(slug);
      setUser(profile.user);
      setActiveWorkspace(profile.activeWorkspace);
      setAvailableWorkspaces(profile.availableWorkspaces);
    } catch {
      setUser(null);
      setActiveWorkspace(null);
      setAvailableWorkspaces([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authApi.login(email, password, slug);
      setUser(result.user);
      if (result.activeWorkspace) {
        setActiveWorkspace(result.activeWorkspace);
      }
      // Refresh to populate available workspaces
      await refreshSession();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      setUser(null);
      setActiveWorkspace(null);
      setAvailableWorkspaces([]);
    }
  };

  const switchWorkspace = async (targetSlug: string) => {
    if (targetSlug === slug) return;

    try {
      const res = await authApi.switchWorkspace(targetSlug);
      if (resolution.isDevFallback) {
        // In local development mock mode, update the active dev slug and reload session
        setDevSlug(targetSlug);
        await refreshSession();
      } else if (res.redirectUrl) {
        // In production or host-based subdomain, navigate to the target workspace origin
        window.location.href = res.redirectUrl;
      }
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new Error(`Failed to switch to workspace "${targetSlug}".`);
    }
  };

  const updateActiveWorkspaceName = (newName: string) => {
    if (activeWorkspace) {
      setActiveWorkspace({ ...activeWorkspace, name: newName });
    }
    setAvailableWorkspaces((prev) =>
      prev.map((ws) => (ws.slug === slug ? { ...ws, name: newName } : ws))
    );
  };

  const isAuthenticated = !!user;
  const hasWorkspaceAccess =
    isAuthenticated &&
    !!activeWorkspace &&
    (activeWorkspace.slug === slug || !slug);

  return (
    <AuthContext.Provider
      value={{
        user,
        activeWorkspace,
        availableWorkspaces,
        isLoading,
        isAuthenticated,
        hasWorkspaceAccess,
        login,
        logout,
        switchWorkspace,
        refreshSession,
        updateActiveWorkspaceName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
