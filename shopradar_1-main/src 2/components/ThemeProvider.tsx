'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import LoadingScreen from '@/components/LoadingScreen';
import OnboardingFlow from '@/components/OnboardingFlow';

type Theme = 'light' | 'dark' | 'ocean' | 'rose' | 'violet' | 'emerald' | 'amber' | 'slate' | 'crimson' | 'indigo';

interface ThemeContextValue {
  theme: Theme;
  darkMode: boolean;
  setTheme: (t: Theme) => Promise<void>;
  setDarkMode: (d: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'ocean',
  darkMode: false,
  setTheme: () => Promise.resolve(),
  setDarkMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('ocean');
  const [darkMode, setDarkModeState] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const applyTheme = (t: Theme, dark: boolean) => {
    const root = document.documentElement;
    if (t === 'dark') {
      root.removeAttribute('data-theme');
      root.setAttribute('data-dark', 'true');
    } else {
      root.removeAttribute('data-theme');
      if (t !== 'light') root.setAttribute('data-theme', t);
      if (dark) {
        root.setAttribute('data-dark', 'true');
      } else {
        root.removeAttribute('data-dark');
      }
    }
  };

  useEffect(() => {
    const supabase = createClient();

    const initTheme = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('theme_preference')
          .eq('id', user.id)
          .single();

        if (data?.theme_preference) {
          const raw = data.theme_preference as string;
          const isDark = raw.endsWith(':dark');
          const savedTheme = raw.replace(':dark', '') as Theme;
          setThemeState(savedTheme);
          setDarkModeState(isDark);
          applyTheme(savedTheme, isDark);
          localStorage.setItem('shopradar-theme', savedTheme);
          localStorage.setItem('shopradar-dark', String(isDark));
          return;
        }
      }

      const saved = localStorage.getItem('shopradar-theme') as Theme | null;
      const savedDark = localStorage.getItem('shopradar-dark') === 'true';
      const fallback = saved || 'ocean';
      setThemeState(fallback);
      setDarkModeState(savedDark);
      applyTheme(fallback, savedDark);
    };

    initTheme();

    // Check if first-time visitor
    const hasSeenOnboarding = localStorage.getItem('shopradar-onboarding-done');
    if (!hasSeenOnboarding) {
      // Small delay so loading screen finishes first
      setTimeout(() => setShowOnboarding(true), 1800);
    }
  }, []);

  useEffect(() => {
    applyTheme(theme, darkMode);
  }, [theme, darkMode]);

  const setTheme = async (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('shopradar-theme', t);
    applyTheme(t, darkMode);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const pref = darkMode ? `${t}:dark` : t;
      await supabase
        .from('user_profiles')
        .update({ theme_preference: pref })
        .eq('id', user.id);
    }
  };

  const setDarkMode = (d: boolean) => {
    setDarkModeState(d);
    localStorage.setItem('shopradar-dark', String(d));
    applyTheme(theme, d);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const pref = d ? `${theme}:dark` : theme;
        supabase.from('user_profiles').update({ theme_preference: pref }).eq('id', user.id);
      }
    });
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('shopradar-onboarding-done', 'true');
    setShowOnboarding(false);
  };

  return (
    <ThemeContext.Provider value={{ theme, darkMode, setTheme, setDarkMode }}>
      <LoadingScreen />
      {showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} />}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}