import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Badge,
} from '@whitraworks/ui';
import {
  Building,
  Globe,
  Coins,
  Clock,
  MapPin,
  Phone,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Shield,
} from 'lucide-react';
import { workspaceApi, WorkspaceProfile, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'USD - United States Dollar ($)' },
  { code: 'EUR', label: 'EUR - Euro (€)' },
  { code: 'GBP', label: 'GBP - British Pound (£)' },
  { code: 'INR', label: 'INR - Indian Rupee (₹)' },
  { code: 'CAD', label: 'CAD - Canadian Dollar ($)' },
  { code: 'AUD', label: 'AUD - Australian Dollar ($)' },
  { code: 'SGD', label: 'SGD - Singapore Dollar ($)' },
  { code: 'JPY', label: 'JPY - Japanese Yen (¥)' },
  { code: 'AED', label: 'AED - UAE Dirham (د.إ)' },
  { code: 'CHF', label: 'CHF - Swiss Franc (CHF)' },
];

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export function SettingsPage() {
  const { slug } = useTenant();
  const { activeWorkspace, updateActiveWorkspaceName } = useAuth();

  const [profile, setProfile] = useState<WorkspaceProfile | null>(null);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canEdit =
    activeWorkspace?.role === 'OWNER' || activeWorkspace?.role === 'ADMIN';

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await workspaceApi.getProfile(slug);
      setProfile(data);
      setName(data.name || '');
      setCurrency(data.currency || 'USD');
      setTimezone(data.timezone || 'UTC');

      const meta = data.metadata as Record<string, unknown> | undefined;
      setPhone(typeof meta?.phone === 'string' ? meta.phone : '');
      setAddress(typeof meta?.address === 'string' ? meta.address : '');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to load workspace profile.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!name.trim()) {
      setErrorMessage('Business display name cannot be blank.');
      return;
    }

    try {
      setIsSaving(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      const updated = await workspaceApi.updateProfile(
        {
          name: name.trim(),
          currency,
          timezone,
          metadata: {
            phone: phone.trim(),
            address: address.trim(),
          },
        },
        slug
      );

      setProfile(updated);
      updateActiveWorkspaceName(updated.name);
      setSuccessMessage('Workspace profile updated successfully.');

      // Clear success notification after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to update workspace settings.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Workspace Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your organization name, operating currency, timezone, and contact address.
        </p>
      </div>

      {/* Role Permission Alert if Staff */}
      {!canEdit && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <Shield className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold">Read-Only Access</p>
            <p className="mt-0.5">
              You are signed in with the <span className="font-semibold">{activeWorkspace?.role || 'STAFF'}</span> role. Only workspace Owners and Admins have permission to modify configuration settings.
            </p>
          </div>
        </div>
      )}

      {/* Notifications */}
      {successMessage && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Workspace Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Organization Profile</CardTitle>
                <CardDescription>
                  Display identity for your tenant workspace.
                </CardDescription>
              </div>
              <Badge variant="active">
                {profile?.status || 'ACTIVE'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Business Name
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!canEdit || isSaving}
                    className="pl-9"
                    placeholder="e.g. Acme Corporation"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Workspace Subdomain
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    type="text"
                    value={`${profile?.slug || slug || ''}.whitraworks.com`}
                    disabled
                    className="pl-9 bg-zinc-100 dark:bg-zinc-800/60 font-mono text-zinc-500 cursor-not-allowed"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                </div>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                  Subdomain is locked to enforce Golden Rule 5 (Host-only cookie isolation).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Localization & Financial Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Regional & Currency Standards</CardTitle>
            <CardDescription>
              Billing denomination and scheduling time zone for business transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Operating Currency
                </label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    disabled={!canEdit || isSaving}
                    className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-9 pr-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {SUPPORTED_CURRENCIES.map((cur) => (
                      <option key={cur.code} value={cur.code}>
                        {cur.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Timezone
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    disabled={!canEdit || isSaving}
                    className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-9 pr-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Physical Address (Metadata) */}
        <Card>
          <CardHeader>
            <CardTitle>Operational Location & Contact</CardTitle>
            <CardDescription>
              Optional contact address recorded in receipts and invoices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Support / Operating Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!canEdit || isSaving}
                    className="pl-9"
                    placeholder="+1 (555) 012-3456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Physical / Billing Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={!canEdit || isSaving}
                    className="pl-9"
                    placeholder="123 Commerce Blvd, Suite 400"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        {canEdit && (
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              className="gap-2 px-6"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
