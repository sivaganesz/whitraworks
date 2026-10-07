import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Badge,
  ThemeToggle,
} from '@whitraworks/ui';
import { Building2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { publicApi, type InvitationDetailsResponse } from '../lib/api';
import { useTenant } from '../context/TenantContext';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { setDevSlug } = useTenant();

  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [details, setDetails] = useState<InvitationDetailsResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setFetchError('No invitation token was provided in the URL.');
      setIsLoadingDetails(false);
      return;
    }

    async function loadDetails() {
      try {
        setIsLoadingDetails(true);
        setFetchError(null);
        const res = await publicApi.getInvitationDetails(token!);
        setDetails(res);
        if (res.tenant?.slug) {
          setDevSlug(res.tenant.slug);
        }
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Invalid or expired invitation token.');
      } finally {
        setIsLoadingDetails(false);
      }
    }

    loadDetails();
  }, [token, setDevSlug]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await publicApi.acceptInvitation({
        token: token!,
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });

      if (res.activeWorkspace?.slug) {
        setDevSlug(res.activeWorkspace.slug);
      }

      // Redirect to tenant workspace home
      navigate('/', { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to accept invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingDetails) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-zinc-900 dark:text-zinc-100 animate-spin" />
        <span className="text-xs text-zinc-500 font-mono">Verifying invitation token...</span>
      </div>
    );
  }

  if (fetchError || !details) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-6 h-6" />
              </div>
              <CardTitle>Invitation Expired or Invalid</CardTitle>
              <CardDescription>
                {fetchError || 'This invitation link could not be verified or has already been accepted.'}
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Link to="/login">
                <Button variant="outline">Back to Sign In</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4 selection:bg-zinc-900 selection:text-zinc-50">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Workspace Brand Invitation Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-bold text-xl shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Join {details.tenant.name}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            You've been invited to join this workspace as{' '}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {details.role.name}
            </span>
          </p>
        </div>

        {/* Accept Form Card */}
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Complete Your Account</CardTitle>
                <Badge variant="neutral" className="font-mono text-[10px]">
                  {details.role.code}
                </Badge>
              </div>
              <CardDescription>
                Confirm your details and set a password for {details.email}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {submitError && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Verified Email */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Invited Email
                </label>
                <Input value={details.email} disabled className="bg-zinc-100 dark:bg-zinc-800/50" />
              </div>

              {/* Names */}
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Create Password
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full gap-2" isLoading={isSubmitting}>
                Accept & Enter Workspace
                <ArrowRight className="w-4 h-4" />
              </Button>

              <div className="text-center text-xs text-zinc-500">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline">
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
