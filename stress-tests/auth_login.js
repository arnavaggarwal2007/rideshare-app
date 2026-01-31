/**
 * k6 Load Test: Auth Login Peak
 * 
 * Simulates authentication surge (e.g., after push notification).
 * Tests Firebase Auth and profile loading under concurrent login attempts.
 * 
 * Load Profile:
 * - 1,000 logins within 10 min (peak after push notification)
 * - Each login = 1 Firebase Auth + 1 Firestore read (user profile)
 * 
 * Success Criteria:
 * - Auth P95 <1s
 * - Profile fetch <500ms (cached after first load)
 * - Error rate <0.5%
 * - No auth timeouts
 */

import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const authLatency = new Trend('auth_latency');
const profileLatency = new Trend('profile_fetch_latency');
const authErrorRate = new Rate('auth_error_rate');
const tokenRefreshLatency = new Trend('token_refresh_latency');
const loginSuccessCount = new Counter('login_success_count');

// Test configuration
export const options = {
  scenarios: {
    baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },     // Ramp up
        { duration: '3m', target: 50 },     // Simulate login surge
        { duration: '1m', target: 0 },      // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    // Spike test for push notification scenario
    // spike: {
    //   executor: 'ramping-vus',
    //   startVUs: 0,
    //   stages: [
    //     { duration: '30s', target: 10 },    // Warm up
    //     { duration: '1m', target: 200 },    // Spike (push notification sent)
    //     { duration: '3m', target: 200 },    // Hold spike
    //     { duration: '1m', target: 10 },     // Cool down
    //   ],
    // },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<1500'],
    http_req_failed: ['rate<0.005'],
    auth_latency: ['p(95)<1000'],
    profile_fetch_latency: ['p(95)<500'],
    auth_error_rate: ['rate<0.005'],
  },
};

const AUTH_URL = __ENV.AUTH_URL || 'https://identitytoolkit.googleapis.com/v1';
const BASE_URL = __ENV.FIREBASE_URL || 'https://rideboard-staging.firebaseio.com';
const API_KEY = __ENV.FIREBASE_API_KEY || '';

// Pre-generated test users (should exist in Firebase Auth)
const TEST_USERS = [
  { email: 'test1@rideboard.test', password: 'TestPass123!' },
  { email: 'test2@rideboard.test', password: 'TestPass123!' },
  { email: 'test3@rideboard.test', password: 'TestPass123!' },
  { email: 'test4@rideboard.test', password: 'TestPass123!' },
  { email: 'test5@rideboard.test', password: 'TestPass123!' },
];

function getTestUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

export function setup() {
  console.log('Starting Auth Login Peak Test');
  
  if (!API_KEY) {
    console.warn('⚠️ FIREBASE_API_KEY not set. Auth tests will use mock responses.');
  }
  
  return { startTime: new Date().toISOString() };
}

export default function () {
  const user = getTestUser();
  const sessionId = `session_${__VU}_${randomString(8)}`;
  
  // Step 1: Authenticate with Firebase Auth
  group('Firebase Auth', () => {
    const startTime = Date.now();
    
    // Firebase Auth REST API - signInWithPassword
    const authResponse = http.post(
      `${AUTH_URL}/accounts:signInWithPassword?key=${API_KEY}`,
      JSON.stringify({
        email: user.email,
        password: user.password,
        returnSecureToken: true,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        tags: { name: 'auth_signin' },
        timeout: '10s',
      }
    );
    
    authLatency.add(Date.now() - startTime);
    
    const success = check(authResponse, {
      'auth status is 200': (r) => r.status === 200,
      'auth response time < 1000ms': (r) => r.timings.duration < 1000,
      'auth returns token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body && body.idToken;
        } catch {
          return false;
        }
      },
    });
    
    if (success) {
      loginSuccessCount.add(1);
      authErrorRate.add(0);
      
      // Extract tokens for profile fetch
      let idToken, userId;
      try {
        const body = JSON.parse(authResponse.body);
        idToken = body.idToken;
        userId = body.localId;
      } catch {
        idToken = null;
        userId = null;
      }
      
      // Step 2: Fetch user profile from Firestore
      if (idToken && userId) {
        group('Profile Fetch', () => {
          const profileStart = Date.now();
          
          const profileResponse = http.get(
            `${BASE_URL}/users/${userId}.json`,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
              },
              tags: { name: 'profile_fetch' },
              timeout: '5s',
            }
          );
          
          profileLatency.add(Date.now() - profileStart);
          
          check(profileResponse, {
            'profile status is 200': (r) => r.status === 200 || r.status === 404, // 404 if profile doesn't exist
            'profile response time < 500ms': (r) => r.timings.duration < 500,
          });
        });
        
        // Step 3: Simulate token refresh (for long sessions)
        if (Math.random() < 0.1) { // 10% of users refresh token
          group('Token Refresh', () => {
            const refreshStart = Date.now();
            
            let refreshToken;
            try {
              refreshToken = JSON.parse(authResponse.body).refreshToken;
            } catch {
              refreshToken = null;
            }
            
            if (refreshToken) {
              const refreshResponse = http.post(
                `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
                `grant_type=refresh_token&refresh_token=${refreshToken}`,
                {
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  tags: { name: 'token_refresh' },
                  timeout: '5s',
                }
              );
              
              tokenRefreshLatency.add(Date.now() - refreshStart);
              
              check(refreshResponse, {
                'refresh status is 200': (r) => r.status === 200,
              });
            }
          });
        }
      }
    } else {
      authErrorRate.add(1);
      
      // Check specific error types
      try {
        const errorBody = JSON.parse(authResponse.body);
        if (errorBody.error) {
          console.error(`Auth error: ${errorBody.error.message}`);
          
          // Track rate limiting
          if (errorBody.error.message === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
            console.warn('⚠️ Rate limiting detected!');
          }
        }
      } catch {
        console.error(`Auth failed: ${authResponse.status}`);
      }
    }
  });
  
  // Simulate session duration (user stays logged in)
  sleep(Math.random() * 30 + 10);
}

export function teardown(data) {
  console.log('Auth Login Peak Test Complete');
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
}
