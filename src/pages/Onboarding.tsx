import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import SurfaceCard from '../components/SurfaceCard';
import Input from '../components/Input';
import Button from '../components/Button';
import { requireSession, upsertProfile } from '../lib/auth';

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  const nextPath = searchParams.get('next') || '/';

  useEffect(() => {
    async function checkAuth() {
      try {
        await requireSession();
        setCheckingAuth(false);
      } catch {
        navigate('/signin', { replace: true });
      }
    }
    checkAuth();
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const session = await requireSession();
      await upsertProfile(session.user.id, displayName);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <PageShell>
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex min-h-[calc(100vh-73px)] items-center justify-center py-12">
            <div className="w-full max-w-md">
              <SurfaceCard>
                <div className="space-y-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-cyan-500"></div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white">Loading...</h2>
                  </div>
                </div>
              </SurfaceCard>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex min-h-[calc(100vh-73px)] items-center justify-center py-12">
          <div className="w-full max-w-md">
            <SurfaceCard>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header */}
                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-bold text-white">Welcome!</h1>
                  <p className="text-slate-300">Let's set up your profile</p>
                </div>

                {/* Form */}
                <Input
                  type="text"
                  label="Display name"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoFocus
                  minLength={2}
                  maxLength={50}
                  error={error}
                  helperText="This is how others will see you in rooms"
                  disabled={loading}
                />

                <Button
                  type="submit"
                  loading={loading}
                  disabled={!displayName || displayName.length < 2 || loading}
                  fullWidth
                >
                  Continue
                </Button>
              </form>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
