export const BRAND = {
  primary: '#FF69B4',
  primaryDark: '#E91E8C',
  primaryLight: '#FFB6D9',
  accent: '#FF1493',
} as const;

export const LightTheme = {
  background: '#FFF5FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#FFE4F0',
  text: '#2D1B2E',
  textMuted: '#7A5C7A',
  border: '#F5C6E0',
  primary: BRAND.primary,
  primaryMuted: BRAND.primaryLight,
  tabBar: '#FFFFFF',
  danger: '#D32F2F',
  success: '#2E7D32',
} as const;

export const DarkTheme = {
  background: '#1A1218',
  surface: '#2A1F28',
  surfaceSecondary: '#3D2D3A',
  text: '#F8E8F2',
  textMuted: '#C9A8BC',
  border: '#4A3A48',
  primary: BRAND.primary,
  primaryMuted: '#B84A84',
  tabBar: '#231A22',
  danger: '#FF8A80',
  success: '#81C784',
} as const;

export type FinpalColors = typeof LightTheme | typeof DarkTheme;
