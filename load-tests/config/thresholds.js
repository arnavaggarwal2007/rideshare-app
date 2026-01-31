/**
 * SLO Thresholds for RideBoard Load Tests
 * Industry-standard Service Level Objectives
 * 
 * Reference: load_testing_procedure.md Section 2.3
 */

// ============================================================================
// BASELINE THRESHOLDS (Normal Load - 100% expected peak)
// ============================================================================

/**
 * Standard baseline thresholds
 * - P95 latency <800ms
 * - Error rate <0.5%
 */
export const baselineThresholds = {
  http_req_duration: ['p(95)<800', 'p(99)<1200'],
  http_req_failed: ['rate<0.005'],  // <0.5% error rate
  http_reqs: ['count>100'],          // Minimum request volume
};

/**
 * Feed-specific baseline
 */
export const feedBaselineThresholds = {
  'http_req_duration{scenario:feed_browse}': ['p(95)<800'],
  'http_req_failed{scenario:feed_browse}': ['rate<0.005'],
  http_req_duration: ['p(95)<800', 'p(99)<1200'],
  http_req_failed: ['rate<0.005'],
};

/**
 * Search-specific baseline (slightly higher latency allowed)
 */
export const searchBaselineThresholds = {
  http_req_duration: ['p(95)<1000', 'p(99)<1500'],
  http_req_failed: ['rate<0.005'],
  'http_req_duration{scenario:search}': ['p(95)<1000'],
};

/**
 * Ride Post baseline (write operations - higher latency)
 */
export const postBaselineThresholds = {
  http_req_duration: ['p(95)<1500', 'p(99)<2500'],
  http_req_failed: ['rate<0.005'],
  'http_req_duration{scenario:post_ride}': ['p(95)<1500'],
};

/**
 * Chat baseline (real-time requirement)
 */
export const chatBaselineThresholds = {
  http_req_duration: ['p(95)<800', 'p(99)<1200'],
  http_req_failed: ['rate<0.005'],
  'http_req_duration{scenario:chat}': ['p(95)<500'],  // Stricter for chat
};

/**
 * Auth baseline
 */
export const authBaselineThresholds = {
  http_req_duration: ['p(95)<1000', 'p(99)<1500'],
  http_req_failed: ['rate<0.005'],
  'http_req_duration{scenario:auth}': ['p(95)<1000'],
  'http_req_duration{scenario:profile}': ['p(95)<500'],
};

// ============================================================================
// STRESS THRESHOLDS (2-3x Load - Graceful Degradation)
// ============================================================================

/**
 * Stress test thresholds
 * - P95 latency <2s (acceptable slowdown)
 * - Error rate <5% (controlled errors)
 */
export const stressThresholds = {
  http_req_duration: ['p(95)<2000', 'p(99)<3000'],
  http_req_failed: ['rate<0.05'],  // <5% error rate
};

/**
 * Feed stress (2x-3x load)
 */
export const feedStressThresholds = {
  http_req_duration: ['p(95)<2000', 'p(99)<3000'],
  http_req_failed: ['rate<0.03'],  // 3% max for reads
  'http_req_duration{scenario:feed_browse}': ['p(95)<2000'],
};

/**
 * Search stress
 */
export const searchStressThresholds = {
  http_req_duration: ['p(95)<2000', 'p(99)<3500'],
  http_req_failed: ['rate<0.05'],
};

/**
 * Post stress (writes under pressure)
 */
export const postStressThresholds = {
  http_req_duration: ['p(95)<3000', 'p(99)<5000'],
  http_req_failed: ['rate<0.05'],
  // Zero data loss threshold (custom counter)
  data_loss: ['count==0'],
};

// ============================================================================
// SPIKE THRESHOLDS (Sudden Surge)
// ============================================================================

/**
 * Spike test thresholds
 * - Initial spike may have higher latency
 * - Error rate should recover quickly
 */
export const spikeThresholds = {
  http_req_duration: ['p(95)<2500'],  // Allow initial spike latency
  http_req_failed: ['rate<0.10'],     // Up to 10% during spike, should recover
  // Recovery metric (custom)
  'http_req_duration{phase:recovery}': ['p(95)<1000'],  // Should recover
};

// ============================================================================
// SOAK THRESHOLDS (Long Duration)
// ============================================================================

/**
 * Soak test thresholds
 * - Stable performance over time
 * - No memory leak indicators
 */
export const soakThresholds = {
  http_req_duration: ['p(95)<900'],  // Slightly relaxed for long run
  http_req_failed: ['rate<0.005'],
  // Memory stability (custom)
  memory_growth_mb: ['value<50'],  // Max 50MB growth over 6 hours
};

// ============================================================================
// QUOTA THRESHOLDS (Free Tier Limits)
// ============================================================================

/**
 * Quota pressure test
 * - System should handle throttling gracefully
 * - User-friendly error messages
 */
export const quotaThresholds = {
  http_req_duration: ['p(95)<3000'],  // Expect some slowdown
  http_req_failed: ['rate<0.20'],     // Up to 20% 429s expected at limit
  // Graceful throttle handling
  'http_req_failed{status:429}': ['count>0'],  // Expect some throttles
  crashes: ['count==0'],  // No crashes even under quota pressure
};

// ============================================================================
// MIXED WORKLOAD THRESHOLDS
// ============================================================================

/**
 * Mixed realistic workload
 */
export const mixedThresholds = {
  http_req_duration: ['p(95)<1500'],  // Blended target
  http_req_failed: ['rate<0.02'],     // 2% overall
  // Per-scenario limits
  'http_req_duration{scenario:feed_browse}': ['p(95)<1000'],
  'http_req_duration{scenario:search}': ['p(95)<1200'],
  'http_req_duration{scenario:post_ride}': ['p(95)<2000'],
  'http_req_duration{scenario:chat}': ['p(95)<600'],
  'http_req_duration{scenario:auth}': ['p(95)<1200'],
};

// ============================================================================
// DEVICE PERFORMANCE THRESHOLDS
// ============================================================================

/**
 * Mobile device metrics (validated separately via profilers)
 */
export const deviceThresholds = {
  android: {
    cpuUsageMax: 50,       // % max CPU
    memoryUsageMax: 200,   // MB max memory
    frameRateMin: 55,      // FPS minimum
    batteryDrainMax: 15,   // % per hour (normal)
    crashRate: 0,          // Zero crashes
  },
  ios: {
    cpuUsageMax: 50,
    memoryUsageMax: 200,
    frameRateMin: 58,
    batteryDrainMax: 12,
    crashRate: 0,
  },
};

// ============================================================================
// FIREBASE QUOTA THRESHOLDS
// ============================================================================

/**
 * Firebase free tier awareness
 */
export const firebaseQuotaThresholds = {
  firestoreReadsMax: 40000,      // 80% of 50K daily limit
  firestoreWritesMax: 16000,     // 80% of 20K daily limit
  storageMax: 0.8,               // 80% of 1 GiB
  functionInvocationsMax: 1600000, // 80% of 2M monthly
};

// ============================================================================
// CUSTOM METRIC DEFINITIONS
// ============================================================================

/**
 * Custom metrics to track beyond k6 defaults
 */
export const customMetrics = {
  feed_latency: 'Trend',      // Feed scroll latency
  search_latency: 'Trend',    // Search query latency
  post_latency: 'Trend',      // Ride creation latency
  chat_latency: 'Trend',      // Chat message latency
  auth_latency: 'Trend',      // Login latency
  firestore_reads: 'Counter', // Total Firestore reads
  firestore_writes: 'Counter', // Total Firestore writes
  data_loss: 'Counter',       // Data integrity violations
  crashes: 'Counter',         // App crashes detected
  throttle_count: 'Counter',  // 429 responses
  cold_starts: 'Counter',     // Function cold starts
};

// ============================================================================
// THRESHOLD PRESETS (Easy Selection)
// ============================================================================

export const thresholdPresets = {
  // Baseline tests
  'baseline-feed': feedBaselineThresholds,
  'baseline-search': searchBaselineThresholds,
  'baseline-post': postBaselineThresholds,
  'baseline-chat': chatBaselineThresholds,
  'baseline-auth': authBaselineThresholds,
  'baseline-all': baselineThresholds,
  
  // Stress tests
  'stress-feed': feedStressThresholds,
  'stress-search': searchStressThresholds,
  'stress-post': postStressThresholds,
  'stress-all': stressThresholds,
  
  // Special tests
  spike: spikeThresholds,
  soak: soakThresholds,
  quota: quotaThresholds,
  mixed: mixedThresholds,
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  baseline: baselineThresholds,
  stress: stressThresholds,
  spike: spikeThresholds,
  soak: soakThresholds,
  quota: quotaThresholds,
  mixed: mixedThresholds,
  presets: thresholdPresets,
  device: deviceThresholds,
  firebase: firebaseQuotaThresholds,
  customMetrics,
};
