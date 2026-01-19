import { ReactNode } from 'react';

interface SurfaceCardProps {
  children: ReactNode;
  className?: string;
}

export default function SurfaceCard({ children, className = '' }: SurfaceCardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}
