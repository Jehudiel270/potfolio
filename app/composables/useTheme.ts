import { DEFAULT_THEME, cssVarsToString, themeToCssVars, type Theme } from '#shared/theme'

/** Thème global (HTML + scène 3D). Une seule source : les réglages Neon, appliqués en variables CSS dès le rendu serveur. */
export function useTheme() {
  return useState<Theme>('pf-theme', () => ({ ...DEFAULT_THEME }))
}
export function useThemeHead() {
  const theme = useTheme()
  useHead({ style: [{ key: 'pf-theme', innerHTML: computed(() => cssVarsToString(themeToCssVars(theme.value))) }] })
}
