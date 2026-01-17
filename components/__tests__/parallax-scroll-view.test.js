/**
 * Tests for ParallaxScrollView component
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
}));

// Mock themed components
jest.mock('@/components/themed-view', () => ({
  ThemedView: ({ children, style }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { style }, children);
  },
}));

// Mock hooks
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: jest.fn(() => '#ffffff'),
}));

// Mock react-native-reanimated with proper ScrollView
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { ScrollView, View } = require('react-native');
  
  const mockReanimated = {
    ScrollView: React.forwardRef((props, ref) => 
      React.createElement(ScrollView, { ...props, ref, testID: 'animated-scroll-view' }, props.children)
    ),
    View: React.forwardRef((props, ref) => 
      React.createElement(View, { ...props, ref, testID: 'animated-view' }, props.children)
    ),
    useAnimatedRef: jest.fn(() => ({ current: null })),
    useScrollOffset: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    interpolate: jest.fn((value, inputRange, outputRange) => {
      // Simple linear interpolation mock
      return outputRange[1];
    }),
  };
  
  mockReanimated.default = mockReanimated;
  
  return mockReanimated;
});

import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import ParallaxScrollView from '../parallax-scroll-view';

describe('ParallaxScrollView', () => {
  const defaultProps = {
    headerImage: <View testID="header-image"><Text>Header Image</Text></View>,
    headerBackgroundColor: { dark: '#000000', light: '#ffffff' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    require('@/hooks/use-color-scheme').useColorScheme.mockReturnValue('light');
    require('@/hooks/use-theme-color').useThemeColor.mockReturnValue('#ffffff');
  });

  describe('Rendering', () => {
    it('should render children', () => {
      const { getByText } = render(
        <ParallaxScrollView {...defaultProps}>
          <Text>Content</Text>
        </ParallaxScrollView>
      );
      
      expect(getByText('Content')).toBeTruthy();
    });

    it('should render header image', () => {
      const { getByText } = render(
        <ParallaxScrollView {...defaultProps}>
          <Text>Content</Text>
        </ParallaxScrollView>
      );
      
      expect(getByText('Header Image')).toBeTruthy();
    });

    it('should render animated scroll view', () => {
      const { getByTestId } = render(
        <ParallaxScrollView {...defaultProps}>
          <Text>Content</Text>
        </ParallaxScrollView>
      );
      
      expect(getByTestId('animated-scroll-view')).toBeTruthy();
    });

    it('should render animated header view', () => {
      const { getByTestId } = render(
        <ParallaxScrollView {...defaultProps}>
          <Text>Content</Text>
        </ParallaxScrollView>
      );
      
      expect(getByTestId('animated-view')).toBeTruthy();
    });
  });

  describe('Theme Support', () => {
    it('should use light background color by default', () => {
      const { useColorScheme } = require('@/hooks/use-color-scheme');
      useColorScheme.mockReturnValue('light');
      
      const { toJSON } = render(
        <ParallaxScrollView {...defaultProps}>
          <Text>Content</Text>
        </ParallaxScrollView>
      );
      
      expect(toJSON()).toBeTruthy();
      expect(useColorScheme).toHaveBeenCalled();
    });

    it('should handle dark color scheme', () => {
      const { useColorScheme } = require('@/hooks/use-color-scheme');
      useColorScheme.mockReturnValue('dark');
      
      const { toJSON } = render(
        <ParallaxScrollView {...defaultProps}>
          <Text>Content</Text>
        </ParallaxScrollView>
      );
      
      expect(toJSON()).toBeTruthy();
    });

    it('should use theme background color', () => {
      const { useThemeColor } = require('@/hooks/use-theme-color');
      useThemeColor.mockReturnValue('#f0f0f0');
      
      const { toJSON } = render(
        <ParallaxScrollView {...defaultProps}>
          <Text>Content</Text>
        </ParallaxScrollView>
      );
      
      expect(toJSON()).toBeTruthy();
      expect(useThemeColor).toHaveBeenCalled();
    });

    it('should fallback to light scheme when undefined', () => {
      const { useColorScheme } = require('@/hooks/use-color-scheme');
      useColorScheme.mockReturnValue(undefined);
      
      const { toJSON } = render(
        <ParallaxScrollView {...defaultProps}>
          <Text>Content</Text>
        </ParallaxScrollView>
      );
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Animation Hooks', () => {
    it('should use animated ref for scroll view', () => {
      const { useAnimatedRef } = require('react-native-reanimated');
      
      render(
        <ParallaxScrollView {...defaultProps}>
          <Text>Content</Text>
        </ParallaxScrollView>
      );
      
      expect(useAnimatedRef).toHaveBeenCalled();
    });

    it('should use scroll offset for parallax effect', () => {
      const { useScrollOffset } = require('react-native-reanimated');
      
      render(
        <ParallaxScrollView {...defaultProps}>
          <Text>Content</Text>
        </ParallaxScrollView>
      );
      
      expect(useScrollOffset).toHaveBeenCalled();
    });

    it('should use animated style for header', () => {
      const { useAnimatedStyle } = require('react-native-reanimated');
      
      render(
        <ParallaxScrollView {...defaultProps}>
          <Text>Content</Text>
        </ParallaxScrollView>
      );
      
      expect(useAnimatedStyle).toHaveBeenCalled();
    });
  });

  describe('Props', () => {
    it('should render multiple children', () => {
      const { getByText } = render(
        <ParallaxScrollView {...defaultProps}>
          <Text>First Child</Text>
          <Text>Second Child</Text>
        </ParallaxScrollView>
      );
      
      expect(getByText('First Child')).toBeTruthy();
      expect(getByText('Second Child')).toBeTruthy();
    });

    it('should accept custom header colors', () => {
      const customProps = {
        headerImage: <View><Text>Custom Header</Text></View>,
        headerBackgroundColor: { dark: '#1a1a2e', light: '#eee5e9' },
      };
      
      const { getByText } = render(
        <ParallaxScrollView {...customProps}>
          <Text>Content</Text>
        </ParallaxScrollView>
      );
      
      expect(getByText('Custom Header')).toBeTruthy();
    });
  });
});
