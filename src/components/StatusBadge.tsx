import { ReactNode } from 'react'

interface StatusBadgeProps {
  /** Badge variant */
  variant: 'selected'
  /** Badge content */
  children: ReactNode
  /** Disabled state */
  disabled?: boolean
  /** Loading state */
  loading?: boolean
  /** Error state */
  error?: boolean
  /** Optional className for additional styling */
  className?: string
  /** Optional click handler for interactive badges */
  onClick?: () => void
}

export default function StatusBadge({
  variant,
  children,
  disabled = false,
  loading = false,
  error = false,
  className = '',
  onClick,
}: StatusBadgeProps) {
  const baseStyles = 'w-full rounded-lg px-4 py-2.5 font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2'

  const variantStyles = {
    selected: 'bg-purple-600 text-white shadow-sm hover:bg-purple-700 active:bg-purple-800 focus:ring-purple-500',
  }

  const disabledStyles = 'disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed'

  const errorStyles = error
    ? 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500'
    : ''

  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      {...(onClick && { disabled: disabled || loading })}
      className={`${baseStyles} ${errorStyles || variantStyles[variant]} ${disabledStyles} ${className}`}
    >
      {loading ? (
        <>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
          {children}
        </>
      ) : (
        children
      )}
    </Component>
  )
}
