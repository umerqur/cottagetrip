import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

/**
 * Card component with consistent styling from the landing page design system
 * Features: subtle border, soft shadow, rounded corners, white background
 */
export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-[rgba(47,36,26,0.1)] bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}
