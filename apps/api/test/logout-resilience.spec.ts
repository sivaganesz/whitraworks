import { describe, it, expect, vi } from 'vitest';

/**
 * NOTE: This suite tests a SIMULATED logout state machine replicating the exact
 * try/catch/finally logic used in apps/ops-admin/src/context/AuthContext.tsx and
 * apps/tenant-admin/src/context/AuthContext.tsx.
 *
 * It does NOT mount the actual React AuthProvider / useAuth hook (as the frontend
 * apps do not include DOM testing harnesses like @testing-library/react or happy-dom).
 * The actual React components rely on JavaScript try/finally language semantics
 * and are verified end-to-end via real HTTP integration tests in auth.spec.ts.
 */
interface User {
  id: string;
  email: string;
  isPlatformSuperadmin: boolean;
}

class AuthStateManager {
  public user: User | null;
  public isLoading: boolean;

  constructor(initialUser: User | null = null) {
    this.user = initialUser;
    this.isLoading = false;
  }

  get isAuthenticated(): boolean {
    return !!this.user && this.user.isPlatformSuperadmin;
  }

  async logout(apiLogoutFn: () => Promise<void>): Promise<void> {
    try {
      await apiLogoutFn();
    } catch {
      // Ignore network failure on logout (Golden Rule: ensure local state is cleared)
    } finally {
      this.user = null;
    }
  }

  shouldRedirectFromLoginPage(fromPath: string = '/'): string | null {
    if (this.isAuthenticated) {
      return fromPath;
    }
    return null;
  }

  canAccessProtectedRoute(): boolean {
    return this.isAuthenticated;
  }
}

describe('Simulated Frontend Logout State Machine (AuthContext try/finally contract)', () => {
  const mockSuperadmin: User = {
    id: '018f3a2b-0000-7000-8000-000000000001',
    email: 'superadmin@whitraworks.online',
    isPlatformSuperadmin: true,
  };

  describe('1. Successful Logout Flow', () => {
    it('clears user state and disables isAuthenticated when API request succeeds', async () => {
      const auth = new AuthStateManager(mockSuperadmin);
      expect(auth.isAuthenticated).toBe(true);

      const mockApiLogout = vi.fn().mockResolvedValue({ message: 'Successfully logged out.' });

      await auth.logout(mockApiLogout);

      expect(mockApiLogout).toHaveBeenCalledTimes(1);
      expect(auth.user).toBeNull();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.canAccessProtectedRoute()).toBe(false);
    });

    it('prevents bounce-back to dashboard on /login after successful logout', async () => {
      const auth = new AuthStateManager(mockSuperadmin);
      await auth.logout(vi.fn().mockResolvedValue({}));

      // In LoginPage.tsx: useEffect checks if (isAuthenticated) navigate(from)
      const redirectTarget = auth.shouldRedirectFromLoginPage('/');
      expect(redirectTarget).toBeNull();
    });
  });

  describe('2. API Failure Handling (Network Error / Offline / Server 500)', () => {
    it('clears user state even when API logout request throws a Network Error', async () => {
      const auth = new AuthStateManager(mockSuperadmin);
      expect(auth.isAuthenticated).toBe(true);

      const networkError = new Error('TypeError: Failed to fetch (Network offline)');
      const mockFailingLogout = vi.fn().mockRejectedValue(networkError);

      // Must NOT throw unhandled rejection
      await expect(auth.logout(mockFailingLogout)).resolves.not.toThrow();

      expect(mockFailingLogout).toHaveBeenCalledTimes(1);
      expect(auth.user).toBeNull();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.canAccessProtectedRoute()).toBe(false);
    });

    it('clears user state even when API logout returns HTTP 500 or 502 Bad Gateway', async () => {
      const auth = new AuthStateManager(mockSuperadmin);

      const serverError = new Error('Internal Server Error (500)');
      const mock500Logout = vi.fn().mockRejectedValue(serverError);

      await auth.logout(mock500Logout);

      expect(auth.user).toBeNull();
      expect(auth.isAuthenticated).toBe(false);
    });

    it('prevents bounce-back to dashboard even after API failure during logout', async () => {
      const auth = new AuthStateManager(mockSuperadmin);

      const mockFailingLogout = vi.fn().mockRejectedValue(new Error('Connection reset by peer'));
      await auth.logout(mockFailingLogout);

      // Verify that LoginPage will NOT bounce back to dashboard
      const redirectTarget = auth.shouldRedirectFromLoginPage('/overview');
      expect(redirectTarget).toBeNull();
    });
  });
});
