/**
 * Mixed Workload Load Test
 * Test Case: LT-SCN-015
 * 
 * Objective: Realistic peak with all scenarios running simultaneously
 * Duration: 40 minutes
 * SLO: Blended P95 <1.5s, Error rate <2%
 */

import { mixedThresholds } from '../config/thresholds.js';
import { authLoginScenario } from '../scenarios/auth-login.js';
import { chatMessageScenario, seatRequestScenario } from '../scenarios/chat-request.js';
import { feedBrowseScenario } from '../scenarios/feed-browse.js';
import { ridePostScenario } from '../scenarios/ride-post.js';
import { searchScenario } from '../scenarios/search.js';

export const options = {
  scenarios: {
    // 40% - Feed browsing (highest volume)
    feed_browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 400 },
        { duration: '30m', target: 400 },
        { duration: '5m', target: 0 },
      ],
      exec: 'feedBrowse',
      tags: { scenario: 'feed_browse' },
    },
    
    // 25% - Search
    search: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 250 },
        { duration: '30m', target: 250 },
        { duration: '5m', target: 0 },
      ],
      exec: 'search',
      tags: { scenario: 'search' },
    },
    
    // 15% - Chat/Requests
    chat_request: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 150 },
        { duration: '30m', target: 150 },
        { duration: '5m', target: 0 },
      ],
      exec: 'chatRequest',
      tags: { scenario: 'chat_request' },
    },
    
    // 10% - Ride posting
    post_ride: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },
        { duration: '30m', target: 100 },
        { duration: '5m', target: 0 },
      ],
      exec: 'postRide',
      tags: { scenario: 'post_ride' },
    },
    
    // 10% - Auth (continuous login stream)
    auth: {
      executor: 'constant-arrival-rate',
      rate: 5,           // 5 logins per second
      timeUnit: '1s',
      duration: '40m',
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: 'auth',
      tags: { scenario: 'auth' },
    },
  },
  
  thresholds: mixedThresholds,
  
  tags: {
    testId: 'LT-SCN-015',
    testName: 'Mixed Workload',
    testType: 'mixed',
  },
  
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Scenario executors
export function feedBrowse() {
  feedBrowseScenario({ scrollRate: 0.2 })();
}

export function search() {
  searchScenario({ searchPattern: 'random', clickResults: true })();
}

export function chatRequest() {
  if (Math.random() < 0.4) {
    seatRequestScenario({ followWithChat: true })();
  } else {
    chatMessageScenario({ messageCount: 3 })();
  }
}

export function postRide() {
  ridePostScenario({ verifyCreation: true })();
}

export function auth() {
  authLoginScenario({ fetchProfile: true })();
}

export function handleSummary(data) {
  const summary = {
    testId: 'LT-SCN-015',
    testName: 'Mixed Workload',
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs,
    passed: Object.values(data.thresholds || {}).every(t => t.ok),
    
    overallMetrics: {
      p95Latency: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
      errorRate: data.metrics.http_req_failed?.values?.rate || 0,
      totalRequests: data.metrics.http_reqs?.values?.count || 0,
      throughput: data.metrics.http_reqs?.values?.rate || 0,
    },
    
    scenarioMetrics: {
      feed: {
        p95: data.metrics['http_req_duration{scenario:feed_browse}']?.values?.['p(95)'] || 0,
      },
      search: {
        p95: data.metrics['http_req_duration{scenario:search}']?.values?.['p(95)'] || 0,
      },
      chat: {
        p95: data.metrics['http_req_duration{scenario:chat_request}']?.values?.['p(95)'] || 0,
      },
      post: {
        p95: data.metrics['http_req_duration{scenario:post_ride}']?.values?.['p(95)'] || 0,
      },
      auth: {
        p95: data.metrics['http_req_duration{scenario:auth}']?.values?.['p(95)'] || 0,
      },
    },
    
    thresholds: Object.entries(data.thresholds || {}).map(([name, result]) => ({
      name,
      passed: result.ok,
    })),
  };

  return {
    'results/mixed-workload.json': JSON.stringify(summary, null, 2),
  };
}
