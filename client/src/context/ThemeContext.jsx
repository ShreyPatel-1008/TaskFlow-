import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(preference) {
  if (preference === 'system') return getSystemTheme();
  return preference;
}

export const ThemeProvider = ({ children }) => {
  const [preference, setPreference] = useState(() => {
    return localStorage.getItem('taskflow_theme') || 'dark';
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(
    localStorage.getItem('taskflow_theme') || 'dark'
  ));

  // Apply theme to DOM
  useEffect(() => {
    const resolved = resolveTheme(preference);
    setResolvedTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
    localStorage.setItem('taskflow_theme', preference);
  }, [preference]);

  // Listen for system preference changes when set to 'system'
  useEffect(() => {
    if (preference !== 'system') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    };

    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [preference]);

  const setTheme = useCallback((value) => {
    setPreference(value);
  }, []);

  // Cycle: light → dark → system → light
  const toggleTheme = useCallback(() => {
    setPreference(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme: resolvedTheme,
      preference,
      setTheme,
      toggleTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
