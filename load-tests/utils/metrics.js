/**
 * Custom Metrics for RideBoard Load Tests
 * Industry-standard metric collection and reporting
 */

import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

// ============================================================================
// LATENCY TRENDS (P50, P95, P99)
// ============================================================================

// Scenario-specific latency trends
export const feedLatency = new Trend('feed_latency', true);
export const searchLatency = new Trend('search_latency', true);
export const postLatency = new Trend('post_latency', true);
export const chatLatency = new Trend('chat_latency', true);
export const authLatency = new Trend('auth_latency', true);
export const profileLatency = new Trend('profile_latency', true);

// Operation-specific latency
export const firestoreReadLatency = new Trend('firestore_read_latency', true);
export const firestoreWriteLatency = new Trend('firestore_write_latency', true);
export const functionLatency = new Trend('function_latency', true);

// ============================================================================
// COUNTERS
// ============================================================================

// Operation counters
export const firestoreReads = new Counter('firestore_reads');
export const firestoreWrites = new Counter('firestore_writes');
export const functionInvocations = new Counter('function_invocations');

// Error counters
export const totalErrors = new Counter('total_errors');
export const timeoutErrors = new Counter('timeout_errors');
export const throttleErrors = new Counter('throttle_errors');  // 429s
export const serverErrors = new Counter('server_errors');       // 5xx
export const clientErrors = new Counter('client_errors');       // 4xx (not 429)

// Data integrity
export const dataLossEvents = new Counter('data_loss_events');
export const duplicateWrites = new Counter('duplicate_writes');

// Crashes/failures
export const crashes = new Counter('crashes');
export const unhandledExceptions = new Counter('unhandled_exceptions');

// ============================================================================
// RATES
// ============================================================================

// Success/failure rates
export const successRate = new Rate('success_rate');
export const errorRate = new Rate('error_rate');
export const throttleRate = new Rate('throttle_rate');

// Cache hit rate (if applicable)
export const cacheHitRate = new Rate('cache_hit_rate');

// ============================================================================
// GAUGES
// ============================================================================

// Quota tracking
export const quotaReadsUsed = new Gauge('quota_reads_used');
export const quotaWritesUsed = new Gauge('quota_writes_used');
export const quotaReadsRemaining = new Gauge('quota_reads_remaining');
export const quotaWritesRemaining = new Gauge('quota_writes_remaining');

// Active connections
export const activeListeners = new Gauge('active_listeners');
export const activeConnections = new Gauge('active_connections');

// Memory (from device profilers, updated externally)
export const memoryUsage = new Gauge('memory_usage_mb');
export const memoryGrowth = new Gauge('memory_growth_mb');

// ============================================================================
// METRIC RECORDING HELPERS
// ============================================================================

/**
 * Record latency for a scenario
 */
export function recordLatency(scenario, latencyMs) {
  switch (scenario) {
    case 'feed':
    case 'feed_browse':
      feedLatency.add(latencyMs);
      break;
    case 'search':
      searchLatency.add(latencyMs);
      break;
    case 'post':
    case 'post_ride':
      postLatency.add(latencyMs);
      break;
    case 'chat':
      chatLatency.add(latencyMs);
      break;
    case 'auth':
    case 'login':
      authLatency.add(latencyMs);
      break;
    case 'profile':
      profileLatency.add(latencyMs);
      break;
    default:
      // Generic latency tracking
      break;
  }
}

/**
 * Record an error
 */
export function recordError(scenario, statusCode, latencyMs, message = '') {
  totalErrors.add(1);
  errorRate.add(1);
  successRate.add(0);

  if (statusCode === 429) {
    throttleErrors.add(1);
    throttleRate.add(1);
  } else if (statusCode >= 500) {
    serverErrors.add(1);
  } else if (statusCode >= 400) {
    clientErrors.add(1);
  } else if (statusCode === 0 || latencyMs > 30000) {
    timeoutErrors.add(1);
  }

  if (__ENV.DEBUG === 'true') {
    console.error(`[ERROR] ${scenario}: ${statusCode} (${latencyMs}ms) - ${message}`);
  }
}

/**
 * Record a successful operation
 */
export function recordSuccess(scenario, latencyMs) {
  successRate.add(1);
  errorRate.add(0);
  throttleRate.add(0);
  recordLatency(scenario, latencyMs);
}

/**
 * Record Firestore operation
 */
export function recordFirestoreOp(type, count = 1, latencyMs = null) {
  if (type === 'read') {
    firestoreReads.add(count);
    if (latencyMs) firestoreReadLatency.add(latencyMs);
  } else if (type === 'write') {
    firestoreWrites.add(count);
    if (latencyMs) firestoreWriteLatency.add(latencyMs);
  }
}

/**
 * Update quota gauges
 */
export function updateQuotaMetrics(readsUsed, writesUsed) {
  const DAILY_READ_LIMIT = 50000;
  const DAILY_WRITE_LIMIT = 20000;

  quotaReadsUsed.add(readsUsed);
  quotaWritesUsed.add(writesUsed);
  quotaReadsRemaining.add(DAILY_READ_LIMIT - readsUsed);
  quotaWritesRemaining.add(DAILY_WRITE_LIMIT - writesUsed);
}

/**
 * Record data integrity issue
 */
export function recordDataIssue(type) {
  if (type === 'loss') {
    dataLossEvents.add(1);
  } else if (type === 'duplicate') {
    duplicateWrites.add(1);
  }
}

// ============================================================================
// SUMMARY HELPERS
// ============================================================================

/**
 * Generate metric summary object
 */
export function getMetricSummary() {
  return {
    latency: {
      feed: 'feed_latency',
      search: 'search_latency',
      post: 'post_latency',
      chat: 'chat_latency',
      auth: 'auth_latency',
    },
    errors: {
      total: 'total_errors',
      throttle: 'throttle_errors',
      timeout: 'timeout_errors',
      server: 'server_errors',
    },
    rates: {
      success: 'success_rate',
      error: 'error_rate',
      throttle: 'throttle_rate',
    },
    firebase: {
      reads: 'firestore_reads',
      writes: 'firestore_writes',
    },
  };
}

/**
 * Custom handleSummary for detailed reporting
 */
export function generateCustomSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    duration: data.metrics.iteration_duration
      ? data.metrics.iteration_duration.values.avg
      : 0,
    vus: data.metrics.vus ? data.metrics.vus.values.max : 0,
    
    latency: {
      p50: data.metrics.http_req_duration?.values?.['p(50)'] || 0,
      p95: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
      p99: data.metrics.http_req_duration?.values?.['p(99)'] || 0,
      avg: data.metrics.http_req_duration?.values?.avg || 0,
      max: data.metrics.http_req_duration?.values?.max || 0,
    },
    
    requests: {
      total: data.metrics.http_reqs?.values?.count || 0,
      rate: data.metrics.http_reqs?.values?.rate || 0,
    },
    
    errors: {
      total: data.metrics.total_errors?.values?.count || 0,
      rate: data.metrics.error_rate?.values?.rate || 0,
      throttled: data.metrics.throttle_errors?.values?.count || 0,
    },
    
    firebase: {
      reads: data.metrics.firestore_reads?.values?.count || 0,
      writes: data.metrics.firestore_writes?.values?.count || 0,
    },
    
    thresholds: data.thresholds || {},
    
    passed: Object.values(data.thresholds || {}).every(t => t.ok),
  };

  return summary;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Latency trends
  feedLatency,
  searchLatency,
  postLatency,
  chatLatency,
  authLatency,
  profileLatency,
  firestoreReadLatency,
  firestoreWriteLatency,
  functionLatency,
  
  // Counters
  firestoreReads,
  firestoreWrites,
  functionInvocations,
  totalErrors,
  timeoutErrors,
  throttleErrors,
  serverErrors,
  clientErrors,
  dataLossEvents,
  duplicateWrites,
  crashes,
  unhandledExceptions,
  
  // Rates
  successRate,
  errorRate,
  throttleRate,
  cacheHitRate,
  
  // Gauges
  quotaReadsUsed,
  quotaWritesUsed,
  quotaReadsRemaining,
  quotaWritesRemaining,
  activeListeners,
  activeConnections,
  memoryUsage,
  memoryGrowth,
  
  // Helpers
  recordLatency,
  recordError,
  recordSuccess,
  recordFirestoreOp,
  updateQuotaMetrics,
  recordDataIssue,
  getMetricSummary,
  generateCustomSummary,
};
