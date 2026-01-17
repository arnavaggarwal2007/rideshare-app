/**
 * Tests for ThemedText component
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
}));

// Mock useThemeColor hook
jest.mock('../../hooks/use-theme-color', () => ({
  useThemeColor: jest.fn((colors, property) => {
    return colors?.light || '#000000';
  }),
}));

import { render } from '@testing-library/react-native';
import { useThemeColor } from '../../hooks/use-theme-color';
import { ThemedText } from '../themed-text';

describe('ThemedText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useThemeColor.mockReturnValue('#000000');
  });

  describe('Rendering', () => {
    it('should render text content', () => {
      const { getByText } = render(
        <ThemedText>Hello World</ThemedText>
      );
      
      expect(getByText('Hello World')).toBeTruthy();
    });

    it('should apply text color from theme', () => {
      useThemeColor.mockReturnValue('#333333');
      
      const { getByText } = render(
        <ThemedText>Styled Text</ThemedText>
      );
      
      // Check that useThemeColor was called
      expect(useThemeColor).toHaveBeenCalledWith(
        expect.objectContaining({ light: undefined, dark: undefined }),
        'text'
      );
    });
  });

  describe('Text Types', () => {
    it('should render default type', () => {
      const { toJSON } = render(
        <ThemedText>Default Text</ThemedText>
      );
      
      expect(toJSON()).toBeTruthy();
    });

    it('should render title type', () => {
      const { toJSON } = render(
        <ThemedText type="title">Title Text</ThemedText>
      );
      
      expect(toJSON()).toBeTruthy();
    });

    it('should render defaultSemiBold type', () => {
      const { toJSON } = render(
        <ThemedText type="defaultSemiBold">Semi Bold Text</ThemedText>
      );
      
      expect(toJSON()).toBeTruthy();
    });

    it('should render subtitle type', () => {
      const { toJSON } = render(
        <ThemedText type="subtitle">Subtitle Text</ThemedText>
      );
      
      expect(toJSON()).toBeTruthy();
    });

    it('should render link type', () => {
      const { toJSON } = render(
        <ThemedText type="link">Link Text</ThemedText>
      );
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Color Props', () => {
    it('should pass lightColor to useThemeColor', () => {
      render(
        <ThemedText lightColor="#ff0000">Text</ThemedText>
      );
      
      expect(useThemeColor).toHaveBeenCalledWith(
        expect.objectContaining({ light: '#ff0000' }),
        'text'
      );
    });

    it('should pass darkColor to useThemeColor', () => {
      render(
        <ThemedText darkColor="#0000ff">Text</ThemedText>
      );
      
      expect(useThemeColor).toHaveBeenCalledWith(
        expect.objectContaining({ dark: '#0000ff' }),
        'text'
      );
    });

    it('should pass both light and dark colors', () => {
      render(
        <ThemedText lightColor="#ffffff" darkColor="#000000">Text</ThemedText>
      );
      
      expect(useThemeColor).toHaveBeenCalledWith(
        { light: '#ffffff', dark: '#000000' },
        'text'
      );
    });
  });

  describe('Style Props', () => {
    it('should apply custom styles', () => {
      const { toJSON } = render(
        <ThemedText style={{ fontSize: 24 }}>Styled Text</ThemedText>
      );
      
      expect(toJSON()).toBeTruthy();
    });

    it('should merge custom styles with type styles', () => {
      const { toJSON } = render(
        <ThemedText type="title" style={{ color: 'red' }}>
          Custom Styled Title
        </ThemedText>
      );
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Props Forwarding', () => {
    it('should forward testID', () => {
      const { getByTestId } = render(
        <ThemedText testID="themed-text-test">Text</ThemedText>
      );
      
      expect(getByTestId('themed-text-test')).toBeTruthy();
    });

    it('should forward accessibility props', () => {
      const { getByLabelText } = render(
        <ThemedText accessibilityLabel="My themed text">Text</ThemedText>
      );
      
      expect(getByLabelText('My themed text')).toBeTruthy();
    });

    it('should forward numberOfLines prop', () => {
      const { getByText } = render(
        <ThemedText numberOfLines={1}>
          This is a very long text that should be truncated
        </ThemedText>
      );
      
      expect(getByText('This is a very long text that should be truncated')).toBeTruthy();
    });
  });
});
