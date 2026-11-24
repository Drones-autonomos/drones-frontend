/**
 * Servicio de tema claro/oscuro para AeroLuferan.
 *
 * Persiste en localStorage (`aeroluferan_theme`: 'light' | 'dark'), aplica
 * `data-theme` sobre <html> y emite `aeroluferan_theme_changed` para que
 * los componentes reaccionen. El valor inicial respeta prefers-color-scheme.
 * index.html contiene un script inline que aplica el tema antes del primer
 * paint para evitar destello (FOUC).
 */

const THEME_STORAGE_KEY = 'aeroluferan_theme'
const THEME_CHANGED_EVENT = 'aeroluferan_theme_changed'

export function getTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    /* localStorage no disponible */
  }
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme) {
  const value = theme === 'dark' ? 'dark' : 'light'
  document.documentElement.dataset.theme = value
  return value
}

export function setTheme(theme) {
  const applied = applyTheme(theme)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, applied)
  } catch {
    /* sin persistencia */
  }
  window.dispatchEvent(new CustomEvent(THEME_CHANGED_EVENT, { detail: applied }))
  return applied
}

export function toggleTheme() {
  return setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

export { THEME_STORAGE_KEY, THEME_CHANGED_EVENT }
