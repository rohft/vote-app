import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeName = 'light' | 'dark' | 'aurora';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    return (localStorage.getItem('app-theme') as ThemeName) || 'light';
  });
  const [reduceMotion, setReduceMotionState] = useState(() => {
    return localStorage.getItem('reduce-motion') === 'true';
  });

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem('app-theme', t);
  }, []);

  const setReduceMotion = useCallback((v: boolean) => {
    setReduceMotionState(v);
    localStorage.setItem('reduce-motion', String(v));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'aurora');
    root.classList.add(theme);
    if (reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [theme, reduceMotion]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, reduceMotion, setReduceMotion }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be within ThemeProvider');
  return ctx;
};
