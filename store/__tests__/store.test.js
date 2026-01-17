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
});
