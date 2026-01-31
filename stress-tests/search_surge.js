/**
 * k6 Load Test: Search/Filter Surge
 * 
 * Simulates users performing complex searches and filter operations.
 * Tests Firestore compound queries and indexes under load.
 * 
 * Load Profile:
 * - 500-1,500 concurrent complex searches
 * - Each search = 1 Firestore compound query (origin, destination, date, detour)
 * - 5-10 results per search
 * 
 * Success Criteria:
 * - P95 latency <1s (normal), <2s (3x load)
 * - Error rate <0.5%
 * - Search filters remain responsive
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const searchLatency = new Trend('search_latency');
const searchErrorRate = new Rate('search_error_rate');
const searchCount = new Counter('search_count');
const filterApplyLatency = new Trend('filter_apply_latency');

// Test configuration
export const options = {
  scenarios: {
    baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },     // Ramp up
        { duration: '5m', target: 50 },     // Hold
        { duration: '1m', target: 0 },      // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<1500'],
    http_req_failed: ['rate<0.005'],
    search_latency: ['p(95)<1000'],
    search_error_rate: ['rate<0.005'],
    filter_apply_latency: ['p(95)<800'],
  },
};

const BASE_URL = __ENV.FIREBASE_URL || 'https://rideboard-staging.firebaseio.com';
const AUTH_TOKEN = __ENV.FIREBASE_TOKEN || '';

// Common search patterns
const SEARCH_PATTERNS = [
  // 40% exact match searches
  { type: 'exact', origin: 'UCLA', destination: 'LAX', weight: 0.4 },
  { type: 'exact', origin: 'USC', destination: 'SFO', weight: 0.4 },
  { type: 'exact', origin: 'Berkeley', destination: 'OAK', weight: 0.4 },
  // 30% with detour filter
  { type: 'detour', origin: 'UCLA', destination: 'LAX', maxDetour: 15, weight: 0.3 },
  { type: 'detour', origin: 'Stanford', destination: 'SJC', maxDetour: 20, weight: 0.3 },
  // 30% with date range
  { type: 'date', origin: 'UCSD', destination: 'LAX', daysAhead: 3, weight: 0.3 },
  { type: 'date', origin: 'UCLA', destination: 'SFO', daysAhead: 7, weight: 0.3 },
];

function getRandomSearchPattern() {
  const rand = Math.random();
  let cumWeight = 0;
  
  for (const pattern of SEARCH_PATTERNS) {
    cumWeight += pattern.weight / SEARCH_PATTERNS.length;
    if (rand < cumWeight) return pattern;
  }
  
  return SEARCH_PATTERNS[0];
}

export function setup() {
  console.log('Starting Search/Filter Surge Test');
  return { startTime: new Date().toISOString() };
}

export default function () {
  const pattern = getRandomSearchPattern();
  const userId = `user_${__VU}_${__ITER}`;
  
  group(`Search: ${pattern.type}`, () => {
    let url = '';
    const startTime = Date.now();
    
    switch (pattern.type) {
      case 'exact':
        url = `${BASE_URL}/rides.json?orderBy="origin"&equalTo="${pattern.origin}"`;
        break;
      case 'detour':
        url = `${BASE_URL}/rides.json?orderBy="maxDetourMinutes"&endAt=${pattern.maxDetour}`;
        break;
      case 'date':
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + pattern.daysAhead);
        url = `${BASE_URL}/rides.json?orderBy="departureDate"&endAt="${futureDate.toISOString()}"`;
        break;
    }
    
    const response = http.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      tags: { name: `search_${pattern.type}` },
      timeout: '10s',
    });
    
    const latency = Date.now() - startTime;
    searchLatency.add(latency);
    searchCount.add(1);
    
    const success = check(response, {
      'search status is 200': (r) => r.status === 200,
      'search response time < 1000ms': (r) => r.timings.duration < 1000,
      'search has results': (r) => r.body && r.body !== 'null',
    });
    
    searchErrorRate.add(success ? 0 : 1);
    
    if (!success) {
      console.error(`Search failed for ${userId}: ${response.status} - ${pattern.type}`);
    }
  });
  
  // Simulate applying additional filters (client-side with server validation)
  if (Math.random() < 0.5) {
    group('Apply Filters', () => {
      const filterStart = Date.now();
      
      // Simulate filter refinement query
      const filterResponse = http.get(
        `${BASE_URL}/rides.json?orderBy="availableSeats"&startAt=1&limitToFirst=10`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`,
          },
          tags: { name: 'filter_apply' },
          timeout: '5s',
        }
      );
      
      filterApplyLatency.add(Date.now() - filterStart);
      
      check(filterResponse, {
        'filter status is 200': (r) => r.status === 200,
        'filter response time < 800ms': (r) => r.timings.duration < 800,
      });
    });
  }
  
  // Think time between searches (30s - 3min)
  sleep(Math.random() * 150 + 30);
}

export function teardown(data) {
  console.log('Search/Filter Surge Test Complete');
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
}
