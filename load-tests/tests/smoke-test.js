/**
 * Quick Smoke Test
 * For CI pipelines and quick validation
 * 
 * Duration: 2 minutes
 * Purpose: Verify endpoints are responding correctly
 */

import { smokeTestProfile } from '../config/load-profiles.js';
import { authLoginScenario } from '../scenarios/auth-login.js';
import { feedBrowseScenario } from '../scenarios/feed-browse.js';
import { searchScenario } from '../scenarios/search.js';

export const options = {
  stages: smokeTestProfile,
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
  },
  
  tags: {
    testId: 'SMOKE',
    testName: 'Quick Smoke Test',
    testType: 'smoke',
  },
};

export default function () {
  const scenario = Math.random();
  
  if (scenario < 0.5) {
    feedBrowseScenario({ scrollRate: 0.5 })();
  } else if (scenario < 0.8) {
    searchScenario({ searchPattern: 'exact' })();
  } else {
    authLoginScenario({ fetchProfile: false })();
  }
}

export function handleSummary(data) {
  const passed = Object.values(data.thresholds || {}).every(t => t.ok);
  
  console.log(`\n${'='.repeat(40)}`);
  console.log(`  SMOKE TEST: ${passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`  P95 Latency: ${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(0)}ms`);
  console.log(`  Error Rate: ${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%`);
  console.log(`${'='.repeat(40)}\n`);
  
  return {
    'results/smoke-test.json': JSON.stringify({
      passed,
      timestamp: new Date().toISOString(),
      p95: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
      errorRate: data.metrics.http_req_failed?.values?.rate || 0,
    }, null, 2),
  };
}
