import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface PageShellProps {
  children: ReactNode;
  showAuth?: boolean;
  onSignOut?: () => void;
}

export default function PageShell({ children, showAuth = false, onSignOut }: PageShellProps) {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Subtle radial glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent"></div>

      {/* Top bar */}
      <nav className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto max-w-[1200px] px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="text-xl font-semibold tracking-tight text-white transition hover:text-slate-200"
            >
              Cottage Trip
            </button>
            {showAuth && onSignOut && (
              <button
                onClick={onSignOut}
                className="text-sm text-slate-300 transition hover:text-white"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
}
