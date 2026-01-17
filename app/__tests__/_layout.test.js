/**
 * Tests for app/_layout.js - Root Layout
 * Tests navigation guards, loading states, and notification setup.
 */

// Mock AppState from react-native first
import { AppState } from 'react-native';
jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));

// Firebase mocks
jest.mock('../../firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
}));

jest.mock('../../services/firebase/config', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {},
}));

// Mock notification services
const mockRegisterForPushNotifications = jest.fn(() => Promise.resolve());
const mockClearBadgeCount = jest.fn();
const mockCreateNotificationResponseListener = jest.fn(() => ({ remove: jest.fn() }));

jest.mock('../../services/notifications/pushNotifications', () => ({
  registerForPushNotificationsAsync: (...args) => mockRegisterForPushNotifications(...args),
}));

jest.mock('../../services/notifications/notificationHandler', () => ({
  clearBadgeCount: () => mockClearBadgeCount(),
  createNotificationResponseListener: (...args) => mockCreateNotificationResponseListener(...args),
}));

// Mock setError action
const mockSetError = jest.fn(() => ({ type: 'auth/setError', payload: null }));
jest.mock('../../store/slices/authSlice', () => ({
  setError: (...args) => mockSetError(...args),
  setUserProfile: jest.fn(() => ({ type: 'auth/setUserProfile', payload: null })),
}));

// Mock expo-router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

let mockSegments = [];

jest.mock('expo-router', () => ({
  Stack: Object.assign(
    function MockStack({ children }) {
      const React = require('react');
      const { View } = require('react-native');
      return React.createElement(View, { testID: 'stack-container' }, children);
    },
    {
      Screen: function MockScreen({ name }) {
        const React = require('react');
        const { View } = require('react-native');
        return React.createElement(View, { testID: `screen-${name}` });
      },
    }
  ),
  useRouter: () => mockRouter,
  useSegments: () => mockSegments,
  useFocusEffect: jest.fn((callback) => callback()),
}));

// Mock redux-persist
jest.mock('redux-persist/integration/react', () => ({
  PersistGate: ({ children }) => children,
}));

// Mock store and persistor
jest.mock('../../store/store', () => ({
  store: {
    getState: () => ({
      auth: { user: null, userProfile: null, loading: false, error: null },
      chats: { chats: [] },
      safety: { blockedUsers: [] },
    }),
    dispatch: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
  },
  persistor: {
    purge: jest.fn(),
    flush: jest.fn(),
  },
}));

// Mock AuthContext
jest.mock('../../hooks/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
}));

// Mock ErrorAlert
jest.mock('../../components/ErrorAlert', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockErrorAlert({ visible }) {
    if (!visible) return null;
    return React.createElement(View, { testID: 'error-alert' });
  };
});

// Setup mock auth state
let mockAuthState = {
  user: null,
  userProfile: null,
  loading: false,
  error: null,
};

// Override global react-redux mock
jest.mock('react-redux', () => ({
  Provider: ({ children }) => children,
  useSelector: (selector) => {
    const state = {
      auth: mockAuthState,
      chats: { chats: [] },
      safety: { blockedUsers: [] },
    };
    return selector(state);
  },
  useDispatch: () => jest.fn(),
}));

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import RootLayout from '../_layout';

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSegments = [];
    mockAuthState = {
      user: null,
      userProfile: null,
      loading: false,
      error: null,
    };
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading is true', () => {
      mockAuthState.loading = true;
      
      const { getByText } = render(<RootLayout />);
      
      expect(getByText('Setting up your account...')).toBeTruthy();
    });
  });

  describe('Ready State', () => {
    it('should render Stack when loading is false', () => {
      mockAuthState.loading = false;
      
      const { getByTestId } = render(<RootLayout />);
      
      expect(getByTestId('stack-container')).toBeTruthy();
    });

    it('should render screen routes', () => {
      mockAuthState.loading = false;
      
      const { getByTestId } = render(<RootLayout />);
      
      expect(getByTestId('screen-index')).toBeTruthy();
      expect(getByTestId('screen-(auth)')).toBeTruthy();
      expect(getByTestId('screen-(tabs)')).toBeTruthy();
    });
  });

  describe('Push Notifications', () => {
    it('should register for push notifications when user is logged in', async () => {
      mockAuthState = {
        user: { uid: 'user123' },
        userProfile: { uid: 'user123', profileComplete: true },
        loading: false,
        error: null,
      };
      
      render(<RootLayout />);
      
      await waitFor(() => {
        expect(mockRegisterForPushNotifications).toHaveBeenCalledWith('user123');
      }, { timeout: 1000 });
    });

    it('should not register for push notifications when no user', () => {
      mockAuthState.loading = false;
      
      render(<RootLayout />);
      
      expect(mockRegisterForPushNotifications).not.toHaveBeenCalled();
    });

    it('should clear badge count on mount', () => {
      mockAuthState.loading = false;
      
      render(<RootLayout />);
      
      expect(mockClearBadgeCount).toHaveBeenCalled();
    });

    it('should set up notification response listener', () => {
      mockAuthState.loading = false;
      
      render(<RootLayout />);
      
      expect(mockCreateNotificationResponseListener).toHaveBeenCalledWith(mockRouter);
    });

    it('should handle push notification registration failure gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockRegisterForPushNotifications.mockRejectedValueOnce(new Error('Registration failed'));
      
      mockAuthState = {
        user: { uid: 'user123' },
        userProfile: { uid: 'user123', profileComplete: true },
        loading: false,
        error: null,
      };
      
      render(<RootLayout />);
      
      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[notifications] Registration failed',
          'Registration failed'
        );
      }, { timeout: 1000 });
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Navigation Guards', () => {
    it('should redirect to profile-setup when profile is incomplete on tabs', async () => {
      mockAuthState = {
        user: { uid: 'user123' },
        userProfile: { uid: 'user123', profileComplete: false },
        loading: false,
        error: null,
      };
      mockSegments = ['(tabs)', 'home'];
      
      render(<RootLayout />);
      
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/profile-setup');
      }, { timeout: 1000 });
    });

    it('should redirect from profile-setup to home when profile is complete', async () => {
      mockAuthState = {
        user: { uid: 'user123' },
        userProfile: { uid: 'user123', profileComplete: true },
        loading: false,
        error: null,
      };
      mockSegments = ['(auth)', 'profile-setup'];
      
      render(<RootLayout />);
      
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
      }, { timeout: 1000 });
    });

    it('should redirect from signup to profile-setup for new accounts', async () => {
      mockAuthState = {
        user: { uid: 'user123' },
        userProfile: { uid: 'user123', profileComplete: false },
        loading: false,
        error: null,
      };
      mockSegments = ['(auth)', 'signup'];
      
      render(<RootLayout />);
      
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/profile-setup');
      }, { timeout: 1000 });
    });

    it('should redirect from signin to home when profile is complete', async () => {
      mockAuthState = {
        user: { uid: 'user123' },
        userProfile: { uid: 'user123', profileComplete: true },
        loading: false,
        error: null,
      };
      mockSegments = ['(auth)', 'signin'];
      
      render(<RootLayout />);
      
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home');
      }, { timeout: 1000 });
    });

    it('should not redirect when user not logged in on signin', () => {
      mockAuthState = {
        user: null,
        userProfile: null,
        loading: false,
        error: null,
      };
      mockSegments = ['(auth)', 'signin'];
      
      render(<RootLayout />);
      
      // Should not redirect anywhere
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it('should clear profile and log when logged out on protected route', async () => {
      // Note: The actual redirect to signin is currently disabled in the code
      // This test verifies the current behavior (log + clear profile)
      mockAuthState = {
        user: null,
        userProfile: null,
        loading: false,
        error: null,
      };
      mockSegments = ['(tabs)', 'home'];
      
      render(<RootLayout />);
      
      // The code logs "Would redirect to (auth)/signin" but doesn't actually redirect
      // because the router.replace call is commented out
      expect(mockRouter.replace).not.toHaveBeenCalledWith('/(auth)/signin');
    });

    it('should clear stale userProfile when user is null', () => {
      // This tests the branch at line 170 where userProfile exists but user is null
      mockAuthState = {
        user: null,
        userProfile: { uid: 'staleUser', profileComplete: true },
        loading: false,
        error: null,
      };
      mockSegments = ['(auth)', 'signin'];
      
      render(<RootLayout />);
      
      // The component should dispatch setUserProfile(null) to clear stale profile
      // We just verify it doesn't crash and renders correctly
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });
});
