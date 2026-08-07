import { Platform } from 'react-native';

export const Colors = {
  primary: '#E85D04', primaryLight: '#FFF3E8', primaryDark: '#C44D00',
  success: '#2D6A4F', successLight: '#E8F5EE',
  warning: '#F59E0B', warningLight: '#FEF3C7',
  error: '#EF4444', errorLight: '#FEE2E2',
  background: '#FFF8F0', surface: '#FFFFFF', surfaceAlt: '#F5F0EA',
  adminBg: '#0F0F23', adminCard: '#1A1A35', adminBorder: '#2D2D50',
  textPrimary: '#1A1A1A', textSecondary: '#666666', textTertiary: '#999999', textInverse: '#FFFFFF',
  border: '#E8E0D5', borderLight: '#F0EAE0', star: '#FFB800',
};

export const Fonts = {
  xs: 11, sm: 13, md: 15, base: 16, lg: 18, xl: 20, xxl: 24, xxxl: 28, display: 32,
  regular: '400' as const, medium: '500' as const, semiBold: '600' as const,
  bold: '700' as const, extraBold: '800' as const,
};

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 };

export const Radius = { sm: 6, md: 10, lg: 14, xl: 18, xxl: 24, full: 999 };

export const Shadow = {
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
    android: { elevation: 2 }, default: {},
  }),
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    android: { elevation: 4 }, default: {},
  }),
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16 },
    android: { elevation: 8 }, default: {},
  }),
};
