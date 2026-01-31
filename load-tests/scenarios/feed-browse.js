/**
 * Feed Browse Scenario - Modular k6 Script
 * Simulates users scrolling the ride feed
 * 
 * Reference: load_testing_procedure.md Section 5.2
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import { randomCampus, randomFrom, randomInt } from '../utils/data-generators.js';

// Custom metrics
const feedLatency = new Trend('feed_browse_latency', true);
const feedErrors = new Counter('feed_browse_errors');
const pageLoads = new Counter('feed_page_loads');

/**
 * Feed Browse Scenario
 * 
 * @param {Object} options Configuration options
 * @param {string} options.campusId - Campus to filter by (default: random)
 * @param {number} options.pageSize - Items per page (default: 20)
 * @param {number} options.scrollRate - % of users actively scrolling (default: 0.2)
 * @param {number} options.pauseMin - Min pause between actions (default: 5s)
 * @param {number} options.pauseMax - Max pause between actions (default: 35s)
 * @param {number} options.maxPages - Max pages to scroll (default: 10)
 */
export function feedBrowseScenario(options = {}) {
  const {
    campusId = null,
    pageSize = 20,
    scrollRate = 0.2,
    pauseMin = 5,
    pauseMax = 35,
    maxPages = 10,
  } = options;

  return function () {
    const campus = campusId || randomCampus().id;
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';

    // Decide: 20% scroll actively, 80% idle (realistic behavior)
    const isActiveUser = Math.random() < scrollRate;

    if (!isActiveUser) {
      // Idle user: load feed once, then idle
      if (__ITER === 0) {
        fetchFeedPage(baseUrl, campus, pageSize, 0, authToken);
      }
      sleep(randomInt(pauseMin, pauseMax));
      return;
    }

    // Active user: scroll through pages
    group('Feed Browse', () => {
      // Load a random page (simulating scroll position)
      const pageNum = randomInt(0, maxPages - 1);
      fetchFeedPage(baseUrl, campus, pageSize, pageNum, authToken);
      
      // Simulate reading time
      sleep(randomInt(3, 10));
      
      // Maybe load next page
      if (Math.random() < 0.3) {
        fetchFeedPage(baseUrl, campus, pageSize, pageNum + 1, authToken);
      }
    });

    // Pause before next iteration
    sleep(randomInt(pauseMin, pauseMax));
  };
}

/**
 * Fetch a feed page with metrics collection
 */
function fetchFeedPage(baseUrl, campusId, pageSize, pageNum, authToken) {
  const url = `${baseUrl}/rides?campus=${campusId}&page=${pageNum}&limit=${pageSize}`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : '',
    },
    tags: {
      scenario: 'feed_browse',
      operation: 'list',
      page: pageNum.toString(),
    },
  };

  const startTime = Date.now();
  const response = http.get(url, params);
  const latency = Date.now() - startTime;

  // Record metrics
  feedLatency.add(latency);
  pageLoads.add(1);

  // Validate response
  const checks = check(response, {
    'status is 200': (r) => r.status === 200,
    'has rides array': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body.rides) || Array.isArray(body);
      } catch {
        return false;
      }
    },
    'latency < 800ms': () => latency < 800,
    'latency < 2000ms': () => latency < 2000,
  });

  if (!checks) {
    feedErrors.add(1);
    if (__ENV.DEBUG === 'true') {
      console.error(`Feed error: ${response.status} (${latency}ms)`);
    }
  }

  return response;
}

/**
 * Fetch single ride details (for correlation tests)
 */
export function fetchRideDetails(baseUrl, rideId, authToken) {
  const url = `${baseUrl}/rides/${rideId}`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : '',
    },
    tags: {
      scenario: 'feed_browse',
      operation: 'detail',
    },
  };

  const startTime = Date.now();
  const response = http.get(url, params);
  const latency = Date.now() - startTime;

  feedLatency.add(latency);

  check(response, {
    'ride detail status 200': (r) => r.status === 200,
    'has ride data': (r) => {
      try {
        return r.json().id !== undefined;
      } catch {
        return false;
      }
    },
  });

  return response;
}

/**
 * Scroll simulation with realistic behavior
 */
export function simulateScrollSession(options = {}) {
  const {
    baseUrl = __ENV.API_BASE_URL,
    campusId = randomCampus().id,
    authToken = __ENV.AUTH_TOKEN || '',
    maxScrolls = 5,
    readTimeMin = 2,
    readTimeMax = 8,
  } = options;

  return function () {
    group('Scroll Session', () => {
      let lastCursor = null;

      for (let i = 0; i < maxScrolls; i++) {
        // Fetch page
        const url = lastCursor
          ? `${baseUrl}/rides?campus=${campusId}&cursor=${lastCursor}&limit=20`
          : `${baseUrl}/rides?campus=${campusId}&limit=20`;

        const response = http.get(url, {
          headers: {
            'Authorization': authToken ? `Bearer ${authToken}` : '',
          },
          tags: { scenario: 'feed_browse', scroll: i.toString() },
        });

        if (response.status === 200) {
          try {
            const data = response.json();
            lastCursor = data.nextCursor || data.lastVisible;
            
            // Maybe click on a ride (10% chance)
            if (Math.random() < 0.1 && data.rides?.length > 0) {
              const ride = randomFrom(data.rides);
              fetchRideDetails(baseUrl, ride.id, authToken);
            }
          } catch {
            // Parse error, continue
          }
        }

        // Reading time
        sleep(randomInt(readTimeMin, readTimeMax));

        // 20% chance to stop scrolling
        if (Math.random() < 0.2) {
          break;
        }
      }
    });
  };
}

// Default export for standalone usage
export default feedBrowseScenario();

// Named exports for composition
export { feedErrors, feedLatency, pageLoads };

