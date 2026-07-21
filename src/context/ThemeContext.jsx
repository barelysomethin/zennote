import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const STORAGE_KEY_THEME = 'zen_theme_choice';
const STORAGE_KEY_FONT = 'zen_font_choice';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_THEME) || 'parchment';
  });

  const [font, setFont] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_FONT) || 'sans';
  });

  const [zenFocusMode, setZenFocusMode] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  useEffect(() => {
    let fontValue = 'var(--font-sans)';
    if (font === 'serif') fontValue = 'var(--font-serif)';
    if (font === 'mono') fontValue = 'var(--font-mono)';

    document.documentElement.style.setProperty('--font-current', fontValue);
    localStorage.setItem(STORAGE_KEY_FONT, font);
  }, [font]);

  const toggleZenFocusMode = () => {
    setZenFocusMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        font,
        setFont,
        zenFocusMode,
        setZenFocusMode,
        toggleZenFocusMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
