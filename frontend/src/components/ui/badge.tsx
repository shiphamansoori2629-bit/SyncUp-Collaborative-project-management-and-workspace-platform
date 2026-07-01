import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-white/10 bg-primary/20 text-white shadow-sm',
        secondary: 'border-white/10 bg-white/10 text-white/80',
        success: 'border-emerald-500/20 bg-emerald-500/20 text-emerald-400',
        warning: 'border-amber-500/20 bg-amber-500/20 text-amber-400',
        danger: 'border-rose-500/20 bg-rose-500/20 text-rose-400',
        outline: 'border-white/20 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
