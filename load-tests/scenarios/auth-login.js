/**
 * Auth Login Scenario - Modular k6 Script
 * Simulates user authentication flows
 * 
 * Reference: load_testing_procedure.md Section 4.2 (LT-SCN-005)
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import { randomFrom, randomInt } from '../utils/data-generators.js';

// Custom metrics
const authLatency = new Trend('auth_latency', true);
const profileLatency = new Trend('profile_fetch_latency', true);
const authErrors = new Counter('auth_errors');
const successfulLogins = new Counter('successful_logins');
const tokenRefreshes = new Counter('token_refreshes');

// Firebase Auth API endpoint
const FIREBASE_AUTH_URL = 'https://identitytoolkit.googleapis.com/v1';

/**
 * Auth Login Scenario
 * 
 * @param {Object} options Configuration options
 * @param {string} options.email - User email (default: from env or generated)
 * @param {string} options.password - User password (default: from env)
 * @param {boolean} options.fetchProfile - Fetch user profile after login (default: true)
 * @param {boolean} options.simulateAppStartup - Include full startup sequence (default: false)
 */
export function authLoginScenario(options = {}) {
  const {
    email = null,
    password = null,
    fetchProfile = true,
    simulateAppStartup = false,
  } = options;

  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const apiKey = __ENV.FIREBASE_API_KEY || 'test-api-key';
    
    // Get credentials
    const userEmail = email || __ENV.TEST_EMAIL || `loadtest${__VU}@test.rideboard.com`;
    const userPassword = password || __ENV.TEST_PASSWORD || 'TestPass123!';

    group('Authentication', () => {
      // Full startup simulation includes cold start delays
      if (simulateAppStartup) {
        simulateStartupSequence(baseUrl, apiKey, userEmail, userPassword, fetchProfile);
      } else {
        // Standard login flow
        const authResult = performLogin(apiKey, userEmail, userPassword);
        
        if (authResult && fetchProfile) {
          sleep(0.5);
          fetchUserProfile(baseUrl, authResult.localId, authResult.idToken);
        }
      }
    });

    sleep(randomInt(10, 30));
  };
}

/**
 * Perform Firebase Auth login
 */
function performLogin(apiKey, email, password) {
  const url = `${FIREBASE_AUTH_URL}/accounts:signInWithPassword?key=${apiKey}`;
  
  const payload = JSON.stringify({
    email,
    password,
    returnSecureToken: true,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: {
      scenario: 'auth',
      operation: 'login',
    },
  };

  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const latency = Date.now() - startTime;

  // Record metrics
  authLatency.add(latency);

  const checks = check(response, {
    'login successful (200)': (r) => r.status === 200,
    'has idToken': (r) => {
      try {
        return r.json('idToken') !== undefined;
      } catch {
        return false;
      }
    },
    'auth latency < 1000ms': () => latency < 1000,
    'auth latency < 2000ms': () => latency < 2000,
  });

  if (response.status === 200) {
    successfulLogins.add(1);
    try {
      return response.json();
    } catch {
      return null;
    }
  } else {
    authErrors.add(1);
    if (__ENV.DEBUG === 'true') {
      console.error(`Login error: ${response.status} (${latency}ms) - ${response.body}`);
    }
    return null;
  }
}

/**
 * Fetch user profile after login
 */
function fetchUserProfile(baseUrl, userId, authToken) {
  const url = `${baseUrl}/users/${userId}`;
  
  const params = {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    tags: {
      scenario: 'auth',
      operation: 'profile',
    },
  };

  const startTime = Date.now();
  const response = http.get(url, params);
  const latency = Date.now() - startTime;

  // Record metrics
  profileLatency.add(latency);

  check(response, {
    'profile loaded (200)': (r) => r.status === 200,
    'has user data': (r) => {
      try {
        const body = r.json();
        return body.id || body.uid || body.email;
      } catch {
        return false;
      }
    },
    'profile latency < 500ms': () => latency < 500,
  });

  return response;
}

/**
 * Simulate full app startup sequence
 */
function simulateStartupSequence(baseUrl, apiKey, email, password, fetchProfile) {
  // 1. App launch (cold start simulation)
  sleep(randomInt(1, 3));

  // 2. Check for cached auth
  const hasCachedAuth = Math.random() < 0.7; // 70% have cached auth

  if (hasCachedAuth) {
    // Simulate token refresh instead of full login
    const refreshToken = __ENV.REFRESH_TOKEN || 'mock-refresh-token';
    const refreshResult = refreshAuthToken(apiKey, refreshToken);
    
    if (refreshResult && fetchProfile) {
      fetchUserProfile(baseUrl, refreshResult.user_id, refreshResult.access_token);
    }
  } else {
    // Full login required
    const authResult = performLogin(apiKey, email, password);
    
    if (authResult && fetchProfile) {
      sleep(0.5);
      fetchUserProfile(baseUrl, authResult.localId, authResult.idToken);
    }
  }

  // 3. Load initial data (feed)
  sleep(0.5);
  http.get(`${baseUrl}/rides?limit=20`, {
    headers: { 'Authorization': `Bearer ${__ENV.AUTH_TOKEN || ''}` },
    tags: { scenario: 'auth', operation: 'initial_data' },
  });
}

/**
 * Refresh auth token
 */
function refreshAuthToken(apiKey, refreshToken) {
  const url = `${FIREBASE_AUTH_URL}/token?key=${apiKey}`;
  
  const payload = `grant_type=refresh_token&refresh_token=${refreshToken}`;

  const params = {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    tags: {
      scenario: 'auth',
      operation: 'refresh',
    },
  };

  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const latency = Date.now() - startTime;

  authLatency.add(latency);

  const checks = check(response, {
    'refresh successful': (r) => r.status === 200,
    'has access_token': (r) => {
      try {
        return r.json('access_token') !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (response.status === 200) {
    tokenRefreshes.add(1);
    try {
      return response.json();
    } catch {
      return null;
    }
  } else {
    authErrors.add(1);
    return null;
  }
}

/**
 * Signup scenario
 */
export function signupScenario(options = {}) {
  const {
    email = null,
    password = null,
    displayName = null,
  } = options;

  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const apiKey = __ENV.FIREBASE_API_KEY || 'test-api-key';
    
    const userEmail = email || `newuser${__VU}-${Date.now()}@test.rideboard.com`;
    const userPassword = password || 'TestPass123!';
    const userName = displayName || `Test User ${__VU}`;

    group('Signup', () => {
      // 1. Create Firebase Auth account
      const authResult = createAuthAccount(apiKey, userEmail, userPassword);
      
      if (!authResult) return;

      sleep(0.5);

      // 2. Create user profile in Firestore
      const profile = {
        uid: authResult.localId,
        email: userEmail,
        displayName: userName,
        campus: randomFrom(['UCLA', 'USC', 'Caltech', 'CSUN']),
        createdAt: new Date().toISOString(),
      };

      const profileResponse = http.post(
        `${baseUrl}/users`,
        JSON.stringify(profile),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authResult.idToken}`,
          },
          tags: { scenario: 'auth', operation: 'create_profile' },
        }
      );

      check(profileResponse, {
        'profile created': (r) => r.status === 201 || r.status === 200,
      });
    });

    sleep(randomInt(30, 60));
  };
}

/**
 * Create Firebase Auth account
 */
function createAuthAccount(apiKey, email, password) {
  const url = `${FIREBASE_AUTH_URL}/accounts:signUp?key=${apiKey}`;
  
  const payload = JSON.stringify({
    email,
    password,
    returnSecureToken: true,
  });

  const startTime = Date.now();
  const response = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { scenario: 'auth', operation: 'signup' },
  });
  const latency = Date.now() - startTime;

  authLatency.add(latency);

  const success = check(response, {
    'signup successful': (r) => r.status === 200,
  });

  if (success) {
    successfulLogins.add(1);
    try {
      return response.json();
    } catch {
      return null;
    }
  } else {
    authErrors.add(1);
    return null;
  }
}

/**
 * Logout scenario
 */
export function logoutScenario() {
  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';

    group('Logout', () => {
      // Revoke token (if endpoint exists)
      const response = http.post(
        `${baseUrl}/auth/logout`,
        null,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
          tags: { scenario: 'auth', operation: 'logout' },
        }
      );

      check(response, {
        'logout successful': (r) => r.status === 200 || r.status === 204,
      });
    });
  };
}

/**
 * Auth surge scenario (many simultaneous logins)
 */
export function authSurgeScenario(options = {}) {
  const {
    userPoolSize = 100,
  } = options;

  return function () {
    const apiKey = __ENV.FIREBASE_API_KEY || 'test-api-key';
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    
    // Get user from pool based on VU
    const userIndex = (__VU - 1) % userPoolSize + 1;
    const email = `loadtest${userIndex}@test.rideboard.com`;
    const password = `TestPass123!${userIndex}`;

    group('Auth Surge', () => {
      const authResult = performLogin(apiKey, email, password);
      
      if (authResult) {
        // Quick profile fetch
        fetchUserProfile(baseUrl, authResult.localId, authResult.idToken);
      }
    });

    // Minimal pause for surge test
    sleep(randomInt(1, 3));
  };
}

/**
 * Session persistence scenario
 */
export function sessionPersistenceScenario() {
  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';

    group('Session Check', () => {
      // Verify token still valid
      const response = http.get(`${baseUrl}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        tags: { scenario: 'auth', operation: 'verify' },
      });

      check(response, {
        'session valid': (r) => r.status === 200,
        'user authenticated': (r) => {
          try {
            return r.json().authenticated === true;
          } catch {
            return false;
          }
        },
      });
    });
  };
}

// Default export
export default authLoginScenario();

// Named exports
export {
    authErrors, authLatency, fetchUserProfile, performLogin, profileLatency, refreshAuthToken, successfulLogins,
    tokenRefreshes
};

