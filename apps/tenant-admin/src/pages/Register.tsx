import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  ThemeToggle,
} from '@whitraworks/ui';
import { CheckCircle2, XCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { publicApi, ApiError } from '../lib/api';
import { useTenant } from '../context/TenantContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const { setDevSlug } = useTenant();

  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Slug availability state
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugStatus, setSlugStatus] = useState<{
    checked: boolean;
    available: boolean;
    message?: string;
  }>({ checked: false, available: false });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [collisionDetails, setCollisionDetails] = useState<{
    existingWorkspaceSlug?: string;
    signInUrl?: string;
  } | null>(null);

  // Auto-generate slug from business name
  useEffect(() => {
    if (!slugManuallyEdited && businessName) {
      const generated = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30);
      setSlug(generated);
    }
  }, [businessName, slugManuallyEdited]);

  // Debounced check-slug
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus({ checked: false, available: false });
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const res = await publicApi.checkSlug(slug);
        setSlugStatus({
          checked: true,
          available: res.available,
          message: res.reason,
        });
      } catch (err) {
        setSlugStatus({
          checked: true,
          available: false,
          message: err instanceof Error ? err.message : 'Invalid slug',
        });
      } finally {
        setIsCheckingSlug(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setCollisionDetails(null);

    if (!slugStatus.available) {
      setErrorMessage(slugStatus.message || 'Please choose an available workspace slug.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await publicApi.register({
        businessName: businessName.trim(),
        slug: slug.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      // Update dev slug if on localhost fallback
      setDevSlug(res.tenant.slug);

      // In production, navigate to the tenant's full domain:
      const host = window.location.hostname;
      if (host.endsWith('whitraworks.com')) {
        window.location.href = `https://${res.tenant.slug}.whitraworks.com/`;
      } else if (host.endsWith('localhost') && host !== 'localhost') {
        window.location.href = `http://${res.tenant.slug}.localhost:3000/`;
      } else {
        // Localhost without subdomain: navigate to dashboard directly
        navigate('/', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
        if (err.code === 'EMAIL_ALREADY_ASSOCIATED_WITH_WORKSPACE' && err.details) {
          setCollisionDetails({
            existingWorkspaceSlug: err.details['existingWorkspaceSlug'] as string,
            signInUrl: err.details['signInUrl'] as string,
          });
        }
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Registration failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4 selection:bg-zinc-900 selection:text-zinc-50">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-bold text-xl shadow-sm">
            W
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Create Your Business Workspace
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Atomic Multi-Tenant Registration • Launch in seconds
          </p>
        </div>

        {/* Registration Card */}
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Workspace Registration</CardTitle>
              <CardDescription>
                One owner, one business workspace. Additional workspaces are invite-only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Collision Alert Banner */}
              {collisionDetails ? (
                <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Existing Workspace Found</span>
                  </div>
                  <p>{errorMessage}</p>
                  <div className="pt-1">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300 underline hover:no-underline"
                    >
                      Sign in to your account
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : errorMessage ? (
                <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              ) : null}

              {/* Business Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Business / Organization Name
                </label>
                <Input
                  required
                  placeholder="e.g. Blue Lagoon Hotel"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Subdomain Slug with live validation */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex justify-between items-center">
                  <span>Workspace Address (Subdomain)</span>
                  {isCheckingSlug ? (
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                    </span>
                  ) : slugStatus.checked ? (
                    slugStatus.available ? (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Available
                      </span>
                    ) : (
                      <span className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                        <XCircle className="w-3.5 h-3.5" /> {slugStatus.message || 'Unavailable'}
                      </span>
                    )
                  ) : null}
                </label>
                <div className="flex items-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 focus-within:ring-2 focus-within:ring-zinc-950 dark:focus-within:ring-zinc-50">
                  <input
                    type="text"
                    required
                    placeholder="my-business"
                    value={slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    }}
                    className="w-full py-2 text-xs bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none font-mono"
                    disabled={isLoading}
                  />
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono select-none pl-1">
                    .whitraworks.com
                  </span>
                </div>
              </div>

              {/* Owner Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    First Name
                  </label>
                  <Input
                    required
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Last Name
                  </label>
                  <Input
                    required
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Work Email Address
                </label>
                <Input
                  type="email"
                  required
                  placeholder="jane@bluelagoon.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Password
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                  Must be at least 8 characters with uppercase, lowercase, and numbers.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                disabled={!slugStatus.available && slug.length >= 3}
              >
                Create Workspace & Launch
              </Button>

              <div className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                Already have a workspace?{' '}
                <Link
                  to="/login"
                  className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
