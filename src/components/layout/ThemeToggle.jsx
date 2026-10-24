import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { savedTheme, setTheme } from '../../lib/theme';

/**
 * Switches the whole portal between the light and dark theme (lib/theme.js) — a round icon button in the top bar: a
 * moon in the light theme ("switch to dark"), a sun in the dark one. Signed-in people only (the Navbar shows it
 * only to them); the choice is remembered in this browser.
 */
export default function ThemeToggle({ className = '' }) {
  const [theme, setThemeState] = useState(savedTheme);
  const dark = theme === 'dark';

  function toggle() {
    const next = dark ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={`flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 focus-ring ${className}`}
    >
      {dark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
    </button>
  );
}
