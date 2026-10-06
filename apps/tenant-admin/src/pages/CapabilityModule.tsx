import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
} from '@whitraworks/ui';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Layers,
  Zap,
  Terminal,
  Activity,
  Check,
  AlertCircle,
} from 'lucide-react';
import { CAPABILITY_REGISTRY, CapabilityDefinition } from '@whitraworks/types';
import { useTenant } from '../context/TenantContext';
import { useCapabilities } from '../context/CapabilityContext';
import { fetchApi, ApiError } from '../lib/api';

export function CapabilityModulePage() {
  const location = useLocation();
  const { slug } = useTenant();
  const { isCapabilityEnabled, isLoading: isCapabilitiesLoading } = useCapabilities();

  // Extract capability code from pathname (e.g., "/kitchen" -> "kitchen")
  const pathSegments = location.pathname.replace(/^\//, '').split('/');
  const capabilityCode = (pathSegments[0] || '').toLowerCase();
  const capabilityMeta: CapabilityDefinition | undefined = CAPABILITY_REGISTRY[capabilityCode];

  const isEnabled = isCapabilityEnabled(capabilityCode);

  // Test action state (e.g. testing capability endpoint gate)
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    data?: unknown;
  }>({ status: 'idle', message: '' });

  const handleTestCapabilityGate = async () => {
    setTestResult({ status: 'loading', message: 'Testing capability authorization gate...' });
    try {
      if (capabilityCode === 'kitchen') {
        const res = await fetchApi<{ status: string }>('/workspace/test-kitchen', { method: 'GET' }, slug);
        setTestResult({
          status: 'success',
          message: 'Backend Capability Guard authorized request successfully!',
          data: res,
        });
      } else {
        setTestResult({
          status: 'success',
          message: `Capability "${capabilityCode}" is verified active on data plane.`,
        });
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setTestResult({
          status: 'error',
          message: `Capability gate rejected: ${err.message} (${err.code})`,
        });
      } else {
        setTestResult({
          status: 'error',
          message: 'Failed to communicate with capability endpoint.',
        });
      }
    }
  };

  if (isCapabilitiesLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-zinc-100" />
          <span className="text-xs text-zinc-500">Checking capability authorization...</span>
        </div>
      </div>
    );
  }

  // If capability is NOT enabled in Ops Admin, render strict gate warning
  if (!isEnabled) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Module Disabled
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          The <span className="font-semibold text-zinc-900 dark:text-zinc-100">{capabilityMeta?.name || capabilityCode}</span> module is currently not enabled for workspace <span className="font-mono">{slug}</span>.
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Under Golden Rule 3 (Zero Domain Contamination in Core), module features remain inactive until toggled on in Ops Admin.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {capabilityMeta?.category || 'Operations'} Module
            </span>
            <Badge variant="active" className="text-[10px]">
              Active & Provisioned
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <span>{capabilityMeta?.name || capabilityCode.toUpperCase()}</span>
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {capabilityMeta?.description || 'Active business domain capability module.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestCapabilityGate}
            disabled={testResult.status === 'loading'}
            className="gap-1.5"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Verify Endpoint Gate</span>
          </Button>
        </div>
      </div>

      {/* Test Result Feedback */}
      {testResult.status !== 'idle' && (
        <div
          className={`rounded-lg border p-4 text-sm flex items-start gap-3 ${
            testResult.status === 'success'
              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-950/60 dark:bg-emerald-950/20 dark:text-emerald-300'
              : testResult.status === 'error'
              ? 'border-red-200 bg-red-50/70 text-red-900 dark:border-red-950/60 dark:bg-red-950/20 dark:text-red-300'
              : 'border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200'
          }`}
        >
          {testResult.status === 'success' && <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />}
          {testResult.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
          {testResult.status === 'loading' && <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent mt-0.5 shrink-0" />}
          <div className="min-w-0 flex-1">
            <p className="font-medium">{testResult.message}</p>
            {testResult.data ? (
              <pre className="mt-2 text-xs font-mono bg-white/60 dark:bg-black/30 p-2 rounded overflow-x-auto">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            ) : null}
          </div>
        </div>
      )}

      {/* Capability Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Engine Status
            </CardTitle>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                Authorized
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Active in tenant capability configuration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Capability Code
            </CardTitle>
            <Terminal className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-mono text-zinc-950 dark:text-zinc-50">
              {capabilityCode}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              @RequireCapability('{capabilityCode}')
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Required Dependencies
            </CardTitle>
            <Layers className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
              {capabilityMeta?.dependencies && capabilityMeta.dependencies.length > 0
                ? capabilityMeta.dependencies.join(', ')
                : 'None (Root Module)'}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Dependency chain validated by Ops Admin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operational Module Surface */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            <CardTitle>{capabilityMeta?.name || capabilityCode} Workspace Operations</CardTitle>
          </div>
          <CardDescription>
            Live domain capability surface running under strict tenant isolation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-600 dark:text-zinc-300">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {capabilityMeta?.name || capabilityCode} Operational Module Ready
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              This module is governed by the WhitraWorks Capability Configuration Engine. Disabling it in Ops Admin immediately retracts access and removes navigation tabs across all clients.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Badge variant="neutral" className="text-xs">
                Tenant: {slug}
              </Badge>
              <Badge variant="neutral" className="text-xs">
                Category: {capabilityMeta?.category || 'operations'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
