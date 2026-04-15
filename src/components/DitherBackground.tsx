'use client';
import dynamic from 'next/dynamic';

const Dither = dynamic(() => import('./Dither'), { ssr: false });

export default function DitherBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, opacity: 0.18, pointerEvents: 'none' }}>
      <Dither
        waveColor={[0.1, 0.4, 1.0]}
        waveSpeed={0.04}
        waveFrequency={2.5}
        waveAmplitude={0.35}
        colorNum={4}
        pixelSize={3}
        enableMouseInteraction={true}
        mouseRadius={0.8}
      />
    </div>
  );
}
