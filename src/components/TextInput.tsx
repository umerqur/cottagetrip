import { forwardRef } from 'react'

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

/**
 * TextInput component with consistent styling from the landing page design system
 * Features: brown focus ring, subtle borders, clean appearance
 */
const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={props.id}
            className="mb-2 block text-sm font-medium text-[#2F241A]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          {...props}
          className={`w-full rounded-lg border px-4 py-3 text-base text-[#2F241A] placeholder-[#6B5C4D] transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-[rgba(47,36,26,0.2)] focus:border-[#2F241A] focus:ring-[#2F241A]'
          } ${className}`}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-[#6B5C4D]">{helperText}</p>
        )}
      </div>
    )
  }
)

TextInput.displayName = 'TextInput'

export default TextInput
