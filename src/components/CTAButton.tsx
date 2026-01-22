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
  const baseStyles = 'rounded-lg px-8 py-3 text-base font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2'

  const variantStyles = {
    primary: 'bg-[#2F241A] text-white hover:bg-[#1F1812] active:bg-[#1F1812]',
    secondary: 'border-2 border-[#2F241A] bg-transparent text-[#2F241A] hover:bg-[rgba(47,36,26,0.05)] active:bg-[rgba(47,36,26,0.1)]',
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
