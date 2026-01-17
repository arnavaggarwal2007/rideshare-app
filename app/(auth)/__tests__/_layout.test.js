/**
 * Tests for app/(auth)/_layout.js
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../../firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
}));

// Mock expo-router Stack component
jest.mock('expo-router', () => ({
  Stack: Object.assign(
    ({ children, screenOptions }) => {
      const React = require('react');
      const { View, Text } = require('react-native');
      return React.createElement(View, { testID: 'stack-container' },
        React.createElement(Text, { testID: 'stack-options' }, JSON.stringify(screenOptions)),
        children
      );
    },
    {
      Screen: ({ name, options }) => {
        const React = require('react');
        const { View, Text } = require('react-native');
        return React.createElement(View, { testID: `screen-${name}` },
          React.createElement(Text, { testID: `screen-${name}-title` }, options?.title || name)
        );
      },
    }
  ),
}));

import { render } from '@testing-library/react-native';
import AuthLayout from '../_layout';

describe('AuthLayout', () => {
  describe('Rendering', () => {
    it('should render Stack container', () => {
      const { getByTestId } = render(<AuthLayout />);
      
      expect(getByTestId('stack-container')).toBeTruthy();
    });

    it('should have headerShown false in screenOptions', () => {
      const { getByTestId } = render(<AuthLayout />);
      
      const options = JSON.parse(getByTestId('stack-options').props.children);
      expect(options.headerShown).toBe(false);
    });

    it('should have gestureEnabled true in screenOptions', () => {
      const { getByTestId } = render(<AuthLayout />);
      
      const options = JSON.parse(getByTestId('stack-options').props.children);
      expect(options.gestureEnabled).toBe(true);
    });
  });

  describe('Screen Configuration', () => {
    it('should render signin screen', () => {
      const { getByTestId } = render(<AuthLayout />);
      
      expect(getByTestId('screen-signin')).toBeTruthy();
    });

    it('should have correct title for signin', () => {
      const { getByTestId } = render(<AuthLayout />);
      
      expect(getByTestId('screen-signin-title').props.children).toBe('Sign In');
    });

    it('should render signup screen', () => {
      const { getByTestId } = render(<AuthLayout />);
      
      expect(getByTestId('screen-signup')).toBeTruthy();
    });

    it('should have correct title for signup', () => {
      const { getByTestId } = render(<AuthLayout />);
      
      expect(getByTestId('screen-signup-title').props.children).toBe('Sign Up');
    });

    it('should render forgot-password screen', () => {
      const { getByTestId } = render(<AuthLayout />);
      
      expect(getByTestId('screen-forgot-password')).toBeTruthy();
    });

    it('should have correct title for forgot-password', () => {
      const { getByTestId } = render(<AuthLayout />);
      
      expect(getByTestId('screen-forgot-password-title').props.children).toBe('Forgot Password');
    });

    it('should render profile-setup screen', () => {
      const { getByTestId } = render(<AuthLayout />);
      
      expect(getByTestId('screen-profile-setup')).toBeTruthy();
    });

    it('should have correct title for profile-setup', () => {
      const { getByTestId } = render(<AuthLayout />);
      
      expect(getByTestId('screen-profile-setup-title').props.children).toBe('Complete Profile');
    });
  });
});
