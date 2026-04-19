"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function GlassFilter() {
  return (
    <svg className="hidden" aria-hidden>
      <defs>
        <filter id="liquid-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="70" xChannelSelector="R" yChannelSelector="B" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

const sizeClasses: Record<string, string> = {
  xs:      "h-7 px-3 text-xs gap-1",
  sm:      "h-8 px-4 text-xs gap-1.5",
  default: "h-9 px-5 gap-2",
  lg:      "h-10 px-6 gap-2",
  xl:      "h-12 px-8 gap-2",
  xxl:     "h-14 px-10 gap-2",
  icon:    "size-9",
};

export interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: keyof typeof sizeClasses;
}

export const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ className, size = "default", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center cursor-pointer whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200",
          "hover:scale-105 active:scale-95",
          "disabled:pointer-events-none disabled:opacity-50",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          sizeClasses[size] ?? sizeClasses.default,
          className
        )}
        {...props}
      >
        {/* Liquid glass bubble shell */}
        <div className="absolute inset-0 rounded-full transition-all
          shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)]
          dark:shadow-[0_0_8px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.09),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.85),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_6px_6px_rgba(255,255,255,0.12),inset_0_0_2px_2px_rgba(255,255,255,0.06),0_0_12px_rgba(0,0,0,0.15)]"
        />
        {/* Frosted backdrop distortion */}
        <div
          className="absolute inset-0 -z-10 overflow-hidden rounded-full"
          style={{ backdropFilter: 'url("#liquid-glass")' }}
        />
        {/* Content */}
        <span className="relative z-10 flex items-center gap-[inherit] pointer-events-none">
          {children}
        </span>
        <GlassFilter />
      </button>
    )
  }
)
LiquidButton.displayName = "LiquidButton"
