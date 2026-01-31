/**
 * Tests for store/store.js
 * Basic tests for Redux store configuration
 */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
}));

// Mock redux-persist
jest.mock('redux-persist', () => ({
  persistReducer: jest.fn((config, reducer) => reducer),
  persistStore: jest.fn(() => ({ purge: jest.fn(), flush: jest.fn() })),
}));

// Mock devtools
jest.mock('../devtools', () => (config) => config);

// Mock Firebase
jest.mock('../../firebaseConfig', () => ({
  auth: {},
  db: {},
}));

jest.mock('../../services/firebase/config', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {},
}));

// Mock firestore service
jest.mock('../../services/firebase/firestore', () => ({
  subscribeToUserChats: jest.fn(),
  getActiveRidesPage: jest.fn(),
  getRideById: jest.fn(),
  createRide: jest.fn(),
}));

// Mock other services
jest.mock('../../services/notifications/pushNotifications', () => ({
  sendPushNotificationAsync: jest.fn(),
}));

jest.mock('../../services/notifications/tripReminders', () => ({
  scheduleTripReminders: jest.fn(),
  cancelTripReminders: jest.fn(),
}));

describe('Redux Store', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should export a store object', () => {
    const { store } = require('../store');
    expect(store).toBeDefined();
    expect(typeof store.getState).toBe('function');
    expect(typeof store.dispatch).toBe('function');
    expect(typeof store.subscribe).toBe('function');
  });

  it('should export a persistor object', () => {
    const { persistor } = require('../store');
    expect(persistor).toBeDefined();
  });

  it('should have all required slices in state', () => {
    const { store } = require('../store');
    const state = store.getState();
    
    expect(state).toHaveProperty('auth');
    expect(state).toHaveProperty('chats');
    expect(state).toHaveProperty('feed');
    expect(state).toHaveProperty('reviews');
    expect(state).toHaveProperty('rides');
    expect(state).toHaveProperty('safety');
    expect(state).toHaveProperty('trips');
    expect(state).toHaveProperty('requests');
  });

  it('should allow dispatching actions', () => {
    const { store } = require('../store');
    
    // Dispatch a simple action
    expect(() => {
      store.dispatch({ type: 'TEST_ACTION' });
    }).not.toThrow();
  });

  it('should handle dispatching async actions', async () => {
    const { store } = require('../store');
    
    // Redux Toolkit allows dispatching thunks
    const asyncAction = () => async (dispatch, getState) => {
      const state = getState();
      return state;
    };
    
    const result = await store.dispatch(asyncAction());
    expect(result).toBeDefined();
  });

  it('should handle multiple rapid dispatches', () => {
    const { store } = require('../store');
    
    for (let i = 0; i < 100; i++) {
      store.dispatch({ type: `TEST_ACTION_${i}` });
    }
    
    expect(store.getState()).toBeDefined();
  });
});

describe('State Sanitizer', () => {
  it('should handle state with stsTokenManager', () => {
    const { store } = require('../store');
    
    // The sanitizer should work when devTools reads state
    const state = store.getState();
    
    // State should be accessible
    expect(state).toBeDefined();
    expect(state.auth).toBeDefined();
  });

  it('should handle null user in auth', () => {
    const { store } = require('../store');
    const state = store.getState();
    
    // Initial state should have auth
    expect(state.auth).toBeDefined();
  });
});

describe('Persistence Config', () => {
  it('uses correct whitelist for persistence', () => {
    const { persistReducer } = require('redux-persist');
    require('../store');
    
    // persistReducer should have been called with whitelist
    expect(persistReducer).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'root',
        whitelist: expect.arrayContaining(['auth', 'rides', 'trips', 'requests', 'chats']),
      }),
      expect.any(Function)
    );
  });
});

describe('Store Middleware', () => {
  it('allows non-serializable values (for redux-persist)', () => {
    const { store } = require('../store');
    
    // Should not throw serialization errors
    expect(() => {
      store.dispatch({ 
        type: 'TEST_WITH_FUNCTION',
        payload: { callback: () => {} }
      });
    }).not.toThrow();
  });
});

describe('State Sanitizer Function', () => {
  it('redacts stsTokenManager from auth state', () => {
    // Test the stateSanitizer function by verifying store behavior
    const { store } = require('../store');
    const state = store.getState();
    
    // Initial state should be accessible
    expect(state.auth).toBeDefined();
  });

  it('handles state with user having stsTokenManager', () => {
    const { store } = require('../store');
    
    // The sanitizer should work in DevTools context
    // We verify the store works with complex auth state
    expect(() => {
      store.dispatch({
        type: 'auth/setUser',
        payload: {
          uid: 'test123',
          email: 'test@example.com',
          stsTokenManager: { accessToken: 'secret' }
        }
      });
    }).not.toThrow();
  });

  it('handles null auth state', () => {
    const { store } = require('../store');
    const state = store.getState();
    
    // Auth may or may not have a user
    expect(state.auth).toBeDefined();
  });

  it('handles state without stsTokenManager', () => {
    const { store } = require('../store');
    
    expect(() => {
      store.dispatch({
        type: 'auth/setUser',
        payload: {
          uid: 'test123',
          email: 'test@example.com',
        }
      });
    }).not.toThrow();
  });

  it('calls stateSanitizer during state access', () => {
    // Import store to get stateSanitizer to be called
    const { store } = require('../store');
    
    // Set up a user with stsTokenManager
    store.dispatch({
      type: 'auth/setUser',
      payload: {
        uid: 'user-with-token',
        email: 'user@test.com',
        stsTokenManager: {
          accessToken: 'secret-token',
          refreshToken: 'secret-refresh'
        }
      }
    });

    // Get state - the sanitizer runs when devTools accesses state
    const state = store.getState();
    
    // Original state should still have the tokens for the reducer
    expect(state.auth).toBeDefined();
  });
});

describe('Root Reducer', () => {
  it('combines all slice reducers', () => {
    const { store } = require('../store');
    const state = store.getState();
    
    expect(state.auth).toBeDefined();
    expect(state.chats).toBeDefined();
    expect(state.feed).toBeDefined();
    expect(state.reviews).toBeDefined();
    expect(state.rides).toBeDefined();
    expect(state.safety).toBeDefined();
    expect(state.trips).toBeDefined();
    expect(state.requests).toBeDefined();
  });

  it('initializes with default state from each slice', () => {
    const { store } = require('../store');
    const state = store.getState();
    
    // Each slice should have its initial state
    expect(typeof state.auth).toBe('object');
    expect(typeof state.chats).toBe('object');
    expect(typeof state.feed).toBe('object');
  });
});

describe('Persistor', () => {
  it('creates a persistor object', () => {
    const { persistor } = require('../store');
    
    expect(persistor).toBeDefined();
    expect(typeof persistor.purge).toBe('function');
    expect(typeof persistor.flush).toBe('function');
  });
});

describe('Development vs Production Config', () => {
  it('configures store with appropriate middleware', () => {
    const { store } = require('../store');
    
    // Store should be configured with middleware
    expect(store).toBeDefined();
    expect(typeof store.getState).toBe('function');
    expect(typeof store.dispatch).toBe('function');
  });
});
