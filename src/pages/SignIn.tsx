import { useState, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import SurfaceCard from '../components/SurfaceCard';
import Input from '../components/Input';
import Button from '../components/Button';
import { signInWithEmail } from '../lib/auth';

export default function SignIn() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const nextPath = searchParams.get('next') || '/';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/auth?next=${encodeURIComponent(nextPath)}`;
      await signInWithEmail(email, redirectTo);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex min-h-[calc(100vh-73px)] items-center justify-center py-12">
          <div className="w-full max-w-md">
            <SurfaceCard>
              <div className="space-y-6">
                {/* Header */}
                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-bold text-white">Welcome back</h1>
                  <p className="text-slate-300">Sign in to continue to Cottage Trip</p>
                </div>

                {success ? (
                  /* Success state */
                  <div className="space-y-4 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                      <svg
                        className="h-8 w-8 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-white">Check your email</h2>
                      <p className="text-slate-300">
                        We sent a sign in link to <span className="font-medium text-white">{email}</span>
                      </p>
                      <p className="text-sm text-slate-400">
                        Click the link in the email to sign in to your account.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Form */
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                      type="email"
                      label="Email address"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                      error={error}
                      disabled={loading}
                    />

                    <Button
                      type="submit"
                      loading={loading}
                      disabled={!email || loading}
                      fullWidth
                    >
                      Send magic link
                    </Button>

                    <p className="text-center text-sm text-slate-400">
                      We'll email you a magic link for a password-free sign in.
                    </p>
                  </form>
                )}
              </div>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
