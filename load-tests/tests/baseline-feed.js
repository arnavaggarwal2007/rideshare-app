/**
 * Baseline Feed Load Test
 * Test Case: LT-SCN-001
 * 
 * Objective: Establish baseline KPIs for feed scrolling at expected peak (1,000 users)
 * Duration: 40 minutes
 * SLO: P95 <800ms, Error rate <0.5%
 */

import { baselineFeedProfile } from '../config/load-profiles.js';
import { feedBaselineThresholds } from '../config/thresholds.js';
import { feedBrowseScenario } from '../scenarios/feed-browse.js';

export const options = {
  stages: baselineFeedProfile,
  thresholds: feedBaselineThresholds,
  
  // Test metadata
  tags: {
    testId: 'LT-SCN-001',
    testName: 'Feed Browse Baseline',
    testType: 'baseline',
  },
  
  // Summary configuration
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Main scenario: 80% idle users, 20% active scrollers
export default feedBrowseScenario({
  scrollRate: 0.2,
  pageSize: 20,
  pauseMin: 5,
  pauseMax: 35,
  maxPages: 10,
});

// Custom summary handler
export function handleSummary(data) {
  const summary = {
    testId: 'LT-SCN-001',
    testName: 'Feed Browse Baseline',
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs,
    
    // Key metrics
    metrics: {
      p95Latency: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
      p99Latency: data.metrics.http_req_duration?.values?.['p(99)'] || 0,
      avgLatency: data.metrics.http_req_duration?.values?.avg || 0,
      errorRate: data.metrics.http_req_failed?.values?.rate || 0,
      totalRequests: data.metrics.http_reqs?.values?.count || 0,
      throughput: data.metrics.http_reqs?.values?.rate || 0,
    },
    
    // Threshold results
    thresholds: Object.entries(data.thresholds || {}).map(([name, result]) => ({
      name,
      passed: result.ok,
    })),
    
    // Pass/fail
    passed: Object.values(data.thresholds || {}).every(t => t.ok),
  };

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/baseline-feed.json': JSON.stringify(summary, null, 2),
  };
}

function textSummary(data, options) {
  const lines = [
    '\n========================================',
    '  BASELINE FEED TEST RESULTS (LT-SCN-001)',
    '========================================\n',
    `  Duration: ${Math.round(data.state.testRunDurationMs / 1000)}s`,
    `  VUs (max): ${data.metrics.vus?.values?.max || 0}`,
    `  Requests: ${data.metrics.http_reqs?.values?.count || 0}`,
    `  Throughput: ${(data.metrics.http_reqs?.values?.rate || 0).toFixed(2)} req/s`,
    '',
    '  LATENCY:',
    `    P50: ${(data.metrics.http_req_duration?.values?.['p(50)'] || 0).toFixed(2)}ms`,
    `    P95: ${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms (target: <800ms)`,
    `    P99: ${(data.metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms`,
    '',
    '  ERRORS:',
    `    Error Rate: ${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(3)}% (target: <0.5%)`,
    '',
    '  THRESHOLDS:',
  ];

  for (const [name, result] of Object.entries(data.thresholds || {})) {
    lines.push(`    ${result.ok ? '✓' : '✗'} ${name}`);
  }

  const allPassed = Object.values(data.thresholds || {}).every(t => t.ok);
  lines.push('');
  lines.push(`  RESULT: ${allPassed ? '✓ PASSED' : '✗ FAILED'}`);
  lines.push('========================================\n');

  return lines.join('\n');
}
