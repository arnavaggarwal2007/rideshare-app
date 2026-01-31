/**
 * Spike Load Test
 * Test Case: LT-SCN-009
 * 
 * Objective: Test sudden traffic surge (0→2,000 in 30 seconds)
 * Duration: 20 minutes
 * SLO: Initial spike may degrade, but should recover
 */

import { spikeTestProfile } from '../config/load-profiles.js';
import { spikeThresholds } from '../config/thresholds.js';
import { feedBrowseScenario } from '../scenarios/feed-browse.js';
import { searchScenario } from '../scenarios/search.js';

export const options = {
  stages: spikeTestProfile,
  thresholds: spikeThresholds,
  
  tags: {
    testId: 'LT-SCN-009',
    testName: 'Spike Test',
    testType: 'spike',
  },
  
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Mixed scenario: 70% feed, 30% search
export default function () {
  if (Math.random() < 0.7) {
    feedBrowseScenario({ scrollRate: 0.3 })();
  } else {
    searchScenario({ searchPattern: 'exact' })();
  }
}

export function handleSummary(data) {
  const summary = {
    testId: 'LT-SCN-009',
    testName: 'Spike Test',
    timestamp: new Date().toISOString(),
    passed: Object.values(data.thresholds || {}).every(t => t.ok),
    metrics: {
      p95Latency: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
      maxLatency: data.metrics.http_req_duration?.values?.max || 0,
      errorRate: data.metrics.http_req_failed?.values?.rate || 0,
      maxVUs: data.metrics.vus?.values?.max || 0,
    },
    analysis: {
      spikeHandled: (data.metrics.http_req_duration?.values?.['p(95)'] || 0) < 2500,
      recoveredGracefully: (data.metrics.http_req_failed?.values?.rate || 0) < 0.10,
    },
  };

  return {
    'results/spike-test.json': JSON.stringify(summary, null, 2),
  };
}
