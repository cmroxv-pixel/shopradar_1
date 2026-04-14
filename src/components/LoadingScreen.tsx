'use client';

import React, { useEffect, useState } from 'react';
import AppImage from './ui/AppImage';
import { useTheme } from '@/components/ThemeProvider';

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const { darkMode } = useTheme();

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 1200);
    const hideTimer = setTimeout(() => setVisible(false), 1600);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  const imageFilter = darkMode ? 'brightness-0 invert' : 'brightness-0 opacity-75';

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-400 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff' }}
    >
      <div className="relative flex items-center justify-center">
        {/* Spinning ring */}
        <svg
          className="animate-spin"
          width="96"
          height="96"
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke={darkMode ? '#334155' : '#e2e8f0'}
            strokeWidth="6"
          />
          <path
            d="M48 8 A40 40 0 0 1 88 48"
            stroke={darkMode ? '#6366f1' : '#4f46e5'}
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>

        {/* Logo centered inside the ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AppImage
            src="/assets/images/Untitled-1775641794744.png"
            alt="ShopRadar logo"
            width={44}
            height={44}
            className={`flex-shrink-0 ${imageFilter}`}
            priority={true}
          />
        </div>
      </div>
    </div>
  );
}
