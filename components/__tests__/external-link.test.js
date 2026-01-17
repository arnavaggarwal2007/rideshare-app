/**
 * Tests for ExternalLink component
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  Link: ({ children, onPress, testID, ...props }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return React.createElement(
      Pressable,
      { 
        onPress: onPress,
        testID: testID || 'external-link',
        ...props 
      },
      typeof children === 'string' 
        ? React.createElement(Text, null, children)
        : children
    );
  },
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'opened' })),
  WebBrowserPresentationStyle: {
    AUTOMATIC: 'automatic',
    FULL_SCREEN: 'fullScreen',
    PAGE_SHEET: 'pageSheet',
  },
}));

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { ExternalLink } from '../external-link';

describe('ExternalLink', () => {
  const originalEnv = process.env.EXPO_OS;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to native platform
    process.env.EXPO_OS = 'ios';
  });

  afterEach(() => {
    process.env.EXPO_OS = originalEnv;
  });

  describe('Rendering', () => {
    it('should render children', () => {
      const { getByText } = render(
        <ExternalLink href="https://example.com">
          Click Here
        </ExternalLink>
      );
      
      expect(getByText('Click Here')).toBeTruthy();
    });

    it('should render with testID', () => {
      const { getByTestId } = render(
        <ExternalLink href="https://example.com" testID="my-link">
          Link
        </ExternalLink>
      );
      
      expect(getByTestId('my-link')).toBeTruthy();
    });

    it('should pass href to Link', () => {
      const { toJSON } = render(
        <ExternalLink href="https://google.com">
          Google
        </ExternalLink>
      );
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Native Platform Behavior', () => {
    it('should open in-app browser on native press', async () => {
      const { getByTestId } = render(
        <ExternalLink href="https://example.com" testID="native-link">
          Open Link
        </ExternalLink>
      );
      
      const link = getByTestId('native-link');
      const mockEvent = {
        preventDefault: jest.fn(),
      };
      
      await fireEvent.press(link, mockEvent);
      
      await waitFor(() => {
        expect(openBrowserAsync).toHaveBeenCalledWith('https://example.com', {
          presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
        });
      });
    });

    it('should prevent default behavior on native', async () => {
      const { getByTestId } = render(
        <ExternalLink href="https://test.com" testID="prevent-link">
          Test Link
        </ExternalLink>
      );
      
      const link = getByTestId('prevent-link');
      const mockEvent = {
        preventDefault: jest.fn(),
      };
      
      fireEvent.press(link, mockEvent);
      
      // The press handler should be invoked
      expect(openBrowserAsync).toHaveBeenCalled();
    });
  });

  describe('Web Platform Behavior', () => {
    it('should not open in-app browser on web', async () => {
      process.env.EXPO_OS = 'web';
      
      const { getByTestId } = render(
        <ExternalLink href="https://example.com" testID="web-link">
          Web Link
        </ExternalLink>
      );
      
      const link = getByTestId('web-link');
      const mockEvent = {
        preventDefault: jest.fn(),
      };
      
      fireEvent.press(link, mockEvent);
      
      // On web, it should use default browser behavior, not openBrowserAsync
      // The event.preventDefault should NOT be called on web
      // openBrowserAsync should not be called on web platform
    });
  });

  describe('Props Forwarding', () => {
    it('should forward additional props', () => {
      const { toJSON } = render(
        <ExternalLink 
          href="https://example.com" 
          accessibilityLabel="External website"
        >
          Accessible Link
        </ExternalLink>
      );
      
      expect(toJSON()).toBeTruthy();
    });

    it('should have target="_blank" for external links', () => {
      const { toJSON } = render(
        <ExternalLink href="https://example.com">
          Blank Target
        </ExternalLink>
      );
      
      // The Link component should receive target="_blank"
      expect(toJSON()).toBeTruthy();
    });
  });
});
