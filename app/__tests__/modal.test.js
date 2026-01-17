/**
 * Tests for app/modal.tsx
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
}));

// Mock expo-router Link component
jest.mock('expo-router', () => ({
  Link: ({ children, href, style }) => {
    const React = require('react');
    const { TouchableOpacity } = require('react-native');
    return React.createElement(
      TouchableOpacity,
      { testID: 'link-home', style },
      children
    );
  },
}));

// Mock themed components
jest.mock('@/components/themed-text', () => ({
  ThemedText: ({ children, type }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `themed-text-${type || 'default'}` }, children);
  },
}));

jest.mock('@/components/themed-view', () => ({
  ThemedView: ({ children, style }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { style, testID: 'themed-view' }, children);
  },
}));

import { render } from '@testing-library/react-native';
import ModalScreen from '../modal';

describe('ModalScreen', () => {
  describe('Rendering', () => {
    it('should render the modal container', () => {
      const { getByTestId } = render(<ModalScreen />);
      
      expect(getByTestId('themed-view')).toBeTruthy();
    });

    it('should render the title text', () => {
      const { getByText } = render(<ModalScreen />);
      
      expect(getByText('This is a modal')).toBeTruthy();
    });

    it('should render the link to home screen', () => {
      const { getByTestId } = render(<ModalScreen />);
      
      expect(getByTestId('link-home')).toBeTruthy();
    });

    it('should render link text', () => {
      const { getByText } = render(<ModalScreen />);
      
      expect(getByText('Go to home screen')).toBeTruthy();
    });
  });

  describe('Text Types', () => {
    it('should render title with correct type', () => {
      const { getByTestId } = render(<ModalScreen />);
      
      expect(getByTestId('themed-text-title')).toBeTruthy();
    });

    it('should render link with correct type', () => {
      const { getByTestId } = render(<ModalScreen />);
      
      expect(getByTestId('themed-text-link')).toBeTruthy();
    });
  });
});
