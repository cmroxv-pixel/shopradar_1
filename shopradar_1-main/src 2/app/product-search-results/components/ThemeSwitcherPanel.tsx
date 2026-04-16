'use client';
import React from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { X, Check, Moon, Sun } from 'lucide-react';

type ThemeValue = 'light' | 'ocean' | 'rose' | 'violet' | 'emerald' | 'amber' | 'slate' | 'crimson' | 'indigo';

const themes: { value: ThemeValue; label: string; preview: string; bg: string; accent: string }[] = [
  { value: 'light',   label: 'Teal Light',  preview: 'Clean & minimal',    bg: '#f8fafc', accent: '#0d9488' },
  { value: 'ocean',   label: 'Ocean Blue',  preview: 'Deep blue tones',    bg: '#f0f9ff', accent: '#3b82f6' },
  { value: 'rose',    label: 'Rose',        preview: 'Warm pink palette',  bg: '#fff5f5', accent: '#e11d48' },
  { value: 'violet',  label: 'Violet',      preview: 'Rich purple tones',  bg: '#faf5ff', accent: '#8b5cf6' },
  { value: 'emerald', label: 'Emerald',     preview: 'Fresh green vibes',  bg: '#f0fdf4', accent: '#059669' },
  { value: 'amber',   label: 'Amber',       preview: 'Warm golden tones',  bg: '#fffbeb', accent: '#d97706' },
  { value: 'slate',   label: 'Slate',       preview: 'Cool neutral grey',  bg: '#f8fafc', accent: '#475569' },
  { value: 'crimson', label: 'Crimson',     preview: 'Bold red energy',    bg: '#fff8f8', accent: '#dc2626' },
  { value: 'indigo',  label: 'Indigo',      preview: 'Deep indigo tones',  bg: '#eef2ff', accent: '#4f46e5' },
];

interface ThemeSwitcherPanelProps {
  onClose: () => void;
}

export default function ThemeSwitcherPanel({ onClose }: ThemeSwitcherPanelProps) {
  const { theme, darkMode, setTheme, setDarkMode } = useTheme();

  const currentTheme = (theme === 'dark' ? 'light' : theme) as ThemeValue;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="text-base font-semibold text-foreground">Choose Theme</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
            >
              <X size={16} />
            </button>
          </div>

          {/* Dark mode toggle */}
          <div className="mx-5 mb-4 flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-muted/40">
            <div className="flex items-center gap-2.5">
              {darkMode ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-primary" />}
              <div>
                <div className="text-sm font-medium text-foreground">Dark Mode</div>
                <div className="text-xs text-muted-foreground">Works with any colour</div>
              </div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${darkMode ? 'bg-primary' : 'bg-muted'}`}
              role="switch"
              aria-checked={darkMode}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${darkMode ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          {/* Colour grid */}
          <div className="px-5 pb-5 grid grid-cols-1 gap-2 max-h-[55vh] overflow-y-auto">
            {themes.map(t => {
              const isActive = currentTheme === t.value;
              return (
                <button
                  key={`theme-${t.value}`}
                  onClick={() => setTheme(t.value)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 text-left ${
                    isActive
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30' :'border-border hover:bg-muted'
                  }`}
                >
                  {/* Colour swatches */}
                  <div className="flex gap-1 shrink-0">
                    <div
                      className="w-6 h-6 rounded-full border border-border/50 shadow-sm"
                      style={{ backgroundColor: darkMode ? '#1e293b' : t.bg }}
                    />
                    <div
                      className="w-6 h-6 rounded-full border border-border/50 shadow-sm"
                      style={{ backgroundColor: t.accent }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.preview}</div>
                  </div>
                  {isActive && <Check size={15} className="text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}