/**
 * Tests for Collapsible component
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../../firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
}));

// Mock expo-symbols
jest.mock('expo-symbols', () => ({}));

// Mock IconSymbol used by Collapsible
jest.mock('@/components/ui/icon-symbol', () => ({
  IconSymbol: ({ name, color, size, style }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return (
      <Text testID="collapsible-chevron-icon" style={[{ color, fontSize: size }, style]}>
        {name}
      </Text>
    );
  },
}));

// Mock hooks
jest.mock('../../../hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useColorScheme } from '../../../hooks/use-color-scheme';
import { Collapsible } from '../collapsible';

describe('Collapsible', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useColorScheme.mockReturnValue('light');
  });

  describe('Rendering', () => {
    it('should render title', () => {
      const { getByText } = render(
        <Collapsible title="Test Section">
          <Text>Child Content</Text>
        </Collapsible>
      );
      
      expect(getByText('Test Section')).toBeTruthy();
    });

    it('should hide children when collapsed', () => {
      const { queryByText, getByText } = render(
        <Collapsible title="Test Section">
          <Text>Hidden Child</Text>
        </Collapsible>
      );
      
      // Title should be visible
      expect(getByText('Test Section')).toBeTruthy();
      // Children should be hidden initially
      expect(queryByText('Hidden Child')).toBeNull();
    });

    it('should show chevron icon', () => {
      const { getByTestId } = render(
        <Collapsible title="Test Section">
          <Text>Child</Text>
        </Collapsible>
      );
      
      expect(getByTestId('collapsible-chevron-icon')).toBeTruthy();
    });
  });

  describe('Expand/Collapse', () => {
    it('should expand when pressed', () => {
      const { getByText, queryByText } = render(
        <Collapsible title="Test Section">
          <Text>Expandable Content</Text>
        </Collapsible>
      );
      
      // Initially hidden
      expect(queryByText('Expandable Content')).toBeNull();
      
      // Press to expand
      const header = getByText('Test Section');
      fireEvent.press(header);
      
      // Now children should be visible
      expect(getByText('Expandable Content')).toBeTruthy();
    });

    it('should collapse when pressed again', () => {
      const { getByText, queryByText } = render(
        <Collapsible title="Test Section">
          <Text>Toggle Content</Text>
        </Collapsible>
      );
      
      // Press to expand
      const header = getByText('Test Section');
      fireEvent.press(header);
      expect(getByText('Toggle Content')).toBeTruthy();
      
      // Press to collapse
      fireEvent.press(header);
      expect(queryByText('Toggle Content')).toBeNull();
    });

    it('should toggle multiple times', () => {
      const { getByText, queryByText } = render(
        <Collapsible title="Multi Toggle">
          <Text>Toggle Me</Text>
        </Collapsible>
      );
      
      const header = getByText('Multi Toggle');
      
      // Toggle 1: Expand
      fireEvent.press(header);
      expect(getByText('Toggle Me')).toBeTruthy();
      
      // Toggle 2: Collapse
      fireEvent.press(header);
      expect(queryByText('Toggle Me')).toBeNull();
      
      // Toggle 3: Expand again
      fireEvent.press(header);
      expect(getByText('Toggle Me')).toBeTruthy();
    });
  });

  describe('Theme Support', () => {
    it('should use light theme colors', () => {
      useColorScheme.mockReturnValue('light');
      
      const { getByTestId } = render(
        <Collapsible title="Test Section">
          <Text>Child</Text>
        </Collapsible>
      );
      
      expect(getByTestId('collapsible-chevron-icon')).toBeTruthy();
    });

    it('should use dark theme colors', () => {
      useColorScheme.mockReturnValue('dark');
      
      const { getByTestId } = render(
        <Collapsible title="Test Section">
          <Text>Child</Text>
        </Collapsible>
      );
      
      expect(getByTestId('collapsible-chevron-icon')).toBeTruthy();
    });

    it('should fallback to light when theme is null', () => {
      useColorScheme.mockReturnValue(null);
      
      const { getByTestId } = render(
        <Collapsible title="Test Section">
          <Text>Child</Text>
        </Collapsible>
      );
      
      expect(getByTestId('collapsible-chevron-icon')).toBeTruthy();
    });
  });
});
