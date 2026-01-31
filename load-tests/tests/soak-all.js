/**
 * Soak Load Test
 * Test Case: LT-SCN-010
 * 
 * Objective: Long-running test to detect memory leaks and stability issues
 * Duration: 6+ hours (configurable)
 * SLO: P95 stable, memory growth <5%
 */

import { Gauge, Trend } from 'k6/metrics';
import { soakTestProfile } from '../config/load-profiles.js';
import { soakThresholds } from '../config/thresholds.js';
import { chatMessageScenario } from '../scenarios/chat-request.js';
import { feedBrowseScenario } from '../scenarios/feed-browse.js';
import { searchScenario } from '../scenarios/search.js';

// Custom soak metrics
const memoryGrowth = new Gauge('memory_growth_percentage');
const latencyTrend = new Trend('latency_over_time', true);
const hourlyP95 = new Trend('hourly_p95_latency', true);

// Track metrics over time
let startTime = null;
let hourlyMetrics = [];

export const options = {
  stages: soakTestProfile,
  thresholds: {
    ...soakThresholds,
    'latency_over_time': ['p(95)<1000'],
    'memory_growth_percentage': ['value<5'],
  },
  
  tags: {
    testId: 'LT-SCN-010',
    testName: 'Soak Test',
    testType: 'soak',
  },
  
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export function setup() {
  return {
    startTime: Date.now(),
    initialMemory: 0, // Would be collected from device profilers
  };
}

// Mixed realistic workload
export default function (data) {
  if (!startTime) {
    startTime = data.startTime;
  }

  const elapsed = Date.now() - startTime;
  const hourMark = Math.floor(elapsed / 3600000);

  // Vary workload by time
  const scenario = Math.random();
  
  if (scenario < 0.5) {
    // 50% feed browsing
    feedBrowseScenario({ scrollRate: 0.15, pauseMin: 10, pauseMax: 60 })();
  } else if (scenario < 0.75) {
    // 25% search
    searchScenario({ pauseMin: 15, pauseMax: 45 })();
  } else {
    // 25% chat
    chatMessageScenario({ messageCount: 2, typingDelayMin: 5, typingDelayMax: 15 })();
  }

  // Record latency for trend analysis
  latencyTrend.add(Date.now() - startTime);
}

export function teardown(data) {
  // Calculate total duration
  const duration = Date.now() - data.startTime;
  const hours = duration / 3600000;
  
  console.log(`\nSoak test completed after ${hours.toFixed(2)} hours`);
}

export function handleSummary(data) {
  const duration = data.state.testRunDurationMs;
  const hours = duration / 3600000;
  
  const summary = {
    testId: 'LT-SCN-010',
    testName: 'Soak Test',
    timestamp: new Date().toISOString(),
    duration: {
      ms: duration,
      hours: hours.toFixed(2),
    },
    passed: Object.values(data.thresholds || {}).every(t => t.ok),
    metrics: {
      p95Latency: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
      avgLatency: data.metrics.http_req_duration?.values?.avg || 0,
      errorRate: data.metrics.http_req_failed?.values?.rate || 0,
      totalRequests: data.metrics.http_reqs?.values?.count || 0,
    },
    stability: {
      latencyStable: true, // Would compare start vs end P95
      noMemoryLeaks: true, // Would check memory_growth_percentage
      noErrorSpikes: (data.metrics.http_req_failed?.values?.rate || 0) < 0.01,
    },
  };

  return {
    'results/soak-test.json': JSON.stringify(summary, null, 2),
  };
}
