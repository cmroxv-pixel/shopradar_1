"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const sizeClasses: Record<string, string> = {
  xs:      "h-7 px-3 text-xs gap-1",
  sm:      "h-8 px-4 text-xs gap-1.5",
  default: "h-9 px-5 gap-2",
  lg:      "h-10 px-6 gap-2 text-sm",
  xl:      "h-12 px-8 gap-2 text-sm",
  xxl:     "h-14 px-10 gap-2",
  icon:    "h-9 w-9",
}

export interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: keyof typeof sizeClasses
}

export const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ className, size = "default", children, style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // layout
          "relative inline-flex items-center justify-center whitespace-nowrap rounded-full",
          "cursor-pointer select-none",
          "disabled:pointer-events-none disabled:opacity-40",
          "outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60",
          // animation
          "transition-all duration-200 active:scale-95 hover:scale-[1.04]",
          sizeClasses[size] ?? sizeClasses.default,
          className
        )}
        style={{
          // Glass bubble — looks great on dark AND light
          background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.12) 100%)",
          backdropFilter: "blur(16px) saturate(1.8)",
          WebkitBackdropFilter: "blur(16px) saturate(1.8)",
          border: "1px solid rgba(255,255,255,0.22)",
          // rim highlight on top edge
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,0.35)",   // top highlight
            "inset 0 -1px 0 rgba(0,0,0,0.15)",         // bottom shadow
            "inset 1px 0 0 rgba(255,255,255,0.12)",    // left rim
            "inset -1px 0 0 rgba(255,255,255,0.08)",   // right rim
            "0 2px 8px rgba(0,0,0,0.18)",              // drop shadow
            "0 0 0 0.5px rgba(255,255,255,0.08)",      // outer glow
          ].join(", "),
          ...style,
        }}
        {...props}
      >
        {/* Top gloss shine streak */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 55%)",
            pointerEvents: "none",
          }}
        />
        {/* Content */}
        <span className="relative z-10 flex items-center gap-[inherit] pointer-events-none font-medium">
          {children}
        </span>
      </button>
    )
  }
)
LiquidButton.displayName = "LiquidButton"
