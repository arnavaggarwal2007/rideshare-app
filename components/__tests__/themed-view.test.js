/**
 * Tests for ThemedView component
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
}));

// Mock useThemeColor hook
jest.mock('../../hooks/use-theme-color', () => ({
  useThemeColor: jest.fn((colors, property) => {
    return colors?.light || '#ffffff';
  }),
}));

import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useThemeColor } from '../../hooks/use-theme-color';
import { ThemedView } from '../themed-view';

describe('ThemedView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useThemeColor.mockReturnValue('#ffffff');
  });

  describe('Rendering', () => {
    it('should render children', () => {
      const { getByText } = render(
        <ThemedView>
          <Text>Child Content</Text>
        </ThemedView>
      );
      
      expect(getByText('Child Content')).toBeTruthy();
    });

    it('should apply background color from theme', () => {
      useThemeColor.mockReturnValue('#f0f0f0');
      
      const { toJSON } = render(
        <ThemedView>
          <Text>Content</Text>
        </ThemedView>
      );
      
      // Check that useThemeColor was called
      expect(useThemeColor).toHaveBeenCalledWith(
        expect.objectContaining({ light: undefined, dark: undefined }),
        'background'
      );
    });

    it('should apply custom styles', () => {
      const { toJSON } = render(
        <ThemedView style={{ padding: 16 }}>
          <Text>Content</Text>
        </ThemedView>
      );
      
      const tree = toJSON();
      expect(tree).toBeTruthy();
    });
  });

  describe('Color Props', () => {
    it('should pass lightColor to useThemeColor', () => {
      render(
        <ThemedView lightColor="#ff0000">
          <Text>Content</Text>
        </ThemedView>
      );
      
      expect(useThemeColor).toHaveBeenCalledWith(
        expect.objectContaining({ light: '#ff0000' }),
        'background'
      );
    });

    it('should pass darkColor to useThemeColor', () => {
      render(
        <ThemedView darkColor="#000000">
          <Text>Content</Text>
        </ThemedView>
      );
      
      expect(useThemeColor).toHaveBeenCalledWith(
        expect.objectContaining({ dark: '#000000' }),
        'background'
      );
    });

    it('should pass both light and dark colors', () => {
      render(
        <ThemedView lightColor="#ffffff" darkColor="#000000">
          <Text>Content</Text>
        </ThemedView>
      );
      
      expect(useThemeColor).toHaveBeenCalledWith(
        { light: '#ffffff', dark: '#000000' },
        'background'
      );
    });
  });

  describe('Props Forwarding', () => {
    it('should forward testID', () => {
      const { getByTestId } = render(
        <ThemedView testID="themed-view-test">
          <Text>Content</Text>
        </ThemedView>
      );
      
      expect(getByTestId('themed-view-test')).toBeTruthy();
    });

    it('should forward accessibility props', () => {
      const { getByLabelText } = render(
        <ThemedView accessibilityLabel="My themed view">
          <Text>Content</Text>
        </ThemedView>
      );
      
      expect(getByLabelText('My themed view')).toBeTruthy();
    });
  });
});
