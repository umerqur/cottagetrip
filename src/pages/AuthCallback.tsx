import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import SurfaceCard from '../components/SurfaceCard';
import Button from '../components/Button';
import { getSession, getProfile } from '../lib/auth';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const nextPath = searchParams.get('next') || '/';

  useEffect(() => {
    async function handleCallback() {
      try {
        // Get session from URL hash
        const session = await getSession();

        if (!session) {
          setError('No session found. Please try signing in again.');
          setLoading(false);
          return;
        }

        // Check if profile exists
        const profile = await getProfile(session.user.id);

        if (!profile) {
          // No profile, redirect to onboarding
          navigate(`/onboarding?next=${encodeURIComponent(nextPath)}`, { replace: true });
        } else {
          // Profile exists, redirect to next path
          navigate(nextPath, { replace: true });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setLoading(false);
      }
    }

    handleCallback();
  }, [navigate, nextPath]);

  return (
    <PageShell>
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex min-h-[calc(100vh-73px)] items-center justify-center py-12">
          <div className="w-full max-w-md">
            <SurfaceCard>
              <div className="space-y-6 text-center">
                {loading ? (
                  /* Loading state */
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center">
                      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-cyan-500"></div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-white">Signing you in...</h2>
                      <p className="text-slate-300">Please wait a moment</p>
                    </div>
                  </>
                ) : (
                  /* Error state */
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                      <svg
                        className="h-8 w-8 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-white">Authentication failed</h2>
                      <p className="text-slate-300">{error}</p>
                    </div>
                    <Button onClick={() => navigate('/signin')} fullWidth>
                      Back to sign in
                    </Button>
                  </>
                )}
              </div>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
