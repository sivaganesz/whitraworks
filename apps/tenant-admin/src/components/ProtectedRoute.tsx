import { Navigate, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@whitraworks/ui';
import { Loader2, ShieldAlert, LogOut, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasWorkspaceAccess, user, availableWorkspaces, switchWorkspace, logout } = useAuth();
  const { slug } = useTenant();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasWorkspaceAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl">Access Restricted</CardTitle>
            <CardDescription>
              You ({user?.email}) do not have active access to workspace{' '}
              <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                "{slug}"
              </span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
              Under Scenario A architecture (Golden Rule 10), access to secondary workspaces is strictly invite-only.
            </p>

            {availableWorkspaces.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Your Available Workspaces:
                </span>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  {availableWorkspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => switchWorkspace(ws.slug)}
                      className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-sm"
                    >
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{ws.name}</p>
                        <p className="text-xs font-mono text-zinc-400">{ws.slug}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <span>{ws.role}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-between gap-3">
              <Button variant="outline" size="sm" onClick={() => logout()} className="w-full gap-1.5">
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
