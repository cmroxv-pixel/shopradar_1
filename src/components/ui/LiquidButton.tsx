"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const SIZE: Record<string, string> = {
  xs:      'h-7 px-3 text-xs gap-1',
  sm:      'h-8 px-4 text-xs gap-1.5',
  default: 'h-9 px-5 text-sm gap-2',
  lg:      'h-10 px-6 text-sm gap-2',
  xl:      'h-12 px-8 text-sm gap-2',
  xxl:     'h-14 px-10 text-base gap-2',
  icon:    'h-9 w-9 text-sm',
}

export interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: keyof typeof SIZE
}

export const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ className, size = 'default', children, style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center whitespace-nowrap select-none rounded-full',
          'cursor-pointer font-medium',
          'disabled:pointer-events-none disabled:opacity-40',
          'transition-all duration-200',
          'hover:scale-[1.04] active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
          SIZE[size] ?? SIZE.default,
          className
        )}
        style={{
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.09) 100%)',
          boxShadow: [
            'inset 0 1.5px 0 rgba(255,255,255,0.45)',
            'inset 1px 0 0 rgba(255,255,255,0.12)',
            'inset -1px 0 0 rgba(255,255,255,0.06)',
            'inset 0 -1px 0 rgba(0,0,0,0.15)',
            '0 4px 16px rgba(0,0,0,0.18)',
            '0 0 0 0.5px rgba(255,255,255,0.12)',
          ].join(', '),
          ...style,
        }}
        {...props}
      >
        {/* Top gloss arc */}
        <span aria-hidden style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit',
          background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,255,255,0.24) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <span className="relative z-10 flex items-center gap-[inherit] pointer-events-none">
          {children}
        </span>
      </button>
    )
  }
)
LiquidButton.displayName = 'LiquidButton'

// Kept for backwards compat — no longer needs to be mounted
export function LiquidGlassProvider() { return null }
