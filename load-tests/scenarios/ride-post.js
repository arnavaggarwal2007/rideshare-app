/**
 * Ride Post Scenario - Modular k6 Script
 * Simulates users creating new ride offers
 * 
 * Reference: load_testing_procedure.md Section 4.2 (LT-SCN-003, LT-SCN-008)
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import {
    randomBool,
    randomInt,
    randomRide
} from '../utils/data-generators.js';

// Custom metrics
const postLatency = new Trend('ride_post_latency', true);
const postErrors = new Counter('ride_post_errors');
const postsCreated = new Counter('rides_created');
const writesCount = new Counter('firestore_writes');

// Data integrity tracking
const postedRides = new Map(); // Track for verification

/**
 * Ride Post Scenario
 * 
 * @param {Object} options Configuration options
 * @param {boolean} options.verifyCreation - Whether to verify ride was created (default: true)
 * @param {number} options.pauseMin - Min pause between posts (default: 30s)
 * @param {number} options.pauseMax - Max pause between posts (default: 120s)
 * @param {boolean} options.includeStops - Include intermediate stops (default: random)
 */
export function ridePostScenario(options = {}) {
  const {
    verifyCreation = true,
    pauseMin = 30,
    pauseMax = 120,
    includeStops = null,
  } = options;

  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';
    const userId = __ENV.USER_ID || `test-user-${__VU}`;

    group('Post Ride', () => {
      // Generate ride data
      const ride = generateRidePayload(userId, includeStops);
      
      // Create ride
      const response = createRide(baseUrl, ride, authToken);

      // Verify creation if enabled
      if (verifyCreation && response.status === 201) {
        sleep(1); // Wait for propagation
        verifyRideCreated(baseUrl, response, authToken);
      }
    });

    // Longer pause for write scenarios (protect quotas)
    sleep(randomInt(pauseMin, pauseMax));
  };
}

/**
 * Generate ride payload
 */
function generateRidePayload(userId, includeStops = null) {
  const ride = randomRide(userId);
  
  // Handle intermediate stops
  if (includeStops === false) {
    ride.intermediateStops = [];
  } else if (includeStops === null) {
    // Random decision
    if (randomBool(0.7)) {
      ride.intermediateStops = [];
    }
  }

  // Clean up for API format
  return {
    origin: ride.origin,
    destination: ride.destination,
    intermediateStops: ride.intermediateStops,
    departureDateTime: ride.departureDateTime,
    seatsAvailable: ride.seatsAvailable,
    pricePerSeat: ride.pricePerSeat,
    allowDetour: ride.allowDetour,
    detourRadius: ride.detourRadius,
    notes: ride.notes,
  };
}

/**
 * Create ride via API
 */
function createRide(baseUrl, rideData, authToken) {
  const url = `${baseUrl}/rides`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : '',
    },
    tags: {
      scenario: 'post_ride',
      operation: 'create',
    },
  };

  const startTime = Date.now();
  const response = http.post(url, JSON.stringify(rideData), params);
  const latency = Date.now() - startTime;

  // Record metrics
  postLatency.add(latency);
  
  // Validate response
  const checks = check(response, {
    'ride created (201)': (r) => r.status === 201,
    'has ride id': (r) => {
      try {
        const body = r.json();
        return body.id !== undefined || body.rideId !== undefined;
      } catch {
        return false;
      }
    },
    'post latency < 1500ms': () => latency < 1500,
    'post latency < 3000ms': () => latency < 3000,
  });

  if (response.status === 201) {
    postsCreated.add(1);
    writesCount.add(1);
    
    // Track for data integrity verification
    try {
      const created = response.json();
      const rideId = created.id || created.rideId;
      if (rideId) {
        postedRides.set(rideId, {
          ...rideData,
          createdAt: Date.now(),
        });
      }
    } catch {
      // Parse error
    }
  } else {
    postErrors.add(1);
    if (__ENV.DEBUG === 'true') {
      console.error(`Post error: ${response.status} (${latency}ms) - ${response.body}`);
    }
  }

  return response;
}

/**
 * Verify ride was created correctly
 */
function verifyRideCreated(baseUrl, createResponse, authToken) {
  try {
    const created = createResponse.json();
    const rideId = created.id || created.rideId;
    
    if (!rideId) return;

    const response = http.get(`${baseUrl}/rides/${rideId}`, {
      headers: {
        'Authorization': authToken ? `Bearer ${authToken}` : '',
      },
      tags: { scenario: 'post_ride', operation: 'verify' },
    });

    const verified = check(response, {
      'ride exists after creation': (r) => r.status === 200,
      'ride data matches': (r) => {
        try {
          const fetched = r.json();
          const original = postedRides.get(rideId);
          if (!original) return true; // Can't verify without original
          
          // Basic field verification
          return fetched.origin?.id === original.origin?.id &&
                 fetched.destination?.id === original.destination?.id;
        } catch {
          return false;
        }
      },
    });

    if (!verified && __ENV.DEBUG === 'true') {
      console.error(`Verification failed for ride ${rideId}`);
    }
  } catch {
    // Verification error
  }
}

/**
 * Update ride scenario
 */
export function updateRideScenario(options = {}) {
  const {
    existingRideId = null,
  } = options;

  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';
    
    group('Update Ride', () => {
      const rideId = existingRideId || __ENV.RIDE_ID;
      if (!rideId) {
        console.warn('No ride ID for update scenario');
        return;
      }

      const updates = {
        seatsAvailable: randomInt(1, 4),
        pricePerSeat: randomInt(10, 50),
        notes: `Updated at ${new Date().toISOString()}`,
      };

      const startTime = Date.now();
      const response = http.patch(
        `${baseUrl}/rides/${rideId}`,
        JSON.stringify(updates),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : '',
          },
          tags: { scenario: 'post_ride', operation: 'update' },
        }
      );
      const latency = Date.now() - startTime;

      postLatency.add(latency);
      writesCount.add(1);

      check(response, {
        'ride updated (200)': (r) => r.status === 200,
        'update latency < 1000ms': () => latency < 1000,
      });
    });
  };
}

/**
 * Delete ride scenario
 */
export function deleteRideScenario(options = {}) {
  const {
    rideId = null,
  } = options;

  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';
    
    group('Delete Ride', () => {
      const id = rideId || __ENV.RIDE_ID;
      if (!id) {
        console.warn('No ride ID for delete scenario');
        return;
      }

      const startTime = Date.now();
      const response = http.del(`${baseUrl}/rides/${id}`, null, {
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
        },
        tags: { scenario: 'post_ride', operation: 'delete' },
      });
      const latency = Date.now() - startTime;

      postLatency.add(latency);
      writesCount.add(1);

      check(response, {
        'ride deleted (200/204)': (r) => r.status === 200 || r.status === 204,
      });

      // Remove from tracking
      postedRides.delete(id);
    });
  };
}

/**
 * Full ride lifecycle scenario
 */
export function rideLifecycleScenario() {
  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';
    const userId = __ENV.USER_ID || `test-user-${__VU}`;

    group('Ride Lifecycle', () => {
      // 1. Create ride
      const ride = generateRidePayload(userId);
      const createResponse = createRide(baseUrl, ride, authToken);
      
      if (createResponse.status !== 201) {
        return; // Can't continue lifecycle
      }

      let rideId;
      try {
        const created = createResponse.json();
        rideId = created.id || created.rideId;
      } catch {
        return;
      }

      sleep(2);

      // 2. Update ride
      const updates = { seatsAvailable: randomInt(1, 3) };
      http.patch(`${baseUrl}/rides/${rideId}`, JSON.stringify(updates), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
        },
        tags: { scenario: 'post_ride', operation: 'update' },
      });
      writesCount.add(1);

      sleep(2);

      // 3. View ride (verify updates)
      const viewResponse = http.get(`${baseUrl}/rides/${rideId}`, {
        headers: { 'Authorization': authToken ? `Bearer ${authToken}` : '' },
        tags: { scenario: 'post_ride', operation: 'view' },
      });

      check(viewResponse, {
        'updated ride retrieved': (r) => r.status === 200,
      });

      sleep(2);

      // 4. Delete ride (cleanup - optional for stress tests)
      if (__ENV.CLEANUP === 'true') {
        http.del(`${baseUrl}/rides/${rideId}`, null, {
          headers: { 'Authorization': authToken ? `Bearer ${authToken}` : '' },
          tags: { scenario: 'post_ride', operation: 'delete' },
        });
        writesCount.add(1);
      }
    });
  };
}

// Default export for standalone usage
export default ridePostScenario();

// Named exports
export { postedRides, postErrors, postLatency, postsCreated, writesCount };

