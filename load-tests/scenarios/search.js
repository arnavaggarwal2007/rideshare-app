/**
 * Search Scenario - Modular k6 Script
 * Simulates users searching for rides with various filters
 * 
 * Reference: load_testing_procedure.md Section 4.2 (LT-SCN-002)
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import {
    DESTINATIONS,
    randomDateRange,
    randomFrom,
    randomInt,
    randomRoute,
    randomSearchQuery
} from '../utils/data-generators.js';

// Custom metrics
const searchLatency = new Trend('search_latency', true);
const searchErrors = new Counter('search_errors');
const searchCount = new Counter('search_count');

// Search patterns distribution
const SEARCH_PATTERNS = {
  EXACT: 0.4,       // 40% exact origin-destination
  DETOUR: 0.3,      // 30% with detour radius
  DATE_RANGE: 0.2,  // 20% date range filter
  COMPLEX: 0.1,     // 10% multiple filters
};

/**
 * Search Scenario
 * 
 * @param {Object} options Configuration options
 * @param {string} options.searchPattern - 'exact', 'detour', 'date', 'complex', or 'random'
 * @param {number} options.pauseMin - Min pause between searches (default: 10s)
 * @param {number} options.pauseMax - Max pause between searches (default: 30s)
 * @param {boolean} options.clickResults - Whether to click on search results (default: true)
 */
export function searchScenario(options = {}) {
  const {
    searchPattern = 'random',
    pauseMin = 10,
    pauseMax = 30,
    clickResults = true,
  } = options;

  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';

    group('Search', () => {
      // Select search pattern
      const pattern = searchPattern === 'random' 
        ? selectRandomPattern() 
        : searchPattern;

      // Build search query based on pattern
      const query = buildSearchQuery(pattern);
      
      // Execute search
      const response = executeSearch(baseUrl, query, authToken);

      // Optionally click on results
      if (clickResults && response.status === 200) {
        maybeClickResult(baseUrl, response, authToken);
      }
    });

    // Pause before next search
    sleep(randomInt(pauseMin, pauseMax));
  };
}

/**
 * Select search pattern based on distribution
 */
function selectRandomPattern() {
  const rand = Math.random();
  let cumulative = 0;

  for (const [pattern, probability] of Object.entries(SEARCH_PATTERNS)) {
    cumulative += probability;
    if (rand < cumulative) {
      return pattern.toLowerCase();
    }
  }
  return 'exact';
}

/**
 * Build search query based on pattern
 */
function buildSearchQuery(pattern) {
  const route = randomRoute();
  
  switch (pattern) {
    case 'exact':
      // Simple origin-destination search
      return {
        origin: route.origin.id,
        destination: route.destination.id,
      };

    case 'detour':
      // Search with detour radius
      return {
        origin: route.origin.id,
        destination: route.destination.id,
        allowDetour: true,
        detourRadius: randomInt(5, 20),
        coordinates: {
          originLat: route.origin.lat,
          originLng: route.origin.lng,
          destLat: route.destination.lat,
          destLng: route.destination.lng,
        },
      };

    case 'date':
    case 'date_range':
      // Search with date range
      const dateRange = randomDateRange();
      return {
        origin: route.origin.id,
        destination: route.destination.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };

    case 'complex':
      // Multiple filters
      const complexDateRange = randomDateRange();
      return {
        origin: route.origin.id,
        destination: route.destination.id,
        startDate: complexDateRange.startDate,
        endDate: complexDateRange.endDate,
        minSeats: randomInt(1, 2),
        maxPrice: randomInt(20, 50),
        allowDetour: Math.random() < 0.3,
      };

    default:
      return randomSearchQuery();
  }
}

/**
 * Execute search request
 */
function executeSearch(baseUrl, query, authToken) {
  const url = `${baseUrl}/rides/search`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : '',
    },
    tags: {
      scenario: 'search',
      pattern: query.allowDetour ? 'detour' : (query.startDate ? 'date' : 'exact'),
    },
  };

  const startTime = Date.now();
  const response = http.post(url, JSON.stringify(query), params);
  const latency = Date.now() - startTime;

  // Record metrics
  searchLatency.add(latency);
  searchCount.add(1);

  // Validate response
  const checks = check(response, {
    'search status 200': (r) => r.status === 200,
    'has results array': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body.rides) || Array.isArray(body.results) || Array.isArray(body);
      } catch {
        return false;
      }
    },
    'search latency < 1000ms': () => latency < 1000,
    'search latency < 2000ms': () => latency < 2000,
  });

  if (!checks) {
    searchErrors.add(1);
    if (__ENV.DEBUG === 'true') {
      console.error(`Search error: ${response.status} (${latency}ms) - Query: ${JSON.stringify(query)}`);
    }
  }

  return response;
}

/**
 * Maybe click on a search result (simulate user behavior)
 */
function maybeClickResult(baseUrl, searchResponse, authToken) {
  if (Math.random() > 0.3) return; // 30% chance to click

  try {
    const data = searchResponse.json();
    const rides = data.rides || data.results || data;
    
    if (Array.isArray(rides) && rides.length > 0) {
      const ride = randomFrom(rides);
      const rideId = ride.id || ride.rideId;
      
      if (rideId) {
        sleep(randomInt(1, 3)); // Reading results time
        
        const detailUrl = `${baseUrl}/rides/${rideId}`;
        const response = http.get(detailUrl, {
          headers: {
            'Authorization': authToken ? `Bearer ${authToken}` : '',
          },
          tags: { scenario: 'search', operation: 'detail' },
        });

        check(response, {
          'ride detail loaded': (r) => r.status === 200,
        });
      }
    }
  } catch {
    // Parse error, skip click
  }
}

/**
 * Autocomplete search simulation
 */
export function autocompleteScenario(options = {}) {
  const {
    minChars = 2,
    maxChars = 10,
    typingDelay = 200, // ms between keystrokes
  } = options;

  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';
    
    group('Autocomplete', () => {
      const destination = randomFrom(DESTINATIONS);
      const searchTerm = destination.name.substring(0, randomInt(minChars, maxChars));
      
      // Simulate typing
      for (let i = minChars; i <= searchTerm.length; i++) {
        const partial = searchTerm.substring(0, i);
        
        const response = http.get(
          `${baseUrl}/locations/autocomplete?q=${encodeURIComponent(partial)}`,
          {
            headers: {
              'Authorization': authToken ? `Bearer ${authToken}` : '',
            },
            tags: { scenario: 'search', operation: 'autocomplete' },
          }
        );

        check(response, {
          'autocomplete response': (r) => r.status === 200 || r.status === 204,
        });

        sleep(typingDelay / 1000); // Convert to seconds
      }
    });
  };
}

/**
 * Filter change simulation
 */
export function filterChangeScenario(options = {}) {
  const {
    filterChanges = 3,
    pauseBetweenChanges = 2,
  } = options;

  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';
    
    group('Filter Changes', () => {
      const route = randomRoute();
      let query = {
        origin: route.origin.id,
        destination: route.destination.id,
      };

      // Initial search
      executeSearch(baseUrl, query, authToken);

      // Apply filter changes
      for (let i = 0; i < filterChanges; i++) {
        sleep(pauseBetweenChanges);

        // Randomly add/change a filter
        const filterType = randomInt(1, 4);
        switch (filterType) {
          case 1:
            query.minSeats = randomInt(1, 3);
            break;
          case 2:
            query.maxPrice = randomInt(15, 50);
            break;
          case 3:
            const dateRange = randomDateRange();
            query.startDate = dateRange.startDate;
            break;
          case 4:
            query.allowDetour = !query.allowDetour;
            break;
        }

        executeSearch(baseUrl, query, authToken);
      }
    });
  };
}

// Default export for standalone usage
export default searchScenario();

// Named exports for composition
export { SEARCH_PATTERNS, searchCount, searchErrors, searchLatency };

