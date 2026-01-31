# Comprehensive Load Testing Procedure for RideBoard App
## Industry-Standard Execution Guide

**Document Version:** 1.0  
**Date:** January 16, 2026  
**Classification:** Internal Use  
**Last Updated:** 2026-01-16

---

## Table of Contents

1. [Introduction & Scope](#1-introduction--scope)
2. [Load Testing Framework & Methodology](#2-load-testing-framework--methodology)
3. [Pre-Testing Setup & Environment Configuration](#3-pre-testing-setup--environment-configuration)
4. [Load Test Scenarios & Test Cases](#4-load-test-scenarios--test-cases)
5. [Test Script Development & Parameterization](#5-test-script-development--parameterization)
6. [Test Execution Procedures](#6-test-execution-procedures)
7. [Monitoring, Data Collection & Analysis](#7-monitoring-data-collection--analysis)
8. [Industry-Standard Metrics & KPIs](#8-industry-standard-metrics--kpis)
9. [Results Analysis & Reporting](#9-results-analysis--reporting)
10. [Optimization & Remediation](#10-optimization--remediation)
11. [Documentation & Sign-Off](#11-documentation--sign-off)

---

## 1. Introduction & Scope

### 1.1 Purpose

This document provides a **comprehensive, step-by-step load testing procedure** for the RideBoard (rideshare social platform) mobile application. It ensures the app meets **industry-standard performance criteria** across all critical user flows before production launch.

**Scope:**
- Backend: Firebase (Firestore, Cloud Functions, Auth, Notifications)
- Frontend: React Native (iOS + Android, Expo framework)
- APIs: Mapbox routing, external third-party integrations
- Load Profile: 1k–5k concurrent users (campus launch)
- Test Duration: 2–3 weeks (full cycle)

### 1.2 Success Definition

**Industry-Grade Status** = App meets ALL of the following:
1. **Functional SLOs Met:** P95 response time <800ms at expected peak; error rate <0.5% under normal load.
2. **Graceful Degradation:** At 2–3x peak load, P95 <2s; error rate <5%; no crashes; system recovers within 10 min.
3. **Data Integrity:** Zero data loss; no duplicate writes; offline queue sync without duplication.
4. **Device Performance:** Real device testing on iOS + Android shows acceptable UX (no hangs, <10% battery drain per hour).
5. **Quota Awareness:** Free-tier limits understood and enforced; upgrade path documented.
6. **Monitoring Live:** Production alerts configured; ops runbooks ready.

---

## 2. Load Testing Framework & Methodology

### 2.1 Test Methodology: Ramp-Based Phased Approach

We follow a **risk-driven, iterative methodology**:

```
Baseline Phase 1 (Day 1–2)
    ↓
Establish healthy normal-load KPIs
    ↓
Stress Phase 2 (Day 3–7)
    ↓
Test 2–3x peak; measure breaking points
    ↓
Resilience Phase 3 (Day 8–9)
    ↓
Test failure scenarios; validate recovery
    ↓
Optimization Phase 4 (Day 10–14)
    ↓
Fix issues; re-run tests; confirm gates pass
    ↓
Sign-Off & Deployment Ready
```

### 2.2 Load Test Types

| Test Type | Purpose | Duration | Load Profile | When to Run |
|-----------|---------|----------|--------------|------------|
| **Baseline Load Test** | Establish healthy KPIs at expected peak | 30–40 min | 0 → peak → 0 (ramp) | Phase 1 (after each fix) |
| **Stress Test** | Push to 2–3x peak; identify breaking points | 60–90 min | 0 → 2–3x peak → 0 | Phase 2 (main stress run) |
| **Spike Test** | Sudden traffic surge; test backpressure | 15–20 min | 0 → peak in <1 min → 0 | Phase 2 (supplement) |
| **Soak Test** | Long-running; detect memory leaks | 6+ hours | 50% peak sustained | Phase 2 (overnight run) |
| **Quota Pressure Test** | Hit free-tier limits; test error handling | 10–15 min | Rapid ops to trigger throttle | Phase 2 (validation) |
| **Recovery Test** | Simulate downtime; validate comeback | 30–40 min | Load + failure injection + recovery | Phase 3 |

### 2.3 SLI / SLO / SLO Framework (Industry Standard)

**Define Success Explicitly:**

| Type | Definition | Example (RideBoard) |
|------|-----------|-------------------|
| **SLI** (Service Level Indicator) | Measurable metric | P95 response time (latency percentile) |
| **SLO** (Service Level Objective) | Target for SLI | P95 <800ms under normal load |
| **Error Budget** | Allowable failure % | <0.5% error rate = 99.5% availability target |

**RideBoard SLOs (Baseline):**
```
Feed Browse (GET /rides):
  - SLI: P95 response time
  - SLO: <800ms at peak load (100% load)
  - Error Budget: <0.5% (99.5% success rate)

Search (POST /search):
  - SLI: P95 response time
  - SLO: <1s at peak load
  - Error Budget: <0.5%

Ride Post (POST /rides):
  - SLI: P95 response time
  - SLO: <1.5s at peak load
  - Error Budget: <0.5%

Chat Send (POST /chats):
  - SLI: P95 response time
  - SLO: <800ms at peak load
  - Error Budget: <0.5%

Stress Degradation (at 2–3x peak):
  - P95: <2s (acceptable slowdown)
  - Error Rate: <5% (controlled errors)
```

---

## 3. Pre-Testing Setup & Environment Configuration

### 3.1 Environment Checklist

**Staging Infrastructure:**

- [ ] Firebase `rideboard-perf-staging` project created (separate from dev, same region as prod).
- [ ] Firestore database initialized with same security rules + indexes as production.
- [ ] Cloud Functions deployed (same code as prod; no optimized version yet).
- [ ] Firebase Auth enabled (test users pre-created: 100 test accounts).
- [ ] Cloud Storage bucket initialized (for car photos).
- [ ] Firebase Realtime Listeners configured (if using Realtime DB for chat).
- [ ] Mapbox API key provisioned (or mocked for quota control).
- [ ] Firebase Performance SDK + Sentry SDK integrated in app code.
- [ ] Release APK + IPA built with performance instrumentation enabled.

**Test Data Seeding:**

- [ ] Firestore warm-up data loaded:
  - 500 ride posts (varied routes, times, drivers).
  - 200 user profiles (drivers + riders, realistic avatars).
  - 50 chat threads with 5–10 messages each.
  - Total data: ~100 MiB (stays under 1 GiB free limit).
- [ ] Database indexed (Firestore console shows all required indexes created).
- [ ] Test credentials created (users for login flow testing).

**Device Lab Setup:**

- [ ] Real Devices:
  - Android: Pixel 6a (baseline), Samsung Galaxy A52 (low-end). USB connected to test machine.
  - iOS: iPhone 13 mini (budget), iPhone 15 (recent). Connected via Xcode.
  - ADB + iOS developer mode enabled.
  - Release APK/IPA installed on all devices.
- [ ] Network Profiles:
  - WiFi 5GHz (high-speed baseline).
  - 4G LTE throttled (25 Mbps down, 10 Mbps up) using Charles Proxy or network emulation.
  - Network flaps (WiFi ↔ 4G switches every 2 min).
- [ ] Device Monitoring:
  - Android: Android Studio Profiler configured.
  - iOS: Xcode Instruments configured (Allocations, System Trace).
  - Firebase Performance SDK logging enabled on devices.

**Load Generation Environment:**

- [ ] k6 installed locally (or on CI machine).
- [ ] Test scripts checked into GitHub in `/load-tests/` directory.
- [ ] Appium + WebDriverIO installed for mobile automation.
- [ ] Charles Proxy or Fiddler ready to capture API traffic.
- [ ] CI/CD pipeline (GitHub Actions) configured to trigger k6 on-demand.

**Monitoring & Observability:**

- [ ] Firebase Console dashboard open (Firestore ops, Functions metrics, Perf).
- [ ] Sentry project created; SDK integrated in app + backend.
- [ ] Prometheus + Grafana Docker containers running locally.
- [ ] Custom dashboards created (load, latency, errors, Firestore quotas).
- [ ] Alerts configured (e.g., "Error rate >1%").
- [ ] Log aggregation (Firebase logs + Sentry live tail open during tests).

**Sign-Off:**
```
Environment Setup Sign-Off

- [ ] QA Lead: Infrastructure ready
  Signed: __________ Date: __________ Time: __________

- [ ] DevOps Lead: Monitoring configured
  Signed: __________ Date: __________ Time: __________

- [ ] Backend Lead: Firestore indexes verified
  Signed: __________ Date: __________ Time: __________
```

---

## 4. Load Test Scenarios & Test Cases

### 4.1 Test Case Template (Industry Standard)

**Format:**
```
TEST CASE ID: LT-SCN-001-FEED-BASELINE

Test Case Name: Feed Browse Baseline Load Test

Objective:
- Establish baseline KPIs for feed scrolling at expected peak load (1,000 concurrent users).
- Validate P95 latency <800ms, error rate <0.5%.
- Identify any missing Firestore indexes or query inefficiencies.

Preconditions:
- Firebase staging project initialized with 500 ride posts in Firestore.
- k6 load script (feed_browse.js) parameterized and tested locally.
- Real devices (1 Pixel 6a, 1 iPhone 13) provisioned and connected.
- Firebase Console, Sentry, and Prometheus dashboards open and live.
- Baseline database backup created (in case rollback needed).

Test Data:
- Campus filter: UCLA
- Date range: Next 7 days
- User sessions: 1,000 concurrent (virtual)
- Session duration: 40 min (5 min ramp-up, 30 min hold, 5 min ramp-down)
- Feed scroll rate: 20% of users refresh every 30s; 80% idle

Load Profile (k6 Script):
```javascript
export const options = {
  stages: [
    { duration: '5m', target: 1000 },   // Ramp up 0→1,000 users
    { duration: '30m', target: 1000 },  // Hold 1,000 users
    { duration: '5m', target: 0 },      // Ramp down 1,000→0
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],   // Pass if P95 <800ms
    http_req_failed: ['<0.005'],        // Pass if error rate <0.5%
  },
};
```

Execution Steps:
1. Start Firebase Console; confirm Firestore healthy (check quota usage, latencies).
2. Start Sentry live tail.
3. Start Prometheus scrape; open Grafana dashboard.
4. Open Android Studio Profiler on Pixel 6a; start CPU/memory recording.
5. Open Xcode Instruments on iPhone 13; start Allocations recording.
6. Run k6 command: `k6 run feed_browse.js --vus 100 --duration 60s -e FIREBASE_TOKEN=$(gcloud auth print-access-token)`
7. Monitor metrics continuously (watch for latency climb, error spikes).
8. At 5 min mark (end of ramp-up): Record baseline P50, P95, P99 latencies.
9. At 30 min mark (hold steady): Record sustained P95, error count.
10. At 35 min mark (start ramp-down): Verify system gracefully reduces load (no crashes).
11. At 40 min mark (end): Wait 2 min for recovery; record final metrics.
12. Real device validation (simultaneous with load test, 5-10 min samples):
    - Manually scroll feed on Pixel 6a; time transitions; record CPU/memory.
    - Manually scroll feed on iPhone 13; time transitions; record memory.
    - Note any hangs, crashes, or flickering.

Expected Results:
- P95 latency: <800ms (Threshold SLO)
- P99 latency: <1,200ms
- Error rate: <0.5%
- Firebase reads: ~8,500 reads/day (visible in console; <50K daily quota)
- Device CPU: <50% on Pixel 6a, <40% on iPhone 13
- Device memory: <200MB (Pixel 6a), <180MB (iPhone 13)
- No crashes or unhandled exceptions in Sentry
- Recovery time after ramp-down: <2 min

Pass/Fail Criteria:
- PASS: All thresholds met + device experience smooth + no Sev1 bugs.
- FAIL: Any threshold exceeded OR crash observed OR P95 >1s.

If Fail: Root Cause Analysis
1. Check Firestore console: are reads/writes throttled?
2. Check indexes: missing index on (origin, destination)?
3. Check k6 error log: which endpoint is slow?
4. Enable Firestore debug logs: run app locally with `firebase.firestore.setLoggingEnabled(true)`.
5. Profile Cloud Functions: check duration logs.
6. Remediate: optimize query, add index, fix pagination.
7. Redeploy; re-run test (max 2 re-runs per phase).

Artifacts & Evidence:
- k6 summary report (JSON export: `k6 run ... --out json=results.json`)
- Firebase Console screenshots (read ops, latencies, errors)
- Sentry error summary (if any)
- Device profiler exports (CPU/memory flame graphs)
- Test execution log (timestamps, observations)

Tester: __________ Date: __________ Time: __________ Result: [PASS/FAIL]
```

### 4.2 Test Case Library (All Scenarios)

| Test Case ID | Scenario | Objective | Load Profile | Expected P95 | Pass Criteria |
|--------------|----------|-----------|--------------|--------------|---------------|
| LT-SCN-001 | Feed Browse Baseline | Baseline KPIs | 1K users, 30 min | <800ms | Error rate <0.5% |
| LT-SCN-002 | Search Baseline | Search perf | 500 users, 30 min | <1s | Error rate <0.5% |
| LT-SCN-003 | Ride Post Baseline | Post creation | 100 users, 30 min | <1.5s | Writes <20K/day quota |
| LT-SCN-004 | Chat Baseline | Real-time chat | 1 ride, 100 requests | <800ms | <500ms notification delivery |
| LT-SCN-005 | Auth Baseline | Login peak | 500 logins in 3 min | <1s | Auth <1s, profile <500ms |
| LT-SCN-006 | Feed Browse Stress (2x) | Graceful degradation | 2K users, 60 min | <2s | Error rate <3% |
| LT-SCN-007 | Search Stress (3x) | Query overload | 1.5K users, 60 min | <2s | No missing indexes |
| LT-SCN-008 | Post Stress (3x) | Write quota pressure | 300 posts, rapid | <3s | Quota throttle OK; no data loss |
| LT-SCN-009 | Spike Test | Sudden surge | 0→2K in 30 sec, hold 10 min | Spikes <500ms | Errors ramp gradually |
| LT-SCN-010 | Soak Test | Memory leaks | 750 users, 6 hours | Stable | Memory creep <5% |
| LT-SCN-011 | Quota Pressure | Throttle handling | Rapid ops to 20K limit | Graceful errors | User message clear |
| LT-SCN-012 | Firestore Downtime | Offline handling | Disable Firestore | UX degrades gracefully | No crash, reconnect OK |
| LT-SCN-013 | Function Timeout | Async resilience | 5s delay on routing | Graceful queue | No unhandled rejection |
| LT-SCN-014 | Network Failover | Mobile resilience | Airplane mode toggle | Offline queue | Sync without duplicates |
| LT-SCN-015 | Mixed Worst-Case | Realistic peak | All scenarios 20% each | <2s P95 | No cascade failures |

---

## 5. Test Script Development & Parameterization

### 5.1 k6 Script Architecture

**Best Practice: Modular, Reusable Scripts**

```
/load-tests/
├── config/
│   ├── environments.json       # Env-specific settings (staging, prod)
│   ├── load-profiles.js        # Ramp patterns (baseline, stress, spike, soak)
│   └── thresholds.js           # SLO thresholds (shared across tests)
├── scenarios/
│   ├── feed-browse.js          # Feed scroll scenario
│   ├── search.js               # Search scenario
│   ├── ride-post.js            # Post creation scenario
│   ├── chat-request.js         # Chat + request scenario
│   └── auth-login.js           # Login scenario
├── utils/
│   ├── http-client.js          # Custom HTTP wrapper (retries, logging)
│   ├── firebase-auth.js        # Firebase Auth helpers
│   ├── data-generators.js      # Random data for parameterization
│   └── metrics.js              # Custom metric reporters
├── tests/
│   ├── baseline-feed.js        # Baseline test (scenario + profile)
│   ├── stress-feed.js          # Stress test
│   ├── spike-all.js            # Spike test
│   └── soak-all.js             # Soak test
└── README.md                   # Documentation
```

### 5.2 Example: Feed Browse Script (Modular)

**File: `/load-tests/scenarios/feed-browse.js`**

```javascript
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import * as metrics from '../utils/metrics.js';

/**
 * Feed Browse Scenario
 * Simulates user opening app → scrolling infinite feed
 * Parameterized for various load profiles
 */

export function feedBrowseScenario(options = {}) {
  const {
    campusId = 'UCLA',
    pageSize = 20,
    scrollRate = 0.3, // 30% of users scroll every 30s
    pauseMin = 5,
    pauseMax = 35,
  } = options;

  return function () {
    // Decide: 30% scroll, 70% idle
    if (Math.random() > scrollRate) {
      // Idle user (scroll once at start, then idle)
      if (__ITER === 0) {
        fetchFeed(campusId, pageSize);
      }
      sleep(Math.random() * (pauseMax - pauseMin) + pauseMin);
      return;
    }

    // Active user: scroll every 30s
    const pageNum = Math.floor(Math.random() * 10);
    fetchFeed(campusId, pageSize, pageNum);
    sleep(30);
  };
}

function fetchFeed(campusId, pageSize, pageNum = 0) {
  group('Feed Browse', () => {
    const url = `${__ENV.API_BASE_URL}/feeds/${campusId}?page=${pageNum}&pageSize=${pageSize}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`,
    };

    const startTime = new Date();
    const response = http.get(url, { headers });
    const latency = new Date() - startTime;

    // Custom metric
    metrics.recordLatency('feed_browse', latency);

    // Assertions
    const result = check(response, {
      'status 200': (r) => r.status === 200,
      'has rides': (r) => r.body && JSON.parse(r.body).rides.length > 0,
      'latency <800ms': (r) => latency < 800,
    });

    // Log failures
    if (!result) {
      metrics.recordError('feed_browse', response.status, latency);
    }
  });
}
```

**File: `/load-tests/tests/baseline-feed.js`**

```javascript
import { feedBrowseScenario } from '../scenarios/feed-browse.js';
import { baselineLoadProfile, thresholds } from '../config/load-profiles.js';

export const options = {
  stages: baselineLoadProfile, // [{ duration: '5m', target: 1000 }, ...]
  thresholds: thresholds,       // { 'http_req_duration': ['p(95)<800'], ... }
};

export default feedBrowseScenario({ scrollRate: 0.2 });
```

**Run:**
```bash
k6 run tests/baseline-feed.js \
  -e API_BASE_URL=https://rideboard-perf-staging.firebaseio.com \
  -e AUTH_TOKEN=$(gcloud auth print-access-token) \
  -e CAMPUS_ID=UCLA \
  --out json=results/baseline-feed-$(date +%s).json
```

### 5.3 Parameterization Best Practices

**1. Environment Variables (not hardcoded):**
```bash
# .env.staging
API_BASE_URL=https://rideboard-perf-staging.firebaseio.com
AUTH_TOKEN=<token>
FIRESTORE_PROJECT_ID=rideboard-perf-staging
DEVICE_ID=pixel6a
```

**2. Data Generation (realistic, varied):**
```javascript
// /load-tests/utils/data-generators.js
export function randomCampus() {
  const campuses = ['UCLA', 'USC', 'Caltech', 'CSUN'];
  return campuses[Math.floor(Math.random() * campuses.length)];
}

export function randomDestination() {
  const dests = ['LAX', 'Downtown LA', 'Santa Monica', 'Pasadena'];
  return dests[Math.floor(Math.random() * dests.length)];
}

export function randomDate() {
  const days = Math.floor(Math.random() * 7) + 1; // Next 7 days
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}
```

**3. Correlation (realistic user journeys):**
```javascript
// Example: Search → Click Result → View Details
export function searchToDetailsJourney() {
  // Step 1: Search
  const campus = randomCampus();
  const dest = randomDestination();
  const response = http.post(`${API_BASE_URL}/search`, {
    origin: campus,
    destination: dest,
  });
  const rides = JSON.parse(response.body).rides;

  // Step 2: Extract ride ID from results
  const rideId = rides[0].id; // Correlate with actual data

  // Step 3: View ride details
  http.get(`${API_BASE_URL}/rides/${rideId}`);
}
```

---

## 6. Test Execution Procedures

### 6.1 Pre-Execution Checklist (30 min before test)

**1 Hour Before:**
- [ ] All monitoring dashboards (Firebase, Sentry, Grafana) open in browser tabs.
- [ ] Real devices (Pixel 6a, iPhone 13) connected, profilers ready.
- [ ] k6 script syntax validated: `k6 lint tests/baseline-feed.js` ✓
- [ ] Test data seeded fresh (optional: restore from backup).
- [ ] Firebase quotas reset (console: check current daily usage).
- [ ] Notify team: "Load test starting in 1 hour; do not push to staging."

**15 min Before:**
- [ ] Start device profilers:
  - Android: `adb shell am start -n com.rideboard/MainActivity`
  - iOS: Launch Xcode Instruments (Allocations + System Trace).
- [ ] Confirm real devices responsive (scroll feed, make search request).
- [ ] Start Sentry live tail: open Sentry dashboard, enable live events.
- [ ] Start Firebase Perf console (ensure Performance tab visible).

**5 min Before:**
- [ ] Create test execution log file: `test-execution-LT-SCN-001-$(date +%Y%m%d-%H%M%S).md`
- [ ] Confirm k6 script has correct environment variables: `echo $API_BASE_URL`
- [ ] Dry-run k6 with 10 users for 30s to validate syntax + connectivity.
- [ ] Final check: all team members ready (QA, Ops, Backend dev on call).

### 6.2 Test Execution Flow (Per Test Case)

**Timeline Example: Baseline Feed Test (LT-SCN-001)**

```
T-00:00 START: k6 run tests/baseline-feed.js
        └─ Log: "Test started. Ramp-up phase begins."

T+05:00 MILESTONE: Ramp-up complete (1,000 users reached)
        Actions:
        └─ Record baseline metrics: P50, P95, P99 latencies from console
        └─ Observation: "Feed latency stable at 650ms P95; errors 0.1%"

T+10:00 CHECKPOINT: Mid-hold observation
        Actions:
        └─ Check device profilers: CPU <45%, memory <180MB
        └─ Check Firestore: reads ~33 ops/sec (expected: 1K users ÷ 30s = 33)
        └─ Watch for any error spike in Sentry

T+20:00 CHECKPOINT: Sustained load observation
        Actions:
        └─ Verify Firebase quota usage: ~10K reads consumed so far
        └─ Note: "No memory leaks detected on devices"

T+35:00 MILESTONE: Ramp-down begins (1,000 → 0 users)
        Actions:
        └─ Confirm latency drops proportionally
        └─ Device profilers: CPU/memory return to baseline

T+40:00 END: Test complete
        Actions:
        └─ Stop device profilers; export CPU/memory graphs
        └─ Export k6 results: `k6 run ... --out json=results.json`
        └─ Collect logs from Sentry, Firebase, Grafana
        └─ Summary: "Test completed successfully. All KPIs passed."
```

### 6.3 Test Execution Log Template

**File: `test-execution-LT-SCN-001-20260117-150000.md`**

```markdown
# Test Execution Log: LT-SCN-001 Feed Browse Baseline

**Test Case ID:** LT-SCN-001-FEED-BASELINE  
**Date:** 2026-01-17  
**Time:** 15:00–15:40 UTC  
**Tester:** John QA  
**Environment:** rideboard-perf-staging (Firebase)  

## Pre-Execution Checklist

- [x] Dashboards open (Firebase, Sentry, Grafana)
- [x] Devices connected (Pixel 6a, iPhone 13)
- [x] k6 script syntax validated
- [x] Test data seeded (500 rides, 200 users)
- [x] Firebase quota current: 2,500 reads / 50,000 daily (5% used)

## Test Execution Timeline

| Time | Event | Observation | Action |
|------|-------|-------------|--------|
| 15:00 | Test started | k6 ramp-up phase begins | Monitor dashboards |
| 15:05 | Ramp-up complete (1,000 users) | P95 latency = 680ms, errors = 0.1% | Baseline recorded ✓ |
| 15:10 | Mid-hold check | Firestore reads = 33 ops/sec (expected) | Continue monitoring |
| 15:15 | Device validation | Pixel 6a: CPU 42%, memory 175MB | Smooth scrolling observed |
| 15:20 | Sustained load | P95 latency = 720ms (stable) | Within SLO ✓ |
| 15:25 | Device validation | iPhone 13: CPU 38%, memory 160MB | Smooth scrolling observed |
| 15:30 | Continued hold | No errors in Sentry; Firestore quota = 8,500 reads used | Normal progression |
| 15:35 | Ramp-down begins (1,000 → 0) | Latency drops proportionally | Expected behavior |
| 15:40 | Test complete | Final P95 = 650ms; error rate = 0.08% | Test PASSED ✓ |

## Results Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| P95 Latency | <800ms | 720ms | ✓ PASS |
| P99 Latency | <1,200ms | 980ms | ✓ PASS |
| Error Rate | <0.5% | 0.08% | ✓ PASS |
| Firestore Reads/day | <50,000 | 8,500 | ✓ PASS |
| Device CPU | <50% | 42% (max) | ✓ PASS |
| Device Memory | <200MB | 175MB (max) | ✓ PASS |
| Crashes | 0 | 0 | ✓ PASS |

## Issues Identified

None. Test passed all criteria.

## Notes & Observations

- Feed queries are well-optimized; no N+1 issues detected.
- Firestore indexes working as expected.
- Device experience smooth throughout; no hangs or flickers.
- Memory stable (no creep over 40 min).

## Next Steps

Proceed to Stress Test (LT-SCN-006: 2x load).

**Signed:** John QA  
**Date:** 2026-01-17  
**Time:** 15:40 UTC
```

---

## 7. Monitoring, Data Collection & Analysis

### 7.1 Real-Time Monitoring Setup

**Firebase Console Metrics (Native):**

```
1. Firestore Dashboard:
   - Operations: Reads/sec, Writes/sec, Deletes/sec (real-time)
   - Latency: P50, P95, P99 percentiles (1-min rolling window)
   - Storage: Current size / 1 GiB limit
   - Real-time listeners: Current active (max 100 per project on free tier)
   
2. Cloud Functions Dashboard:
   - Invocation count (live)
   - Execution time: P50, P95, P99 (real-time)
   - Error rate (%)
   - Memory usage

3. Firebase Performance:
   - App startup time
   - Screen transitions (custom traces)
   - Network request latency

4. Firebase Crashlytics:
   - Crash-free users (%)
   - Top crash types
   - Live crash events
```

**Sentry Dashboard (Error Tracking):**

```
1. Live Events Stream:
   - New exceptions as they occur (real-time tail)
   - Breadcrumb trail (request → crash)
   
2. Release Health:
   - Crash-free users (%)
   - Healthy error budget
   
3. Performance Monitoring:
   - Transaction latency (HTTP requests)
   - Span breakdown (by function/component)

4. Alerts:
   - High error rate (>1%): [ALERT]
   - New crash type: [NOTIFICATION]
```

**Prometheus + Grafana Dashboard:**

```
Key Panels (Custom):
1. Load Curve: VUs over time (k6 export)
2. Latency Heatmap: P50, P95, P99 over test duration
3. Firestore Quota: Daily reads/writes used vs. limit (animated)
4. Error Rate: % of failed requests over time
5. Throughput: Requests/sec over time
6. Device Metrics: CPU, memory, battery (from profilers)
```

**Dashboard Screenshot Capture:**

```bash
# Automated dashboard screenshots (before, during, after test)
# Create a script to capture Grafana at key intervals
#!/bin/bash
TEST_NAME="baseline-feed"
INTERVAL=60 # seconds

for i in {1..40}; do
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  curl "http://localhost:3000/d/rideboard-metrics/rideboard-metrics" \
    > "screenshots/${TEST_NAME}-${TIMESTAMP}.html"
  sleep $INTERVAL
done
```

### 7.2 Data Collection Points

**Collect at These Intervals:**

| Interval | What to Collect | How | Frequency |
|----------|-----------------|-----|-----------|
| Every 1 min | Firestore latencies (P50, P95, P99), read/write ops/sec, errors | Firebase console screenshot | Continuous |
| Every 5 min | k6 current VU count, request rate, error rate | k6 live stdout + screenshot | Continuous |
| Every 10 min | Device CPU, memory, battery (if available) | Profiler export | Every 10 min |
| At milestones | Baseline (after ramp-up), sustained (mid-hold), recovery (after ramp-down) | Manual note + screenshot | 3x per test |
| Every 30 min | Sentry crash rate, error count | Dashboard screenshot | Continuous |
| After test | Full result export from k6, Firebase, Sentry, Grafana | JSON/CSV export | Once |

**Automated Data Collection Script:**

```bash
#!/bin/bash
# collect-metrics.sh
# Run during load test to automatically gather data

TEST_ID="LT-SCN-001"
RESULTS_DIR="results/${TEST_ID}-$(date +%s)"
mkdir -p $RESULTS_DIR

# Function: Export k6 metrics
export_k6_metrics() {
  sleep 2  # Wait for k6 to finish
  cp results.json "$RESULTS_DIR/k6-results.json"
  k6 run ... --out csv=metrics.csv
  cp metrics.csv "$RESULTS_DIR/"
}

# Function: Export Firebase logs
export_firebase_logs() {
  gcloud logging read \
    --filter 'resource.type=cloud_function' \
    --limit 1000 \
    --format json \
    > "$RESULTS_DIR/firebase-logs.json"
}

# Function: Export Sentry events
export_sentry_events() {
  curl -H "Authorization: Bearer ${SENTRY_TOKEN}" \
    "https://sentry.io/api/0/projects/org/rideboard/events/" \
    --output "$RESULTS_DIR/sentry-events.json"
}

# Function: Screenshot Grafana dashboard
screenshot_grafana() {
  curl "http://localhost:3000/api/annotations" \
    > "$RESULTS_DIR/grafana-dashboard.json"
}

# Main: Kick off collection in parallel
export_k6_metrics &
export_firebase_logs &
export_sentry_events &
screenshot_grafana &

wait
echo "All data collected to $RESULTS_DIR"
```

---

## 8. Industry-Standard Metrics & KPIs

### 8.1 Primary Metrics (Focus Here)

| Metric | Unit | Target (Normal) | Target (Stress) | Why It Matters |
|--------|------|---|---|---|
| **P95 Latency** | ms | <800 | <2,000 | 95% of users see response <800ms; tail latency impacts UX |
| **P99 Latency** | ms | <1,200 | <2,500 | Worst 1% of users; critical for outlier detection |
| **Error Rate** | % | <0.5 | <5 | Reliability; lower is better |
| **Throughput (RPS)** | req/sec | Baseline | ~2x baseline | Requests per second; test system capacity |
| **Concurrent Users (CCU)** | users | Target peak (1k–5k) | 2–3x peak | How many simultaneous users system supports |
| **Data Consistency** | binary | No data loss | No data loss | Zero-tolerance; no duplicates, no lost writes |

### 8.2 Secondary Metrics (System Health)

| Metric | Unit | Target | How to Monitor |
|--------|------|--------|---|
| **Firestore Quota Usage** | ops/day | <50K reads, <20K writes | Firebase console (live) |
| **Cloud Functions Duration** | ms P95 | <500 | Cloud Functions dashboard |
| **CPU Usage (Device)** | % | <50 | Android Profiler / Xcode Instruments |
| **Memory Usage (Device)** | MB | <200 | Android Profiler / Xcode Instruments |
| **Battery Drain Rate** | %/hour | <15 normal, <25 stress | iOS battery monitoring |
| **Network Connection Quality** | binary | No leaks | Monitor connection pool size |
| **Crash Rate** | % | 0 normal, <1 stress | Firebase Crashlytics |

### 8.3 Business Metrics (Optional, Post-MVP)

| Metric | Unit | Rationale |
|--------|------|-----------|
| **User Conversion** | % | If load test includes signup flow, track completion rate |
| **Cost per Request** | $ | Blaze plan: monitor GCP billing to track cost at scale |
| **Availability** | % | (Uptime) = (Total Time - Downtime) / Total Time |

### 8.4 Metric Calculation Examples

**Example 1: P95 Latency**
```
k6 output:
http_req_duration..............: avg=520ms, p(50)=480ms, p(90)=720ms, p(95)=850ms, p(99)=1.2s

Interpretation:
- 50% of requests <480ms ✓
- 95% of requests <850ms (Target: <800ms) ✗ SLIGHTLY OVER
- 99% of requests <1.2s ✓

Action: Investigate why some requests slow to 850ms. Check Firestore indexes.
```

**Example 2: Error Rate**
```
k6 output:
http_req_failed..................: 0.12% ✓ (5 failed / 4,300 total)

Interpretation:
- 0.12% error rate vs. target 0.5% ✓ PASS
- 5 failures: 3 × 429 Firestore throttle, 2 × timeout
  
Action: Expected throttle at free tier; no action needed.
```

**Example 3: Firestore Quota**
```
Firebase Console:
- Test duration: 30 min
- Reads/test: 1,000 users × 2 reads each × 30 min = 60,000 reads (WAIT!)
  That exceeds 50K daily quota!

Correction: Only ACTIVE users trigger reads (20% scroll every 30s).
- Actual: 1,000 users × 20% × (30 min ÷ 0.5 min) = 1,000 × 0.2 × 60 = 12,000 reads
- Against 50K daily: 12,000 = 24% of quota ✓ OK

Takeaway: Parameterize user behavior realistically.
```

---

## 9. Results Analysis & Reporting

### 9.1 Post-Test Analysis Checklist (2–4 hours after test)

**1. Export All Data:**
- [ ] k6 results exported to JSON.
- [ ] Firebase logs exported (Firestore ops, Functions duration).
- [ ] Sentry events exported (errors, crashes).
- [ ] Device profiler exports (CPU/memory graphs).
- [ ] Screenshots of all dashboards (Firebase, Grafana, Sentry).

**2. Metric Review:**
- [ ] P95 latency: compare to SLO target; flag if exceeded.
- [ ] Error rate: list all errors; categorize (429 throttle, timeout, 5xx).
- [ ] Quota usage: confirm stays within free tier.
- [ ] Device metrics: check for CPU spikes, memory creep.
- [ ] Crash rate: confirm 0 crashes on normal load.

**3. Trend Analysis:**
- [ ] Latency trend: stable flat line (good) or climb over time (bad, suggests leak)?
- [ ] Error rate trend: constant or accelerating?
- [ ] Firestore reads/sec: expected rate or unexpected spikes?

**4. Compare to Previous Runs:**
- [ ] Is P95 latency better/worse than last baseline? (Track week-over-week)
- [ ] Any new errors not seen before? (Regression?)

### 9.2 Test Report Template (Standard)

**File: `test-report-LT-SCN-001-20260117.md`**

```markdown
# Load Test Report: LT-SCN-001 Feed Browse Baseline

**Test ID:** LT-SCN-001  
**Test Name:** Feed Browse Baseline Load Test  
**Date Executed:** 2026-01-17  
**Tester:** John QA  
**Environment:** rideboard-perf-staging (Firebase)  
**Status:** ✓ PASSED

---

## Executive Summary

Feed browse baseline test **PASSED all criteria**. The app can support 1,000 concurrent users scrolling the feed with acceptable performance (P95 <800ms). No data loss or crashes observed. System ready for stress phase.

---

## Test Configuration

| Parameter | Value |
|-----------|-------|
| Load Profile | 0 → 1,000 users (5 min ramp), hold 30 min, ramp down (5 min) |
| Total Duration | 40 minutes |
| Concurrent Users (Peak) | 1,000 |
| Requests per User | 2 per 30 sec = 66 total requests per user in 30 min |
| Total Requests | ~66,000 |
| Scenario | Feed scroll: 20% of users scroll every 30 sec; 80% idle |

---

## Key Results

### Latency (Primary KPI)

| Percentile | Target | Actual | Status |
|-----------|--------|--------|--------|
| **P50** | - | 480 ms | ✓ |
| **P95** | <800 ms | 720 ms | ✓ PASS |
| **P99** | <1,200 ms | 980 ms | ✓ PASS |
| **Max** | - | 2,100 ms | ⚠ 1 outlier (likely cold start) |

**Latency Over Time:**
```
[Graph: P95 latency vs. time]
- 0–5 min (ramp-up): Latency climbs from 400ms to 750ms (expected)
- 5–35 min (hold): Stable at 720–750ms P95 (healthy)
- 35–40 min (ramp-down): Latency drops proportionally (expected)
```

### Error Rate (Primary KPI)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Overall Error Rate** | <0.5% | 0.08% | ✓ PASS |
| **429 Throttle Errors** | Expect 0 at <50K quota | 0 | ✓ PASS |
| **Timeout Errors** | Expect 0 | 0 | ✓ PASS |
| **5xx Errors** | Expect 0 | 0 | ✓ PASS |

### Firestore Quota Usage

| Metric | Free Tier Limit | Actual Used | % of Quota | Status |
|--------|---|---|---|---|
| **Reads** | 50,000 / day | 8,500 | 17% | ✓ PASS |
| **Writes** | 20,000 / day | 0 (read-only test) | 0% | ✓ PASS |
| **Storage** | 1 GiB | ~120 MiB | 12% | ✓ PASS |

**Quota Implications:** At 1,000 CCU, app uses ~8.5K reads per 30 min = ~17K reads/day in production. Free tier can sustain this.

### Device Performance

#### Android (Pixel 6a)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| CPU Usage | <50% | 42% (max) | ✓ PASS |
| Memory | <200 MB | 175 MB (peak) | ✓ PASS |
| Frame Rate | No drops | 58–60 fps | ✓ PASS |
| Crash Rate | 0% | 0 | ✓ PASS |

**CPU Over Time (30 min):**
```
[Graph: CPU % vs. time]
- Ramp-up: 20% → 40% (as users load)
- Steady: 40–42% (stable)
- Ramp-down: 42% → 15% (as users disconnect)
- No spikes or GC thrashing observed
```

**Memory Over Time (30 min):**
```
[Graph: Memory MB vs. time]
- Ramp-up: 100 MB → 160 MB
- Steady: 160–175 MB (stable)
- Ramp-down: 175 MB → 100 MB
- No creep; memory cleaned up on disconnect
```

#### iOS (iPhone 13 mini)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| CPU Usage | <50% | 38% (max) | ✓ PASS |
| Memory | <200 MB | 160 MB (peak) | ✓ PASS |
| Frame Rate | No drops | 59–60 fps | ✓ PASS |
| Battery Drain | <15%/hr | ~8%/hr | ✓ PASS |
| Crash Rate | 0% | 0 | ✓ PASS |

### Firestore Operations

| Operation | Volume | Rate | Duration (P95) | Status |
|-----------|--------|------|---|---|
| **Reads** | 8,500 | 33 ops/sec (avg) | 150–200 ms | ✓ |
| **Firestore Latency** | - | - | P95 = 180 ms | ✓ |
| **Real-time Listeners** | 1,000 | 1 listener per user | Active | ✓ |

**Firestore Latency Trend:**
```
[Graph: Firestore P95 latency vs. time]
- Stable at 180–200 ms throughout test
- No degradation as users accumulate
- No index build blockers observed
```

### Cloud Functions

| Metric | Count | Duration (P95) | Status |
|--------|-------|---|---|
| **Invocations** | 0 (read-only test) | N/A | N/A |
| **Errors** | 0 | N/A | N/A |

*(Functions not invoked in this read-only scenario; see LT-SCN-003 for post creation)*

### Sentry / Error Tracking

| Metric | Count | Status |
|--------|-------|--------|
| **Unhandled Exceptions** | 0 | ✓ PASS |
| **Crashes** | 0 | ✓ PASS |
| **Warnings** | 0 | ✓ PASS |

---

## Issues Identified

**Critical (Sev1):** None ✓

**Major (Sev2):** None ✓

**Minor (Sev3):** None ✓

---

## Root Cause Analysis (if issues found)

N/A (test passed)

---

## Observations & Recommendations

1. **Feed Queries Optimized:** Firestore latency stable at 180 ms; indexes working.
2. **Pagination Effective:** Only 8.5K reads for 66K requests indicates pagination working correctly.
3. **Device Performance Excellent:** CPU <50%, memory stable, no GC spikes on Android.
4. **Quota Usage Healthy:** At 1K CCU, app uses 17% of free tier daily quota; sustainable.

**Recommendations:**
- ✓ Proceed to Stress Test (2x load) tomorrow.
- ✓ Monitor Firestore index creation (watch "Indexes" tab).
- Monitor memory trend over longer soak test (6 hours).

---

## Artifact Links

| Artifact | Location | Notes |
|----------|----------|-------|
| k6 Results (JSON) | `results/baseline-feed-20260117.json` | Raw metrics, every request |
| k6 Summary | `results/baseline-feed-20260117-summary.txt` | Threshold results |
| Firebase Logs | `results/firebase-logs-20260117.json` | Firestore operations |
| Sentry Events | `results/sentry-events-20260117.json` | Errors/crashes (if any) |
| Device Profiler (Android) | `results/pixel6a-cpu-memory-20260117.csv` | CPU/memory timeline |
| Device Profiler (iOS) | `results/iphone13-allocations-20260117.trace` | Memory profile |
| Dashboard Screenshots | `results/screenshots/` | Before/during/after test |

---

## Approval & Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Tester | John QA | ________ | 2026-01-17 |
| QA Lead | Jane Manager | ________ | 2026-01-17 |
| Backend Lead | Bob Dev | ________ | 2026-01-17 |

---

## Next Steps

1. **Immediate:** Proceed to Stress Test (LT-SCN-006: 2x load) on 2026-01-18.
2. **Parallel:** Run Search Baseline (LT-SCN-002) same day.
3. **Weekly:** Schedule Soak Test (LT-SCN-010: 6 hours, overnight) next weekend.

**Gate Status:** ✓ PASS – Ready for next phase
```

---

## 10. Optimization & Remediation

### 10.1 Common Bottlenecks & Fixes

| Bottleneck | Symptom | Root Cause | Fix |
|-----------|---------|-----------|-----|
| **Firestore Query Slow** | P95 >1s on search | Missing index on (origin, dest, date) | Create index in Firestore console; wait 5 min |
| **N+1 Queries** | Latency climbs as users increase | Loop fetches user profile per ride (20 rides = 20 reads) | Batch: fetch 20 profiles in 1 read; cache |
| **Unbounded Listeners** | Memory creep on device | 1,000 real-time listeners subscribed | Unsubscribe when leaving screen; paginate listeners |
| **Cloud Functions Timeout** | 429 / timeout errors | Mapbox API call takes >6 sec | Async background work; return immediately; cache results |
| **App Memory Leak** | Memory grows 10% per hour | Event listeners not cleaned up | `useEffect` cleanup: remove listeners on unmount |
| **Quota Throttled** | 429 errors at 2–3x load | Writes exceed 20K/day limit | Batch writes; cache; optimize queries |

### 10.2 Fix Verification Loop

**After Each Fix:**

```
1. Implement fix in code (e.g., add Firestore index).
2. Deploy to staging: `gcloud functions deploy --staging-bucket ... staging`
3. Re-run baseline test (same scenario): `k6 run tests/baseline-feed.js --out json=results-rerun.json`
4. Compare P95 latency:
   - Before fix: 850 ms
   - After fix: 720 ms
   - Improvement: 130 ms ✓
5. If improvement <10%, investigate further.
6. If no improvement, try different fix.
```

### 10.3 Optimization Roadmap (Priority)

**Priority 1 (High Impact):**
- [ ] Add missing Firestore indexes (watch console suggestions).
- [ ] Batch Firestore reads (reduce reads by 50%).
- [ ] Cache user profiles (refresh every 5 min).

**Priority 2 (Medium Impact):**
- [ ] Optimize Cloud Functions (reduce payload, async work).
- [ ] Lazy-load images (reduce memory on devices).
- [ ] Debounce search input (reduce queries).

**Priority 3 (Low Impact):**
- [ ] Compress API payloads (gzip).
- [ ] Enable CDN caching for static assets.
- [ ] Monitor and alert on quota approaching limit.

---

## 11. Documentation & Sign-Off

### 11.1 Deliverables Checklist

By end of stress testing cycle, ensure:

- [ ] Stress Test Plan (Section 1–2 of main doc) signed by PM.
- [ ] Load Test Procedure (this document) signed by QA + Backend Lead.
- [ ] All test execution logs archived (per test case).
- [ ] All test reports generated + analyzed (per phase).
- [ ] k6 scripts checked into GitHub (`/load-tests/` branch).
- [ ] Monitoring/alerting configured in production.
- [ ] Runbook: "P95 latency >1s during peak; what to do?" documented.
- [ ] Upgrade path: "When to move to Blaze plan" documented.
- [ ] Rollback plan: "Critical issue found post-launch; how to revert?" documented.

### 11.2 Sign-Off Template (Final)

```markdown
# Load Testing Sign-Off

This document confirms that RideBoard app has completed industry-standard load testing
and is approved for production launch.

## Completed Phases

- [x] Phase 1: Baseline (all 5 scenarios passed)
- [x] Phase 2: Stress & Spike (2–3x load, graceful degradation confirmed)
- [x] Phase 3: Recovery & Resilience (failure scenarios tested, recovery validated)
- [x] Phase 4: Optimization (bottlenecks fixed, re-tested)

## Final KPI Summary

| KPI | Target | Actual | Status |
|-----|--------|--------|--------|
| P95 Latency (Baseline) | <800ms | 720ms | ✓ PASS |
| P95 Latency (Stress) | <2s | 1.8s | ✓ PASS |
| Error Rate (Baseline) | <0.5% | 0.08% | ✓ PASS |
| Error Rate (Stress) | <5% | 2.1% | ✓ PASS |
| Data Loss | 0 | 0 | ✓ PASS |
| Device Crashes | 0 | 0 | ✓ PASS |
| Free-Tier Quota | OK | 24% of daily limit at 1K CCU | ✓ PASS |

## Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | Jane Manager | __________ | 2026-01-24 |
| Backend Lead | Bob Dev | __________ | 2026-01-24 |
| Product Manager | Alice PM | __________ | 2026-01-24 |
| DevOps/Ops | Charlie Ops | __________ | 2026-01-24 |

## Known Limitations & Mitigations

1. **Free-Tier Quota:** At 5K CCU, app approaches Firestore write quota (20K/day).
   **Mitigation:** Upgrade to Blaze plan when DAU exceeds 500.

2. **Concurrent Listeners:** Firestore free tier limited to 100 concurrent real-time listeners.
   **Mitigation:** Paginate listeners; unsubscribe when not in use.

3. **Cold Start Latency:** First request after function deploy takes ~3s.
   **Mitigation:** Monitor; consider warming up critical functions post-deploy.

## Go-Live Approval

The app is approved for production launch on: **2026-01-25**

**Launch Plan:**
- Canary: 10% users (UCLA campus only) for 24 hours
- Scale: 50% → 100% if canary metrics healthy (P95 <1s, crash rate <0.5%)

**Monitoring:** Alerts configured in production; ops team on-call

**Rollback:** Procedure documented; can revert to previous build in <15 min if critical issue found

---

**Approved By:** QA Lead (Jane Manager)  
**Date:** 2026-01-24  
**Time:** 14:30 UTC
```

---

## Conclusion

This **Comprehensive Load Testing Procedure** document provides an industry-standard framework for validating RideBoard is production-ready. It covers:

✓ Pre-testing setup (environment, tools, data)  
✓ Test scenario design (6 types: baseline, stress, spike, soak, quota, recovery)  
✓ Test script development (modular, parameterized k6 scripts)  
✓ Execution procedures (step-by-step timelines)  
✓ Monitoring & data collection (real-time dashboards)  
✓ Metrics & KPIs (industry-standard: P95, error rate, quota)  
✓ Analysis & reporting (detailed reports, root cause analysis)  
✓ Optimization (fix bottlenecks, re-test)  
✓ Sign-off & approval (final gate for go-live)

**Follow this procedure sequentially to achieve industry-grade confidence that RideBoard will perform reliably under peak load.**

---

**Document Status:** Ready for Execution  
**Next Steps:**  
1. Review with team (QA, Backend, DevOps)  
2. Provision staging environment (Section 3)  
3. Begin Phase 1 baseline tests (Section 6)
