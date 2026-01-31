/**
 * Firebase Auth Helpers for k6 Load Tests
 * Handles authentication token management
 */

import { check } from 'k6';
import http from 'k6/http';

const FIREBASE_AUTH_URL = 'https://identitytoolkit.googleapis.com/v1';

/**
 * Firebase Auth Helper
 */
export class FirebaseAuth {
  constructor(apiKey) {
    this.apiKey = apiKey || __ENV.FIREBASE_API_KEY;
    this.authUrl = `${FIREBASE_AUTH_URL}/accounts:signInWithPassword?key=${this.apiKey}`;
    this.refreshUrl = `${FIREBASE_AUTH_URL}/token?key=${this.apiKey}`;
    this.signUpUrl = `${FIREBASE_AUTH_URL}/accounts:signUp?key=${this.apiKey}`;
  }

  /**
   * Sign in with email/password
   * Returns { idToken, refreshToken, localId, email, expiresIn }
   */
  signIn(email, password) {
    const payload = JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    });

    const response = http.post(this.authUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { scenario: 'auth', operation: 'login' },
    });

    const success = check(response, {
      'login successful': (r) => r.status === 200,
      'has idToken': (r) => r.json('idToken') !== undefined,
    });

    if (!success) {
      console.error(`Login failed: ${response.status} - ${response.body}`);
      return null;
    }

    return response.json();
  }

  /**
   * Sign up new user
   */
  signUp(email, password) {
    const payload = JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    });

    const response = http.post(this.signUpUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { scenario: 'auth', operation: 'signup' },
    });

    const success = check(response, {
      'signup successful': (r) => r.status === 200,
      'has idToken': (r) => r.json('idToken') !== undefined,
    });

    if (!success) {
      return null;
    }

    return response.json();
  }

  /**
   * Refresh auth token
   */
  refreshToken(refreshToken) {
    const payload = `grant_type=refresh_token&refresh_token=${refreshToken}`;

    const response = http.post(this.refreshUrl, payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      tags: { scenario: 'auth', operation: 'refresh' },
    });

    const success = check(response, {
      'refresh successful': (r) => r.status === 200,
      'has access_token': (r) => r.json('access_token') !== undefined,
    });

    if (!success) {
      return null;
    }

    const data = response.json();
    return {
      idToken: data.access_token || data.id_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get user info from token
   */
  getUserInfo(idToken) {
    const payload = JSON.stringify({ idToken });

    const response = http.post(
      `${FIREBASE_AUTH_URL}/accounts:lookup?key=${this.apiKey}`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { scenario: 'auth', operation: 'lookup' },
      }
    );

    if (response.status !== 200) {
      return null;
    }

    const data = response.json();
    return data.users ? data.users[0] : null;
  }
}

/**
 * Test user pool for load testing
 */
export class TestUserPool {
  constructor(users) {
    this.users = users || [];
    this.index = 0;
  }

  /**
   * Add users to pool
   */
  addUsers(users) {
    this.users.push(...users);
  }

  /**
   * Get next user (round-robin)
   */
  getNextUser() {
    if (this.users.length === 0) {
      return null;
    }
    const user = this.users[this.index % this.users.length];
    this.index++;
    return user;
  }

  /**
   * Get random user
   */
  getRandomUser() {
    if (this.users.length === 0) {
      return null;
    }
    return this.users[Math.floor(Math.random() * this.users.length)];
  }

  /**
   * Get user by index (for VU-based selection)
   */
  getUserByVU(vuId) {
    if (this.users.length === 0) {
      return null;
    }
    return this.users[vuId % this.users.length];
  }
}

/**
 * Generate test users
 */
export function generateTestUsers(count, domain = 'test.rideboard.com') {
  const users = [];
  for (let i = 1; i <= count; i++) {
    users.push({
      email: `loadtest${i}@${domain}`,
      password: `TestPass123!${i}`,
      displayName: `Load Test User ${i}`,
    });
  }
  return users;
}

/**
 * Create authenticated session
 */
export function createAuthSession(auth, email, password) {
  const authResult = auth.signIn(email, password);
  if (!authResult) {
    return null;
  }

  return {
    token: authResult.idToken,
    refreshToken: authResult.refreshToken,
    userId: authResult.localId,
    email: authResult.email,
    expiresAt: Date.now() + (parseInt(authResult.expiresIn) * 1000),
    
    isExpired() {
      return Date.now() >= this.expiresAt - 60000; // 1 min buffer
    },
    
    async refresh() {
      const result = auth.refreshToken(this.refreshToken);
      if (result) {
        this.token = result.idToken;
        this.refreshToken = result.refreshToken;
        this.expiresAt = Date.now() + (parseInt(result.expiresIn) * 1000);
      }
      return !!result;
    },
  };
}

export default {
  FirebaseAuth,
  TestUserPool,
  generateTestUsers,
  createAuthSession,
};
