import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { User } from '@whitraworks/types';
import { authApi, ApiError } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const result = await authApi.getMe();
        if (isMounted) {
          if (result.user && result.user.isPlatformSuperadmin) {
            setUser(result.user);
          } else {
            // Not a platform superadmin (Golden Rule 6)
            setUser(null);
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.login(email, password);
      // Strictly enforce Two-Tier Privilege Orthogonality (Rule 6)
      if (!result.user.isPlatformSuperadmin) {
        throw new ApiError(
          'Access denied. Your account is not authorized as a Root Platform Superadmin.',
          'AUTH_FORBIDDEN'
        );
      }
      setUser(result.user);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed. Please check your credentials.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network failure on logout
    } finally {
      setUser(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && user.isPlatformSuperadmin,
        error,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
