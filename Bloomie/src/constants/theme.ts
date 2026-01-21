// Bloomie - Theme Constants (Updated Design)

export const Colors = {
  // Primary Colors
  primary: '#E07A5F',
  primaryDark: '#D85C45',
  primaryLight: '#F4A261',
  
  // Accent Colors (with variants)
  terracotta: {
    50: '#FEF3F0',
    100: '#FDDDD4',
    200: '#F8C4B4',
    300: '#F2A68E',
    400: '#E89578',
    500: '#E29578',
    600: '#D17860',
    700: '#B86148',
    800: '#9A4F3C',
    900: '#7C4032',
    DEFAULT: '#E29578',
  },
  sage: '#81B29A',
  sageDeep: '#2A9D8F',
  sand: '#F2E9E4',
  cream: '#FFF8F0',
  warmBg: '#FDFCF8',
  yellow: '#F2CC8F',
  
  // Nurture Type Colors
  baby: {
    bg: '#FFE5D9',
    bgGradient: ['#FFE5D9', '#FFCAD4'],
    text: '#D85C45',
    textDark: '#B45638',
    icon: '#D85C45',
    border: 'rgba(216, 92, 69, 0.2)',
    main: '#D85C45',
    light: '#FFE5D9',
  },
  pet: {
    bg: '#FFE8D6',
    bgGradient: ['#FFE8D6', '#DDBEA9'],
    text: '#A47148',
    textDark: '#8D5B35',
    icon: '#A47148',
    border: 'rgba(164, 113, 72, 0.2)',
    main: '#A47148',
    light: '#FFE8D6',
  },
  plant: {
    bg: '#E2ECE9',
    bgGradient: ['#E2ECE9', '#BFD8BD'],
    text: '#558B6E',
    textDark: '#2D6A4F',
    icon: '#558B6E',
    border: 'rgba(85, 139, 110, 0.2)',
    main: '#558B6E',
    light: '#E2ECE9',
  },
  
  // Text Colors
  textDark: '#4A3B32',
  textMain: '#3D405B',
  textSubtle: '#8C7E72',
  charcoal: '#3D405B',
  
  // UI Colors
  white: '#FFFFFF',
  black: '#000000',
  card: '#FFFFFF',
  
  // Semantic Colors
  success: '#81B29A',
  warning: '#F4A261',
  error: '#E07A5F',
  info: '#A4C3D2',
  
  // Gray Scale
  gray: {
    50: '#FDFCF8',
    100: '#FAF5F0',
    200: '#EDE8E4',
    300: '#D6D3D1',
    400: '#9C8C84',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
  },
};

export const Fonts = {
  // Font Families (Nunito for display, Patrick Hand for handwritten)
  display: 'Nunito',
  hand: 'PatrickHand',
  body: 'Nunito',
  
  // Font Weights
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  
  // Font Sizes
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  cozy: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 10,
  },
  input: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  nav: {
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 10,
  },
};

// Get nurture type colors
export const getNurtureColors = (type: 'baby' | 'pet' | 'plant') => {
  switch (type) {
    case 'baby':
      return Colors.baby;
    case 'pet':
      return Colors.pet;
    case 'plant':
      return Colors.plant;
    default:
      return Colors.baby;
  }
};

// Get nurture type icon
export const getNurtureIcon = (type: 'baby' | 'pet' | 'plant') => {
  switch (type) {
    case 'baby':
      return 'baby-face';
    case 'pet':
      return 'paw';
    case 'plant':
      return 'flower';
    default:
      return 'heart';
  }
};
