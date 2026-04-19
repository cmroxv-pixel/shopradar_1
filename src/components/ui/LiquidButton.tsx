"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// One shared filter per page — renders only once in DOM
function LiquidGlassFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
      <defs>
        <filter id="lg-lens" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          {/* Lens distortion: turbulence -> displace the source */}
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.022" numOctaves="2" seed="3" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="1.5" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="8" xChannelSelector="R" yChannelSelector="G" result="lensed" />
          {/* Backdrop blur layer */}
          <feGaussianBlur in="lensed" stdDeviation="0" result="blurred" />
          <feComposite in="blurred" in2="SourceGraphic" operator="over" />
        </filter>
      </defs>
    </svg>
  )
}

const SIZE: Record<string, { h: string; px: string; text: string; gap: string; br: string }> = {
  xs:      { h: 'h-7',  px: 'px-3',  text: 'text-xs',  gap: 'gap-1',   br: 'rounded-full' },
  sm:      { h: 'h-8',  px: 'px-4',  text: 'text-xs',  gap: 'gap-1.5', br: 'rounded-full' },
  default: { h: 'h-9',  px: 'px-5',  text: 'text-sm',  gap: 'gap-2',   br: 'rounded-full' },
  lg:      { h: 'h-10', px: 'px-6',  text: 'text-sm',  gap: 'gap-2',   br: 'rounded-full' },
  xl:      { h: 'h-12', px: 'px-8',  text: 'text-sm',  gap: 'gap-2',   br: 'rounded-full' },
  xxl:     { h: 'h-14', px: 'px-10', text: 'text-base', gap: 'gap-2',  br: 'rounded-full' },
  icon:    { h: 'h-9',  px: 'w-9',   text: 'text-sm',  gap: 'gap-0',   br: 'rounded-full' },
}

export interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: keyof typeof SIZE
}

export const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ className, size = 'default', children, style, ...props }, ref) => {
    const s = SIZE[size] ?? SIZE.default
    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center whitespace-nowrap select-none',
          'cursor-pointer font-medium',
          'disabled:pointer-events-none disabled:opacity-40',
          'transition-all duration-200',
          'hover:scale-[1.05] hover:brightness-110',
          'active:scale-95 active:brightness-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
          s.h, s.px, s.text, s.gap, s.br,
          className
        )}
        style={{
          // True liquid glass: layered translucency + strong blur
          isolation: 'isolate',
          backdropFilter: 'blur(24px) saturate(180%) brightness(1.08)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%) brightness(1.08)',
          // Multi-layer background: outer tint + inner highlight gradient
          background: [
            // inner top gloss
            'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.00) 55%)',
            // glass body
            'linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.10) 100%)',
          ].join(', '),
          // Specular rim highlight (top) + depth shadow (bottom)
          border: '1px solid rgba(255,255,255,0.0)',
          boxShadow: [
            // Specular highlight — bright top rim
            'inset 0 1.5px 0 rgba(255,255,255,0.50)',
            // Faint side rims
            'inset 1px 0 0 rgba(255,255,255,0.18)',
            'inset -1px 0 0 rgba(255,255,255,0.10)',
            // Bottom depth
            'inset 0 -1.5px 0 rgba(0,0,0,0.18)',
            // Outer glow / depth
            '0 4px 24px rgba(0,0,0,0.22)',
            '0 1px 3px rgba(0,0,0,0.14)',
            // Very faint outer rim to define shape
            '0 0 0 0.5px rgba(255,255,255,0.14)',
          ].join(', '),
          ...style,
        }}
        {...props}
      >
        {/* Lens distortion layer */}
        <span
          aria-hidden
          style={{
            position: 'absolute', inset: 0, borderRadius: 'inherit',
            backdropFilter: 'url(#lg-lens)',
            WebkitBackdropFilter: 'url(#lg-lens)',
            pointerEvents: 'none',
            opacity: 0.6,
          }}
        />
        {/* Gloss sheen — top curved highlight like real glass */}
        <span
          aria-hidden
          style={{
            position: 'absolute', inset: 0, borderRadius: 'inherit',
            background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,255,255,0.28) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        {/* Content */}
        <span className="relative z-10 flex items-center gap-[inherit] pointer-events-none">
          {children}
        </span>
      </button>
    )
  }
)
LiquidButton.displayName = 'LiquidButton'

// Mount this ONCE near the top of the app tree
export function LiquidGlassProvider() {
  return <LiquidGlassFilter />
}
