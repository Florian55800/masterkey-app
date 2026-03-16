import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'gold' | 'default' | 'info'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/20 text-red-400 border-red-500/30',
  gold: 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30',
  default: 'bg-[#2e2e2e] text-gray-300 border-[#3e3e3e]',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
