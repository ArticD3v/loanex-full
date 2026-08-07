export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  full: 999,
};

/** Soft enterprise elevation — navy-tinted, never harsh */
export const shadow = {
  sm: {
    shadowColor: '#0B2E6F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0B2E6F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0B2E6F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
};

/** Premium white auth card elevation on navy shell */
export const authCardStyle = {
  borderRadius: 16,
  borderWidth: 0,
  ...shadow.lg,
};
