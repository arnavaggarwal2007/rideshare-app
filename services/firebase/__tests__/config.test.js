/**
 * Tests for services/firebase/config.js
 * Basic tests for Firebase configuration
 */

// Mock Firebase modules
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: 'test-app' })),
  getApp: jest.fn(() => ({ name: 'test-app' })),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/auth', () => ({
  initializeAuth: jest.fn(() => ({ currentUser: null })),
  getAuth: jest.fn(() => ({ currentUser: null })),
  getReactNativePersistence: jest.fn(() => ({})),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({}));

describe('Firebase Config', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should export auth instance', () => {
    const { auth } = require('../config');
    expect(auth).toBeDefined();
  });

  it('should export db (Firestore) instance', () => {
    const { db } = require('../config');
    expect(db).toBeDefined();
  });

  it('should export storage instance', () => {
    const { storage } = require('../config');
    expect(storage).toBeDefined();
  });

  it('should export functions instance', () => {
    const { functions } = require('../config');
    expect(functions).toBeDefined();
  });

  it('should export default app instance', () => {
    const app = require('../config').default;
    expect(app).toBeDefined();
  });
});

describe('Firebase Config - existing app', () => {
  beforeEach(() => {
    jest.resetModules();
    // Mock getApps to return an existing app
    require('firebase/app').getApps.mockReturnValue([{ name: 'existing-app' }]);
  });

  it('should use existing app when available', () => {
    const { getApp, initializeApp } = require('firebase/app');
    require('../config');
    
    // Should use getApp instead of initializeApp when app exists
    expect(getApp).toHaveBeenCalled();
  });
});
