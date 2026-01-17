/**
 * Tests for ErrorAlertDemo component
 */

// Firebase mocks MUST be at top before any imports
jest.mock('../../firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
}));

// Mock ErrorAlert
jest.mock('../../components/ErrorAlert', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return function MockErrorAlert({ visible, message, onDismiss }) {
    if (!visible) return null;
    return React.createElement(View, { testID: 'error-alert' },
      React.createElement(Text, { testID: 'error-message' }, message),
      React.createElement(
        require('react-native').Button, 
        { testID: 'dismiss-btn', title: 'Dismiss', onPress: onDismiss }
      )
    );
  };
});

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ErrorAlertDemo from '../ErrorAlertDemo';

describe('ErrorAlertDemo', () => {
  describe('Rendering', () => {
    it('should render Show Error button', () => {
      const { getByText } = render(<ErrorAlertDemo />);
      
      expect(getByText('Show Error')).toBeTruthy();
    });

    it('should render Show Custom Error button', () => {
      const { getByText } = render(<ErrorAlertDemo />);
      
      expect(getByText('Show Custom Error')).toBeTruthy();
    });

    it('should not show error alert initially', () => {
      const { queryByTestId } = render(<ErrorAlertDemo />);
      
      expect(queryByTestId('error-alert')).toBeNull();
    });
  });

  describe('Show Error Button', () => {
    it('should show error alert when Show Error is pressed', () => {
      const { getByText, getByTestId } = render(<ErrorAlertDemo />);
      
      fireEvent.press(getByText('Show Error'));
      
      expect(getByTestId('error-alert')).toBeTruthy();
    });

    it('should show random test error message', () => {
      const { getByText, getByTestId } = render(<ErrorAlertDemo />);
      
      fireEvent.press(getByText('Show Error'));
      
      const errorMessage = getByTestId('error-message');
      expect(errorMessage.props.children).toMatch(/^Test error: /);
    });
  });

  describe('Show Custom Error Button', () => {
    it('should show error alert when Show Custom Error is pressed', () => {
      const { getByText, getByTestId } = render(<ErrorAlertDemo />);
      
      fireEvent.press(getByText('Show Custom Error'));
      
      expect(getByTestId('error-alert')).toBeTruthy();
    });

    it('should show custom error message', () => {
      const { getByText, getByTestId } = render(<ErrorAlertDemo />);
      
      fireEvent.press(getByText('Show Custom Error'));
      
      const errorMessage = getByTestId('error-message');
      expect(errorMessage.props.children).toBe('Custom error: Invalid credentials.');
    });
  });

  describe('Dismiss Behavior', () => {
    it('should hide error alert when dismissed', async () => {
      const { getByText, getByTestId, queryByTestId } = render(<ErrorAlertDemo />);
      
      // Show the error
      fireEvent.press(getByText('Show Error'));
      expect(getByTestId('error-alert')).toBeTruthy();
      
      // Dismiss it
      fireEvent.press(getByTestId('dismiss-btn'));
      
      // Wait for the alert to be hidden
      await waitFor(() => {
        expect(queryByTestId('error-alert')).toBeNull();
      });
    });
  });
});
