import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-lg px-3 py-2.5 text-white',
            'focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'appearance-none cursor-pointer',
            error && 'border-red-500',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
