import { ReactNode } from 'react'

interface CTAButtonProps {
  /** Button variant: primary (filled) or secondary (outlined) */
  variant: 'primary' | 'secondary'
  /** Button click handler */
  onClick?: () => void
  /** Button content */
  children: ReactNode
  /** Disabled state */
  disabled?: boolean
  /** Loading state */
  loading?: boolean
  /** Optional className for additional styling */
  className?: string
  /** Button type (default: button) */
  type?: 'button' | 'submit' | 'reset'
}

export default function CTAButton({
  variant,
  onClick,
  children,
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
}: CTAButtonProps) {
  const baseStyles = 'rounded-lg px-6 py-3 font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2'

  const variantStyles = {
    primary: 'bg-amber-600 text-white shadow-lg shadow-amber-500/30 hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-500/40 active:bg-amber-800 focus:ring-offset-amber-50',
    secondary: 'border-2 border-amber-600 bg-white/50 text-amber-900 backdrop-blur-sm hover:border-amber-700 hover:bg-white/70 active:bg-white/90 focus:ring-offset-amber-50',
  }

  const disabledStyles = variant === 'primary'
    ? 'disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed'
    : 'disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${className}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}
