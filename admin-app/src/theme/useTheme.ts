import { lightColors, ThemeColors } from './colors';

/**
 * Post-login enterprise light theme.
 * Hybrid strategy: auth screens use authColors; the app always uses light.
 */
export function useTheme(): ThemeColors {
  return lightColors;
}
