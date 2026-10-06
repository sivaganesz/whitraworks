import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Input, ThemeToggle } from '@whitraworks/ui';
import { Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated, error: authError, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    setIsLoading(true);

    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-zinc-900 selection:text-zinc-50">
      {/* Top right theme toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 flex items-center justify-center font-bold text-lg mx-auto shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            WhitraWorks Ops Control Plane
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Root Superadmin Authentication • ops.whitraworks.com
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>
                Enter your platform superadmin credentials to access the control plane.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayError && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{displayError}</span>
                </div>
              )}

              <Input
                label="Superadmin Email"
                type="email"
                placeholder="superadmin@whitraworks.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Sign In to Control Plane
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Security Notice */}
        <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-600">
          Enforcing Two-Tier Privilege Orthogonality (Rule 6). Tenant credentials are not authorized on this host.
        </p>
      </div>
    </div>
  );
}
