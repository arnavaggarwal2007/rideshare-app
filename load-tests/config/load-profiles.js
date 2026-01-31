/**
 * Load Profiles for RideBoard Load Tests
 * Industry-standard ramp patterns for different test types
 * 
 * Reference: load_testing_procedure.md Section 2.2
 */

// ============================================================================
// BASELINE LOAD PROFILES (Expected Peak Load)
// ============================================================================

/**
 * Feed Browse Baseline: 1,000 concurrent users
 * Duration: 40 minutes (5 ramp-up, 30 hold, 5 ramp-down)
 */
export const baselineFeedProfile = [
  { duration: '5m', target: 1000 },   // Ramp up 0→1,000 users
  { duration: '30m', target: 1000 },  // Hold 1,000 users
  { duration: '5m', target: 0 },      // Ramp down 1,000→0
];

/**
 * Search Baseline: 500 concurrent users
 * Duration: 40 minutes
 */
export const baselineSearchProfile = [
  { duration: '5m', target: 500 },
  { duration: '30m', target: 500 },
  { duration: '5m', target: 0 },
];

/**
 * Ride Post Baseline: 100 concurrent users
 * Duration: 40 minutes (lower due to write ops)
 */
export const baselinePostProfile = [
  { duration: '5m', target: 100 },
  { duration: '30m', target: 100 },
  { duration: '5m', target: 0 },
];

/**
 * Chat Baseline: 200 concurrent users in chat sessions
 * Duration: 30 minutes
 */
export const baselineChatProfile = [
  { duration: '3m', target: 200 },
  { duration: '24m', target: 200 },
  { duration: '3m', target: 0 },
];

/**
 * Auth Baseline: 500 logins spread over test
 * Duration: 15 minutes
 */
export const baselineAuthProfile = [
  { duration: '3m', target: 500 },
  { duration: '9m', target: 500 },
  { duration: '3m', target: 0 },
];

// ============================================================================
// STRESS LOAD PROFILES (2-3x Peak Load)
// ============================================================================

/**
 * Feed Browse Stress: 2,000-3,000 concurrent users
 * Duration: 60 minutes
 */
export const stressFeedProfile = [
  { duration: '10m', target: 2000 },  // Ramp to 2x
  { duration: '20m', target: 2000 },  // Hold at 2x
  { duration: '5m', target: 3000 },   // Push to 3x
  { duration: '15m', target: 3000 },  // Hold at 3x
  { duration: '10m', target: 0 },     // Ramp down
];

/**
 * Search Stress: 1,500 concurrent searches
 * Duration: 60 minutes
 */
export const stressSearchProfile = [
  { duration: '10m', target: 1000 },
  { duration: '20m', target: 1000 },
  { duration: '5m', target: 1500 },
  { duration: '15m', target: 1500 },
  { duration: '10m', target: 0 },
];

/**
 * Ride Post Stress: 300 concurrent posts (3x)
 * Duration: 45 minutes
 */
export const stressPostProfile = [
  { duration: '5m', target: 200 },
  { duration: '15m', target: 200 },
  { duration: '5m', target: 300 },
  { duration: '15m', target: 300 },
  { duration: '5m', target: 0 },
];

// ============================================================================
// SPIKE LOAD PROFILES (Sudden Traffic Surge)
// ============================================================================

/**
 * Spike Test: 0→2,000 in 30 seconds, hold 10 minutes
 * Duration: 20 minutes
 */
export const spikeTestProfile = [
  { duration: '30s', target: 2000 },  // Instant spike
  { duration: '10m', target: 2000 },  // Sustained high
  { duration: '5m', target: 500 },    // Gradual recovery
  { duration: '4m', target: 0 },      // Full recovery
];

/**
 * Spike Auth: Sudden login surge (e.g., class period starts)
 * Duration: 15 minutes
 */
export const spikeAuthProfile = [
  { duration: '20s', target: 1000 },  // 1K logins in 20 sec
  { duration: '5m', target: 200 },    // Sustain low
  { duration: '5m', target: 0 },      // Drop off
];

// ============================================================================
// SOAK LOAD PROFILES (Long Duration - Memory Leaks)
// ============================================================================

/**
 * Soak Test: 50% peak load for 6+ hours
 * Duration: 6 hours (360 minutes)
 */
export const soakTestProfile = [
  { duration: '15m', target: 500 },   // Ramp to 50% peak
  { duration: '330m', target: 500 },  // Hold 5.5 hours
  { duration: '15m', target: 0 },     // Ramp down
];

/**
 * Overnight Soak: Lower load for 12 hours
 * Duration: 12 hours
 */
export const overnightSoakProfile = [
  { duration: '30m', target: 250 },
  { duration: '660m', target: 250 },  // 11 hours
  { duration: '30m', target: 0 },
];

// ============================================================================
// QUOTA PRESSURE PROFILES (Free Tier Limits)
// ============================================================================

/**
 * Quota Pressure: Rapid operations to approach limits
 * Duration: 15 minutes
 */
export const quotaPressureProfile = [
  { duration: '2m', target: 500 },
  { duration: '10m', target: 500 },   // Sustained to hit quota
  { duration: '3m', target: 0 },
];

// ============================================================================
// RECOVERY/RESILIENCE PROFILES
// ============================================================================

/**
 * Recovery Test: Load + simulated failure + recovery
 * Duration: 40 minutes
 */
export const recoveryTestProfile = [
  { duration: '5m', target: 1000 },   // Normal load
  { duration: '10m', target: 1000 },  // Hold (failure injected here)
  { duration: '5m', target: 0 },      // Drop during "outage"
  { duration: '5m', target: 1000 },   // Recovery attempt
  { duration: '10m', target: 1000 },  // Sustained post-recovery
  { duration: '5m', target: 0 },      // Final ramp down
];

// ============================================================================
// QUICK TEST PROFILES (Development/CI)
// ============================================================================

/**
 * Smoke Test: Quick validation that system responds
 * Duration: 2 minutes
 */
export const smokeTestProfile = [
  { duration: '30s', target: 10 },
  { duration: '1m', target: 10 },
  { duration: '30s', target: 0 },
];

/**
 * Quick Baseline: Shortened for CI pipelines
 * Duration: 10 minutes
 */
export const quickBaselineProfile = [
  { duration: '2m', target: 100 },
  { duration: '6m', target: 100 },
  { duration: '2m', target: 0 },
];

// ============================================================================
// MIXED WORKLOAD PROFILE
// ============================================================================

/**
 * Mixed Worst-Case: All scenarios at 20% each simultaneously
 * Use with k6 scenarios feature
 */
export const mixedWorkloadConfig = {
  feed_browse: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 200 },
      { duration: '30m', target: 200 },
      { duration: '5m', target: 0 },
    ],
  },
  search: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 100 },
      { duration: '30m', target: 100 },
      { duration: '5m', target: 0 },
    ],
  },
  post_ride: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 20 },
      { duration: '30m', target: 20 },
      { duration: '5m', target: 0 },
    ],
  },
  chat: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 40 },
      { duration: '30m', target: 40 },
      { duration: '5m', target: 0 },
    ],
  },
  auth: {
    executor: 'constant-arrival-rate',
    rate: 2,           // 2 logins per second
    timeUnit: '1s',
    duration: '40m',
    preAllocatedVUs: 20,
    maxVUs: 50,
  },
};

// ============================================================================
// EXPORT ALL PROFILES
// ============================================================================

export const loadProfiles = {
  // Baseline
  baselineFeed: baselineFeedProfile,
  baselineSearch: baselineSearchProfile,
  baselinePost: baselinePostProfile,
  baselineChat: baselineChatProfile,
  baselineAuth: baselineAuthProfile,
  
  // Stress
  stressFeed: stressFeedProfile,
  stressSearch: stressSearchProfile,
  stressPost: stressPostProfile,
  
  // Spike
  spike: spikeTestProfile,
  spikeAuth: spikeAuthProfile,
  
  // Soak
  soak: soakTestProfile,
  overnightSoak: overnightSoakProfile,
  
  // Special
  quotaPressure: quotaPressureProfile,
  recovery: recoveryTestProfile,
  smoke: smokeTestProfile,
  quickBaseline: quickBaselineProfile,
  
  // Mixed
  mixed: mixedWorkloadConfig,
};

export default loadProfiles;
