// Light/dark mode support. The user's explicit choice is persisted in
// localStorage under THEME_KEY and always wins; absent a stored choice we
// fall back to the OS-level prefers-color-scheme.
export const THEME_KEY = 'theme';

export type Theme = 'light' | 'dark';

// Inlined into a <script> tag in the root layout (before hydration) so the
// correct class is on <html> before first paint, avoiding a light-mode
// flash for users who've chosen dark. Kept as a plain string (not a
// function.toString()) so minification/bundling can't mangle it.
export const themeInitScript = `(function(){try{var k='${THEME_KEY}';var s=localStorage.getItem(k);var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(THEME_KEY);
  return v === 'dark' || v === 'light' ? v : null;
}

export function getCurrentTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore (private browsing / storage disabled)
  }
}
