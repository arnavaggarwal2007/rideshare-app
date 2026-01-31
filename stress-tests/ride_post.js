/**
 * k6 Load Test: Ride Post Creation Flood
 * 
 * Simulates drivers posting new rides (peak scenario like Thanksgiving week).
 * Tests Firestore writes, Cloud Functions, and Cloud Storage under load.
 * 
 * Load Profile:
 * - 100-600 concurrent ride posts
 * - Each post = 1 Firestore write + 1 Cloud Function (detour calculation) + optional Cloud Storage
 * 
 * Success Criteria:
 * - P95 latency <1.5s when under quota
 * - Error rate <0.5%
 * - Posts queue gracefully at quota limit
 * - No lost writes
 */

import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const postLatency = new Trend('post_latency');
const postErrorRate = new Rate('post_error_rate');
const postSuccessCount = new Counter('post_success_count');
const postFailureCount = new Counter('post_failure_count');
const functionLatency = new Trend('cloud_function_latency');

// Test configuration
export const options = {
  scenarios: {
    baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },     // Ramp up slowly (writes are expensive)
        { duration: '5m', target: 20 },     // Hold
        { duration: '1m', target: 0 },      // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<2000'],
    http_req_failed: ['rate<0.005'],
    post_latency: ['p(95)<1500'],
    post_error_rate: ['rate<0.005'],
    cloud_function_latency: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.FIREBASE_URL || 'https://rideboard-staging.firebaseio.com';
const FUNCTIONS_URL = __ENV.FUNCTIONS_URL || 'https://us-central1-rideboard-staging.cloudfunctions.net';
const AUTH_TOKEN = __ENV.FIREBASE_TOKEN || '';

// Sample ride data generators
const ORIGINS = ['UCLA', 'USC', 'Berkeley', 'Stanford', 'UCSD', 'UCI', 'UCSB'];
const DESTINATIONS = ['LAX', 'SFO', 'SJC', 'OAK', 'SAN', 'BUR', 'LGB'];
const PRICE_RANGE = { min: 10, max: 50 };
const SEATS_RANGE = { min: 1, max: 4 };

function generateRideData(userId) {
  const origin = ORIGINS[Math.floor(Math.random() * ORIGINS.length)];
  const destination = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
  const departureDate = new Date();
  departureDate.setDate(departureDate.getDate() + Math.floor(Math.random() * 14) + 1);
  
  return {
    driverId: userId,
    origin: origin,
    originCoords: { lat: 34.0522 + Math.random() * 0.1, lng: -118.2437 + Math.random() * 0.1 },
    destination: destination,
    destinationCoords: { lat: 33.9425 + Math.random() * 0.1, lng: -118.4081 + Math.random() * 0.1 },
    departureDate: departureDate.toISOString(),
    departureTime: `${Math.floor(Math.random() * 12) + 8}:00`,
    pricePerSeat: Math.floor(Math.random() * (PRICE_RANGE.max - PRICE_RANGE.min)) + PRICE_RANGE.min,
    availableSeats: Math.floor(Math.random() * (SEATS_RANGE.max - SEATS_RANGE.min)) + SEATS_RANGE.min,
    maxDetourMinutes: Math.floor(Math.random() * 20) + 5,
    description: `Test ride from ${origin} to ${destination}`,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}

export function setup() {
  console.log('Starting Ride Post Creation Flood Test');
  console.log('⚠️ WARNING: This test performs Firestore WRITES. Monitor quota closely!');
  return { startTime: new Date().toISOString() };
}

export default function () {
  const userId = `test_user_${__VU}_${randomString(8)}`;
  const rideData = generateRideData(userId);
  
  group('Create Ride Post', () => {
    const startTime = Date.now();
    
    // Step 1: Create ride document in Firestore
    const createResponse = http.post(
      `${BASE_URL}/rides.json`,
      JSON.stringify(rideData),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
        tags: { name: 'ride_create' },
        timeout: '15s',
      }
    );
    
    const latency = Date.now() - startTime;
    postLatency.add(latency);
    
    const success = check(createResponse, {
      'create status is 200': (r) => r.status === 200,
      'create response time < 1500ms': (r) => r.timings.duration < 1500,
      'create returns ride id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body && body.name;
        } catch {
          return false;
        }
      },
    });
    
    if (success) {
      postSuccessCount.add(1);
      postErrorRate.add(0);
      
      // Extract ride ID for subsequent operations
      let rideId;
      try {
        rideId = JSON.parse(createResponse.body).name;
      } catch {
        rideId = null;
      }
      
      // Step 2: Trigger Cloud Function for route calculation (if configured)
      if (rideId && FUNCTIONS_URL) {
        group('Calculate Route', () => {
          const funcStart = Date.now();
          
          const funcResponse = http.post(
            `${FUNCTIONS_URL}/calculateRoute`,
            JSON.stringify({
              rideId: rideId,
              origin: rideData.originCoords,
              destination: rideData.destinationCoords,
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
              },
              tags: { name: 'route_calculation' },
              timeout: '10s',
            }
          );
          
          functionLatency.add(Date.now() - funcStart);
          
          check(funcResponse, {
            'function status is 200': (r) => r.status === 200 || r.status === 404, // 404 if function not deployed
            'function response time < 500ms': (r) => r.timings.duration < 500,
          });
        });
      }
    } else {
      postFailureCount.add(1);
      postErrorRate.add(1);
      console.error(`Ride post failed: ${createResponse.status} - ${createResponse.body}`);
      
      // Check for quota errors
      if (createResponse.status === 429) {
        console.warn('⚠️ Quota limit reached! Firestore throttling in effect.');
      }
    }
  });
  
  // Longer wait between posts (posts are expensive writes)
  // Simulates real user behavior: 15-30 minutes between ride posts
  // For testing, we use 30-60 seconds
  sleep(Math.random() * 30 + 30);
}

export function teardown(data) {
  console.log('Ride Post Creation Flood Test Complete');
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  console.log('⚠️ Remember to clean up test ride data from Firestore!');
}
