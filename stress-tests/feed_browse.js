/**
 * k6 Load Test: Feed Browse Storm
 * 
 * Simulates users scrolling the infinite feed of ride posts.
 * Tests Firestore paginated queries under load.
 * 
 * Load Profile:
 * - 1,000-3,000 concurrent users scrolling
 * - 20% refresh feed every 30s, 80% idle in feed
 * - Each scroll = 1 Firestore read (paginated, 10-20 docs)
 * 
 * Success Criteria:
 * - P95 latency <800ms (normal), <2s (3x load)
 * - Error rate <0.5% (normal), <5% (3x load)
 * - No crashes
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const feedLoadTime = new Trend('feed_load_time');
const feedErrorRate = new Rate('feed_error_rate');
const scrollLatency = new Trend('scroll_latency');

// Test configuration
export const options = {
  scenarios: {
    // Baseline test (1x load)
    baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },    // Ramp up to 100 users
        { duration: '5m', target: 100 },    // Hold at 100 users
        { duration: '1m', target: 0 },      // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    // Stress test (2x load) - uncomment to run
    // stress: {
    //   executor: 'ramping-vus',
    //   startVUs: 0,
    //   stages: [
    //     { duration: '2m', target: 200 },
    //     { duration: '10m', target: 200 },
    //     { duration: '2m', target: 0 },
    //   ],
    //   gracefulRampDown: '30s',
    // },
    // Spike test - uncomment to run
    // spike: {
    //   executor: 'ramping-vus',
    //   startVUs: 50,
    //   stages: [
    //     { duration: '1m', target: 50 },     // Warm up
    //     { duration: '30s', target: 300 },   // Spike!
    //     { duration: '3m', target: 300 },    // Hold spike
    //     { duration: '1m', target: 50 },     // Return to normal
    //   ],
    // },
  },
  thresholds: {
    // P95 latency should be under 800ms
    http_req_duration: ['p(95)<800', 'p(99)<1200'],
    // Error rate should be under 0.5%
    http_req_failed: ['rate<0.005'],
    // Custom metrics
    feed_load_time: ['p(95)<800'],
    feed_error_rate: ['rate<0.005'],
    scroll_latency: ['p(95)<500'],
  },
};

// Firebase configuration (set via environment variables)
const BASE_URL = __ENV.FIREBASE_URL || 'https://rideboard-staging.firebaseio.com';
const AUTH_TOKEN = __ENV.FIREBASE_TOKEN || '';

// Simulated campus IDs for testing
const CAMPUS_IDS = ['UCLA', 'USC', 'Berkeley', 'Stanford', 'UCSD'];

/**
 * Setup function - runs once at the start
 */
export function setup() {
  console.log('Starting Feed Browse Load Test');
  console.log(`Target URL: ${BASE_URL}`);
  
  // Verify connectivity
  const healthCheck = http.get(`${BASE_URL}/.json?shallow=true`, {
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
    timeout: '10s',
  });
  
  if (healthCheck.status !== 200) {
    console.warn(`Health check returned status ${healthCheck.status}`);
  }
  
  return { startTime: new Date().toISOString() };
}

/**
 * Main test function - executed for each virtual user
 */
export default function (data) {
  const campusId = CAMPUS_IDS[Math.floor(Math.random() * CAMPUS_IDS.length)];
  const userId = `user_${__VU}_${__ITER}`;
  
  group('Feed Load', () => {
    // Initial feed load
    const startTime = Date.now();
    const feedResponse = http.get(
      `${BASE_URL}/rides.json?orderBy="campusId"&equalTo="${campusId}"&limitToFirst=20`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
        tags: { name: 'feed_initial_load' },
        timeout: '10s',
      }
    );
    
    const loadTime = Date.now() - startTime;
    feedLoadTime.add(loadTime);
    
    const success = check(feedResponse, {
      'feed status is 200': (r) => r.status === 200,
      'feed response time < 800ms': (r) => r.timings.duration < 800,
      'feed has data': (r) => r.body && r.body.length > 2,
    });
    
    if (!success) {
      feedErrorRate.add(1);
      console.error(`Feed load failed for ${userId}: ${feedResponse.status}`);
    } else {
      feedErrorRate.add(0);
    }
  });
  
  // Simulate user behavior: 20% actively scrolling, 80% idle
  const isActiveUser = Math.random() < 0.2;
  
  if (isActiveUser) {
    group('Feed Scroll', () => {
      // Simulate 3-5 scroll actions
      const scrollCount = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < scrollCount; i++) {
        const pageNum = i + 1;
        const scrollStart = Date.now();
        
        const scrollResponse = http.get(
          `${BASE_URL}/rides.json?orderBy="campusId"&equalTo="${campusId}"&limitToFirst=20&startAt=${pageNum * 20}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: { name: 'feed_scroll' },
            timeout: '5s',
          }
        );
        
        scrollLatency.add(Date.now() - scrollStart);
        
        check(scrollResponse, {
          'scroll status is 200': (r) => r.status === 200,
          'scroll response time < 500ms': (r) => r.timings.duration < 500,
        });
        
        // Brief pause between scrolls (200-500ms)
        sleep(Math.random() * 0.3 + 0.2);
      }
    });
  }
  
  // Random wait before next iteration (simulates user think time)
  // Active users: 5-15 seconds, Idle users: 20-40 seconds
  const thinkTime = isActiveUser 
    ? Math.random() * 10 + 5 
    : Math.random() * 20 + 20;
  sleep(thinkTime);
}

/**
 * Teardown function - runs once at the end
 */
export function teardown(data) {
  console.log('Feed Browse Load Test Complete');
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
}
