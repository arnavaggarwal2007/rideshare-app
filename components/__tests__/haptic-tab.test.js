/**
 * Tests for HapticTab component
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
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

// Mock navigation elements
jest.mock('@react-navigation/elements', () => ({
  PlatformPressable: ({ children, onPressIn, ...props }) => {
    const React = require('react');
    const { TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity testID="platform-pressable" onPressIn={onPressIn} {...props}>
        {children}
      </TouchableOpacity>
    );
  },
}));

import { fireEvent, render } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { HapticTab } from '../haptic-tab';

describe('HapticTab', () => {
  const mockOnPressIn = jest.fn();
  
  const defaultProps = {
    onPressIn: mockOnPressIn,
    accessibilityState: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render PlatformPressable', () => {
      const { getByTestId } = render(<HapticTab {...defaultProps} />);
      
      expect(getByTestId('platform-pressable')).toBeTruthy();
    });

    it('should pass through additional props', () => {
      const { getByTestId } = render(
        <HapticTab {...defaultProps} testID="custom-test" />
      );
      
      // The custom testID will be passed through
      expect(getByTestId('custom-test')).toBeTruthy();
    });
  });

  describe('Press Interaction', () => {
    it('should call onPressIn when pressed', () => {
      const { getByTestId } = render(<HapticTab {...defaultProps} />);
      
      const pressable = getByTestId('platform-pressable');
      fireEvent(pressable, 'onPressIn', {});
      
      expect(mockOnPressIn).toHaveBeenCalled();
    });

    it('should handle missing onPressIn prop gracefully', () => {
      const propsWithoutOnPressIn = { accessibilityState: {} };
      const { getByTestId } = render(<HapticTab {...propsWithoutOnPressIn} />);
      
      const pressable = getByTestId('platform-pressable');
      
      // Should not throw when pressed
      expect(() => {
        fireEvent(pressable, 'onPressIn', {});
      }).not.toThrow();
    });
  });
});
