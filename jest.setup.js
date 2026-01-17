// Jest setup file
// Note: @testing-library/react-native v12.4+ has built-in matchers

// Mock expo-font
jest.mock('expo-font', () => ({
  useFonts: () => [true],
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
}));

// Mock @expo-google-fonts
jest.mock('@expo-google-fonts/montserrat', () => ({
  Montserrat_700Bold: 'Montserrat_700Bold',
  useFonts: () => [true],
}));

jest.mock('@expo-google-fonts/lato', () => ({
  Lato_400Regular: 'Lato_400Regular',
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock expo-router
const mockRouterPush = jest.fn();
const mockRouterBack = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: mockRouterPush,
    back: mockRouterBack,
    replace: mockRouterReplace,
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useFocusEffect: jest.fn((callback) => callback()),
  Link: 'Link',
}));

// Export mocks for test files
global.mockRouterPush = mockRouterPush;
global.mockRouterBack = mockRouterBack;
global.mockRouterReplace = mockRouterReplace;

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children),
    SafeAreaProvider: ({ children }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, ...props }) => React.createElement(Text, props, name),
    MaterialIcons: ({ name, ...props }) => React.createElement(Text, props, name),
    FontAwesome: ({ name, ...props }) => React.createElement(Text, props, name),
  };
});

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(() => jest.fn()),
  Provider: ({ children }) => children,
}));

// Mock firebase
jest.mock('./firebaseConfig', () => ({
  db: {},
  auth: {},
}));

// Silence warnings in tests
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('LayoutAnimation') ||
      args[0].includes('Animated'))
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Mock LayoutAnimation
jest.mock('react-native/Libraries/LayoutAnimation/LayoutAnimation', () => ({
  configureNext: jest.fn(),
  create: jest.fn(),
  easeInEaseOut: jest.fn(),
  linear: jest.fn(),
  spring: jest.fn(),
  Properties: {
    opacity: 'opacity',
    scaleX: 'scaleX',
    scaleY: 'scaleY',
    scaleXY: 'scaleXY',
  },
  Types: {
    spring: 'spring',
    linear: 'linear',
    easeInEaseOut: 'easeInEaseOut',
    easeIn: 'easeIn',
    easeOut: 'easeOut',
  },
  Presets: {
    easeInEaseOut: {},
    spring: {},
    linear: {},
  },
  configureNextLayoutAnimation: jest.fn(),
}));
