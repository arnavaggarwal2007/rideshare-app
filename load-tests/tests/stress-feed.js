/**
 * Stress Feed Load Test
 * Test Case: LT-SCN-006
 * 
 * Objective: Test graceful degradation at 2-3x peak load (2,000-3,000 users)
 * Duration: 60 minutes
 * SLO: P95 <2s, Error rate <5%
 */

import { stressFeedProfile } from '../config/load-profiles.js';
import { feedStressThresholds } from '../config/thresholds.js';
import { feedBrowseScenario } from '../scenarios/feed-browse.js';

export const options = {
  stages: stressFeedProfile,
  thresholds: feedStressThresholds,
  
  tags: {
    testId: 'LT-SCN-006',
    testName: 'Feed Browse Stress (2-3x)',
    testType: 'stress',
  },
  
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default feedBrowseScenario({
  scrollRate: 0.25, // Slightly higher activity under stress
  pageSize: 20,
  pauseMin: 3,
  pauseMax: 25,
  maxPages: 15,
});

export function handleSummary(data) {
  const summary = {
    testId: 'LT-SCN-006',
    testName: 'Feed Browse Stress',
    timestamp: new Date().toISOString(),
    passed: Object.values(data.thresholds || {}).every(t => t.ok),
    metrics: {
      p95Latency: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
      errorRate: data.metrics.http_req_failed?.values?.rate || 0,
      maxVUs: data.metrics.vus?.values?.max || 0,
    },
  };

  return {
    'results/stress-feed.json': JSON.stringify(summary, null, 2),
  };
}
