'use client';
import React from 'react';
import { motion } from 'framer-motion';

type GradientDotsProps = React.ComponentProps<typeof motion.div> & {
  dotSize?: number;
  spacing?: number;
  duration?: number;
  colorCycleDuration?: number;
  backgroundColor?: string;
};

export function GradientDots({
  dotSize = 3,
  spacing = 20,
  duration = 30,
  colorCycleDuration = 6,
  backgroundColor = 'transparent',
  className,
  ...props
}: GradientDotsProps) {
  const hexSpacing = spacing * 1.732;
  return (
    <motion.div
      className={`absolute inset-0 ${className ?? ''}`}
      style={{
        backgroundColor,
        backgroundImage: `
          radial-gradient(circle, hsl(218 100% 62%) ${dotSize}px, transparent ${dotSize}px),
          radial-gradient(circle, hsl(218 100% 62%) ${dotSize}px, transparent ${dotSize}px)
        `,
        backgroundSize: `${spacing}px ${hexSpacing}px, ${spacing}px ${hexSpacing}px`,
        backgroundPosition: `0px 0px, ${spacing / 2}px ${hexSpacing / 2}px`,
        opacity: 0.6,
      }}
      animate={{
        filter: ['hue-rotate(0deg) brightness(1)', 'hue-rotate(360deg) brightness(1.4)', 'hue-rotate(0deg) brightness(1)'],
      }}
      transition={{
        filter: {
          duration: colorCycleDuration,
          ease: 'linear',
          repeat: Number.POSITIVE_INFINITY,
        },
      }}
      {...props}
    />
  );
}
