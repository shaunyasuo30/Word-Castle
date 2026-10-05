export type Theme = 'day' | 'night'

const THEME_KEY = 'word-castle:theme:v1'

export function loadTheme(): Theme {
  try { return localStorage.getItem(THEME_KEY) === 'day' ? 'day' : 'night' }
  catch { return 'night' }
}

export function saveTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'day' ? '#e9f6ff' : '#101d3a')
  try { localStorage.setItem(THEME_KEY, theme) } catch { /* The theme still works for this session. */ }
}
