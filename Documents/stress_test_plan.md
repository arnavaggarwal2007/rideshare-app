# Industry-Standard Stress Testing Plan for RideBoard App

## Executive Summary

This document provides a complete, professional-grade stress testing framework for validating RideBoard (rideshare social platform) is production-ready before launch. The plan accounts for **Firebase Free Tier constraints** and uses open-source, zero-cost tooling to ensure the app can handle peak loads at your target scale (1k–5k concurrent users on a single campus at launch).

**Key Constraints (Free Tier):**
- Firestore: 50,000 reads/day, 20,000 writes/day, 1 GiB storage
- Cloud Functions: 2M invocations/month, 400K GB-sec compute
- Firebase Auth: 50,000 Monthly Active Users (MAUs)
- Cloud Storage: 1 GiB storage, 10 GiB outbound/month
- Hosting: 1 GiB storage, 10 GiB transfer/month

**Assumption:** All testing on free tier; when KPIs indicate production needs upgrades, upgrade paths are documented.

**Success Criteria:** App meets baseline KPIs at expected peak load; graceful degradation (not catastrophic failure) at 2–3x peak; zero data loss; documented recovery paths.

**Timeline:** 2–3 weeks for full cycle (baseline → stress → analysis → fixes → re-test).

---

## 1. Performance Requirements & Success Criteria

Define measurable KPIs before testing. These are realistic for a student social app on free-tier infrastructure.

### 1.1 Backend KPIs (Firebase/Firestore)

| Metric | Target (Normal Load) | Acceptable (2–3x Load) | Notes | Free Tier Impact |
|--------|----------------------|------------------------|-------|------------------|
| P95 API Latency (feed, search, post ride, chat) | <800ms | <2s | Core user journeys | Firestore writes throttle after 20K/day |
| Error Rate (timeouts, 429 throttle) | <0.5% | <5% | Controlled degradation | Will hit 429 at 2–3x normal |
| Firestore Reads/sec (avg) | ~10–15 ops/sec @ 5k CCU | Scale test only to 2x peak | Free tier = 50K reads/day = ~0.58/sec sustained | **Critical bottleneck** |
| Cloud Functions Duration (P95) | <500ms | <1s | Routing, notifications | 2M invocations/month @ 5k users = 66K/day budget |
| Concurrent Connections | 5k | 10k (read-only/cache) | Firestore real-time listeners | Test with listeners disabled if needed |

**Stress Test Gate:** All KPIs pass at or below free-tier daily quotas; system shows graceful errors (not crashes) when quotas approached.

### 1.2 Frontend KPIs (Mobile App)

| Metric | Target | Stress Threshold | Device Profile | Impact |
|--------|--------|------------------|-----------------|--------|
| App Launch Time | <3s | <5s | Pixel 6/iPhone 13 cold start | Firebase SDK init |
| Screen Transition | <1s | <2s | Feed → ride details under load | Network latency matters most |
| CPU Usage (foreground) | <50% | <70% | Mid-range device (Pixel 6) | Excessive polling/re-renders |
| Memory Usage | <200MB | <300MB (no leaks) | Steady-state, 10min session | Image/map caching issues |
| Crash Rate | 0% | <1% | Under normal + stress | Firebase SDK crashes |
| Battery Drain (1hr) | <15% | <25% | Continuous usage | Network/CPU load |

### 1.3 Deployment Gate Checklist

Before production launch, **all** of the following must be true:

- [ ] **Baseline Pass:** App meets all KPIs at expected peak load (100% load).
- [ ] **Stress Pass:** App degrades gracefully (not crashes) at 2–3x load; error rate <5%; recovery <10min.
- [ ] **Device Validation:** Manual QA on real Android (Pixel 6) + iOS (iPhone 13) confirms UX acceptable under stress.
- [ ] **No Sev1 Bugs:** No crashes, data loss, or auth failures observed.
- [ ] **No Sev2 Bugs:** No more than 2 "degraded UX" issues (e.g., feed lag); all have documented workarounds.
- [ ] **Free Tier Optimization:** All Firestore queries optimized; no N+1 queries; batch ops used where possible.
- [ ] **Monitoring Configured:** Sentry + Firebase Perf + Crashlytics alerts set for prod (launch day).
- [ ] **Rollout Plan:** 10% → 50% → 100% canary documented; rollback plan in place.

---

## 2. Test Scenarios (Mapped to RideBoard Flows)

Based on the RideBoard design spec (Instagram-style feed, search, ride posts, chat), prioritize these scenarios:

### 2.1 Scenario 1: Feed Browse Storm

**User Flow:** Open app → scroll infinite feed of ride posts (Firestore paginated queries).

**Load Profile:**
- 1,000–3,000 concurrent users scrolling.
- 20% refresh feed every 30s, 80% idle in feed.
- Each scroll = 1 Firestore read (paginated, 10–20 docs).

**Firestore Impact:** 1,000 users @ 1 read per 30s = ~33 reads/sec; **3x load = 100 reads/sec** (within free tier theoretical max, but real-world latency degrades fast).

**Success:** P95 latency <800ms normal; <2s at 3x; no crashes.

**Rationale:** Most common user action; core to retention. Holiday surge (Thanksgiving break routes) hammers this.

---

### 2.2 Scenario 2: Search/Filter Surge

**User Flow:** Smart search bar → filter rides (routes, date, detour slider) → tap result.

**Load Profile:**
- 500–1,500 concurrent complex searches.
- Each search = 1 Firestore compound query (origin, destination, date ranges, detour prefs).
- 5–10 results per search.

**Firestore Impact:** 500 users @ 1 search per 2min = ~4 reads/sec normally; **3x = 12 reads/sec** + index overhead.

**Success:** P95 <1s normally; <2s at 3x; search filters remain responsive.

**Rationale:** Peak during campus-to-airport runs; filters critical for UX. If slow, users bounce.

---

### 2.3 Scenario 3: Ride Post Creation Flood

**User Flow:** Driver taps "Post Ride" → fill origin/dest → Mapbox routing → upload car photo → publish.

**Load Profile:**
- 100–600 concurrent ride posts (esp. Thanksgiving week).
- Each post = 1 Firestore write (rides collection) + 1 Cloud Function (detour pre-calculation) + optional Cloud Storage (car photo).

**Firestore/Functions Impact:**
- 100 posts/min = 100 writes/sec; **free tier = 20K writes/day = 0.23/sec sustained**. **Will hit quota in <5 min at 2x load.**
- Each post invokes routing function → ~500ms; 100 invocations = 100 concurrent Cloud Functions.

**Success:** Posts queue gracefully at quota limit; error message clear ("We're processing a surge, try again in 1 min"); no lost writes; P95 <1s when under quota.

**Rationale:** Bottleneck scenario; tests quota handling and graceful degradation. Thanksgiving/event surges drive this.

---

### 2.4 Scenario 4: Chat/Request Spike

**User Flow:** Rider taps "Request Seat" on popular ride → opens trip group chat → sends message.

**Load Profile:**
- 1 popular ride (LAX before Thanksgiving) → 100+ request notifications in 5 min.
- Each request = 1 Firestore write (riders sub-collection) + 1 Cloud Function (notification) + 5–10 chat messages from negotiation.

**Firestore/Functions Impact:**
- 100 requests in 5 min = 20 writes/min; manageable.
- 100 notifications → 100 Function invocations; moderate but visible in metrics.

**Success:** Requests and chat remain snappy; notifications deliver <500ms; no message loss; group chat pagination works.

**Rationale:** Social proof driver ("Other riders requesting!"); high engagement signal. Tests real-time Firestore listeners under moderate spike.

---

### 2.5 Scenario 5: Auth Login Peak

**User Flow:** App launch → login (via email/Google).

**Load Profile:**
- 1,000 logins within 10 min (e.g., push notification at 8 AM: "Check out rides home for break!").

**Firebase Auth Impact:**
- 100 logins/min = 1.67/sec; free tier supports 50K MAU/month, no rate limit on logins within that. **OK.**
- But if 1 login = 1 Firestore read (user profile), that's 1K reads in 10 min = 100 reads/sec. **Exceeds free tier.**

**Success:** Auth <1s P95; profile fetch batched/cached; no auth timeouts; graceful offline fallback.

**Rationale:** App launch surges (after push) test cold-start paths and profile load timing.

---

### 2.6 Scenario 6: Mixed Worst-Case + Network Flaps

**User Flow:** All above running simultaneously; WiFi ↔ 4G switches mid-session.

**Load Profile:**
- 20% of load from each scenario above.
- 10% of users experience network drop/switch every 2 min.

**Success:** No cascade failures; app recovers from offline; no duplicate writes; connection pooling doesn't exhaust limits.

**Rationale:** Realistic mobile usage; tests resilience. iOS users often switch networks during commutes.

---

## 3. Environment & Tooling Setup

### 3.1 Infrastructure & Staging Environment

#### Firebase Project Setup
- **Create Dedicated Staging Project:** `rideboard-perf-staging` (separate from dev).
- **Configuration:**
  - Same Firestore rules and security policies as production.
  - Same Cloud Functions code (to test performance).
  - Same Mapbox API key (or mock if quota-bound).
  - **Billing:** Keep on free tier; monitor quotas closely during tests (set alerts at 80% daily quota).

#### Database Warm-Up
- Pre-populate Firestore with realistic data:
  - 500 ride posts (varied routes, times, preferences).
  - 200 user profiles (drivers + riders).
  - 50 chat threads with 5–10 messages each.
  - Target: ~100 MiB data (stays under 1 GiB free limit).

#### Network & Device Lab
- **Real Devices:**
  - Android: Pixel 6a (baseline), Samsung Galaxy A52 (low-end).
  - iOS: iPhone 13 mini (budget), iPhone 15 (recent).
  - Networks: WiFi (5GHz), 4G LTE (throttled to 25 Mbps down / 10 Mbps up to simulate real mobile).

- **Emulators/Simulators (for scale testing):**
  - Android emulator x 10 (on CI machine, Docker, to simulate 50–100 virtual users from feed scrolling).
  - iOS simulator x 5 (for quick device validation).

- **Test Device Setup:**
  - Release APK + IPA (not debug; release performance matters).
  - Firebase Performance SDK + Sentry SDK enabled.
  - Expo Go for quick iteration during dev phase; final stress tests use release builds.

---

### 3.2 Open-Source Tooling Stack (100% Free)

| Tool | Purpose | Setup | Why Free |
|------|---------|-------|----------|
| **k6 (Grafana k6 OSS)** | Backend API load generation | Install locally or Docker; script in JavaScript | Open-source, no pricing tier; runs on your infra. Can generate 1K+ virtual users from single machine. |
| **Appium + WebDriverIO** | Mobile automation (real devices) | Open-source; runs on any machine with USB. | Free automation framework; controls real phones remotely. |
| **Firebase Console + Crashlytics** | Monitoring, error tracking | Built into Firebase; enable in app code (free). | Included with free Firebase tier. |
| **Sentry (Self-Hosted or Free Tier)** | APM + error tracking | Free tier = 1M events/month. | Generous free tier for startup phase. |
| **Prometheus + Grafana (Docker)** | Real-time metrics dashboards | Open-source; run locally or on free tier VM. | Unlimited open-source dashboards. |
| **Android Studio Profiler** | CPU/memory/battery on device | Built into Android Studio (free). | First-party; no cost. |
| **Xcode Instruments** | iOS profiling | Built into Xcode (free with macOS). | First-party. |
| **Charles Proxy / Fiddler** | API tracing for test script generation | Free versions available. | Capture real app traffic; replay in load tests. |

---

### 3.3 Staging Setup Checklist

- [ ] Firebase project created + Firestore initialized.
- [ ] Firestore security rules deployed (same as prod).
- [ ] Cloud Functions deployed (with console logging for bottleneck analysis).
- [ ] Test data seeded (500 rides, 200 users, 50 chats).
- [ ] k6 installed locally; test scripts written + parameterized.
- [ ] Appium + WebDriverIO installed; mobile automation scripts recorded.
- [ ] Real devices provisioned; Firebase SDK + Sentry integrated.
- [ ] Monitoring dashboards (Firebase Console + Sentry) configured.
- [ ] Network throttling profiles created (4G, WiFi).
- [ ] CI/CD integration (GitHub Actions) ready to trigger stress runs on-demand.

**Estimated Effort:** 2–3 days of preparation.

---

## 4. Stress Test Execution Process

Execute in phases, building complexity. **Total: 2–3 weeks**, with feedback loops.

### 4.1 Phase 1: Baseline (Day 1–2)

**Objective:** Establish healthy baseline KPIs at expected peak load; identify smoke issues.

#### 4.1.1 Feed Browse Baseline

```
1. Start monitoring (Firebase Console open, Sentry live tail, Prometheus scrape).
2. Run k6 script (feed_browse.js):
   - Ramp: 0 → 1,000 users over 5 min.
   - Hold: 1,000 users for 30 min (normal expected peak).
   - Ramp down: 1,000 → 0 over 5 min.
   - Assertion: P95 latency <800ms, error rate <0.5%.
3. Record metrics:
   - Firestore read ops/sec.
   - P50, P95, P99 latencies.
   - Error count (4xx, 5xx, timeouts).
   - Firebase console: read quota used (should be <50K reads/day).
4. Analyze:
   - Did latency stay stable? (Yes = good, No = queries not optimized).
   - Any 429 throttle errors? (No = within quota, Yes = optimize).
5. Run on real devices in parallel:
   - 1 Android (Pixel 6a), 1 iOS (iPhone 13).
   - Manually scroll feed for 10 min; time screen transitions; check memory/CPU.
```

**Success Criteria:**
- P95 <800ms ✓
- <0.5% errors ✓
- Feed feels smooth on real devices ✓
- Firebase read quota usage visible but reasonable ✓

**If Fail:**
- Check Firestore indexes: missing index on (origin, destination, date)?
- Check query efficiency: are queries reading more docs than shown (pagination broken)?
- Enable Firestore debug logs: `firebase.firestore.setLoggingEnabled(true)` in app.
- Fix, re-deploy, re-run (max 2 re-runs per phase).

---

#### 4.1.2 Search/Filter Baseline

```
1. Run k6 script (search_surge.js):
   - Ramp: 0 → 500 users over 5 min.
   - Hold: 500 users for 30 min (each user searches every 2 min).
   - Ramp down: 500 → 0 over 5 min.
   - Assertion: P95 <1s, error rate <0.5%.
2. Search patterns (parameterized):
   - 40% exact match (UCLA → LAX).
   - 30% with detour filter (within 15 min).
   - 30% with date range (next 3 days).
3. Record metrics: same as above + index creation overhead (if any).
4. Real device test:
   - Perform 10 searches on Pixel 6a; measure response time.
```

**Success Criteria:**
- P95 <1s ✓
- <0.5% errors ✓
- No missing indexes ✓

---

#### 4.1.3 Ride Post Baseline

```
1. Run k6 script (ride_post.js):
   - Ramp: 0 → 100 users over 5 min.
   - Hold: 100 users for 30 min (each user posts every 20 min = 5 posts/user total).
   - Assertion: P95 <1.5s, error rate <0.5%.
2. Metric focus:
   - Firestore writes/sec.
   - Cloud Functions invocations (check logs for duration).
   - Cloud Storage upload time (if car photo included).
3. Real device test:
   - Record one ride post flow on Pixel 6a; measure each step (location entry, photo, publish).
```

**Success Criteria:**
- Writes stay under free tier quota (20K/day) ✓
- Functions invoke and complete <500ms P95 ✓
- No write failures ✓

---

#### 4.1.4 Chat Request Baseline

```
1. Run k6 script (chat_request.js):
   - Simulate 1 popular ride receiving 100 request notifications in 5 min.
   - Each requestor sends 3 chat messages (negotiation).
   - Assertion: P95 <800ms, error rate <0.5%.
2. Metric focus:
   - Real-time listener subscriptions (Firebase logs).
   - Message write + delivery latency.
3. Real device test:
   - Open 1 ride, send 10 requests from different devices; measure notification + chat delivery <2s.
```

**Success Criteria:**
- Notifications deliver <500ms ✓
- Group chat messages sync <1s ✓
- No lost messages ✓

---

#### 4.1.5 Auth Login Baseline

```
1. Run k6 script (auth_login.js):
   - Ramp: 0 → 500 logins over 3 min.
   - Assertion: P95 <1s, error rate <0.5%.
2. Metric focus:
   - Firebase Auth token generation time.
   - User profile fetch (should be batched/cached).
3. Real device test:
   - Cold start app; login on Pixel 6a; measure time to feed display.
```

**Success Criteria:**
- Login <1s P95 ✓
- Profile fetch <500ms (cached after first load) ✓

---

### 4.2 Phase 2: Stress & Spike (Day 3–7)

**Objective:** Push to 2–3x peak load; observe graceful degradation; measure breaking points; test recovery.

#### 4.2.1 Stress Test (2x Peak)

Run each scenario at 2x normal load, hold for 60 min. Example for feed browse:

```
1. Start monitoring.
2. Run k6 script (feed_browse.js) with:
   - Ramp: 0 → 2,000 users over 5 min.
   - Hold: 2,000 users for 60 min.
   - Ramp down: 2,000 → 0 over 5 min.
   - Assertion: P95 <2s (degraded but acceptable), error rate <3%.
3. Watch for:
   - Does latency slowly climb, then plateau? (Good = system has ceiling.)
   - Do errors cluster around quota limits? (Expected; indicates quota pressure.)
   - Any cascade failures? (Bad; needs investigation.)
4. Real device test (during stress):
   - 1 Pixel 6a + 1 iPhone 13 both scrolling feed while backend at 2,000 users.
   - Expected: slower scroll, but app doesn't crash.
5. After ramp down:
   - Wait 10 min; record recovery time (when do metrics return to normal?).
```

**Success Criteria:**
- Latency 2x (acceptable degradation) ✓
- Error rate <3% (controlled) ✓
- No app crashes on devices ✓
- Recovery within 10 min ✓

**If Fail (E.g., Crash at 2x):**
- Run Sentry/Crashlytics; find root cause.
- Common issues: Firestore query reading too many docs; memory leak from listeners; rate-limit storm.
- Fix, re-deploy, re-run.

---

#### 4.2.2 Spike Test

Simulate sudden traffic spike (e.g., "10% off code" notification pushed):

```
1. Run k6 script (spike.js):
   - Steady: 500 users for 5 min (warm-up).
   - Spike: 0 → 2,000 users in 30 sec.
   - Hold: 2,000 users for 10 min.
   - Ramp down: 2,000 → 500 over 5 min.
2. Focus:
   - How fast does latency spike? (Immediately = no backpressure.)
   - Do errors spike or gradual ramp? (Gradual = better queueing.)
   - Do connections exhaust (e.g., Firestore listener limits)?
3. Real device test:
   - Simultaneously launch app on 5 devices; all try to fetch feed at once.
```

**Success Criteria:**
- Latency spikes <500ms (not 10s+) ✓
- Errors ramp gracefully, don't cascade ✓
- Apps recover to normal responsiveness after spike passes ✓

---

#### 4.2.3 Soak Test (Endurance)

Run moderate load for hours; detect memory leaks, connection exhaustion:

```
1. Run k6 script (soak.js):
   - Constant: 750 users (50% of peak) for 6 hours.
   - Mix: 50% feed scroll, 30% search, 20% post/chat.
2. Monitor continuously:
   - Memory usage (Firestore SDK, Cloud Functions).
   - Open connections (should not grow unbounded).
   - CPU utilization (should not drift upward).
3. Checkpoints:
   - 1hr: Metrics normal?
   - 3hr: Any memory creep? Connection growth?
   - 6hr: P95 latency still <800ms?
```

**Success Criteria:**
- Memory stable (no creep >5% over 6hr) ✓
- Connections stable ✓
- P95 latency consistent (not degrading hour-by-hour) ✓

**If Memory Creep Detected:**
- Check Firestore listeners: are subscriptions being cleaned up?
- Check Cloud Functions: any open file handles or streams?
- Review app code: any unbounded caches?

---

#### 4.2.4 Quota Pressure Test

Intentionally hit free-tier quotas; validate graceful handling:

```
1. Run k6 script (quota_pressure.js):
   - Rapid ride post creation: 100 posts/min for 5 min.
   - Expected: ~500 writes; free tier limit = 20K/day, so only ~2.5% of daily quota.
   - But test error handling anyway.
2. Inject Firestore throttle (manually in staging console, or via Cloud Functions logging):
   - Simulate hitting 20K writes/day quota early (e.g., at 3 PM instead of midnight).
   - Expect: 429 errors, retry logic kicks in.
3. Real device test:
   - Post ride while throttling active; capture error message and retry UX.
```

**Success Criteria:**
- App shows user-friendly error message ("We're processing a surge; try again in 60 sec") ✓
- Retry logic auto-retries without user action ✓
- No silent failures (data loss) ✓

---

### 4.3 Phase 3: Recovery & Resilience (Day 8–9)

**Objective:** Test failure scenarios; validate recovery paths; confirm no data loss.

#### 4.3.1 Simulate Firestore Downtime

```
1. Use Firestore emulator or disable read/write (via security rules).
2. Run mixed load against degraded backend.
3. Expected:
   - App shows "No connection" banner (not blank screen).
   - Offline queue accumulates writes.
   - When connection restored, writes sync without duplication.
4. Real device test:
   - Toggle airplane mode mid-chat; verify message queues; restore WiFi; messages send.
```

**Success Criteria:**
- UX degrades gracefully (clear error, not crash) ✓
- Offline writes sync without duplication ✓

---

#### 4.3.2 Simulate Cloud Function Timeout

```
1. Inject 5-sec delay in routing function (test code).
2. Post 50 rides; each invokes slow function.
3. Expected:
   - Functions either timeout or queue.
   - Posts fail gracefully if function timeout; user sees "Try again" option.
4. Monitor Cloud Functions logs for timeout count.
```

**Success Criteria:**
- No unhandled promise rejections ✓
- User-facing error message clear ✓

---

#### 4.3.3 Network Failure + Recovery

```
1. Real device (Pixel 6a):
   - Open app (feed loads).
   - Enable airplane mode (immediate).
   - Scroll (offline behavior test).
   - Disable airplane mode; wait for reconnect.
   - Verify feed resyncs without duplicates.
2. Repeat with 4G toggle.
```

**Success Criteria:**
- Offline state handled (cached data shown or "no connection" message) ✓
- Reconnect re-syncs without duplicates ✓

---

### 4.4 Phase 4: Root Cause Analysis & Optimization (Day 10–14)

If any phase fails, iterate:

```
1. Analyze logs/metrics from failed runs.
2. Common bottlenecks (in order):
   a. Firestore query missing index → add index, wait 5 min.
   b. Firestore reads/writes exceed quota → batch operations, cache results, optimize queries.
   c. Cloud Functions slow (>1s) → profile code, reduce payload size, cache third-party API calls.
   d. Mobile app memory leak → Xcode Instruments on iOS, Android Profiler on Android; search for GC pressure.
   e. Mobile app crashes → Sentry trace; often auth token expiration or nil reference.
3. Re-run baseline + stress tests for fixed scenario.
4. Gate: All baselines + stress tests pass before Phase 2 complete.
```

---

## 5. Monitoring & Metrics Collection

### 5.1 Backend Metrics (Firebase Console + Sentry)

**Firebase Console (Native):**
- Read ops/sec, Write ops/sec, Delete ops/sec.
- Latency percentiles (P50, P95, P99).
- Stored data size.
- Real-time listener count.

**Cloud Functions (Firebase Console):**
- Invocation count, execution duration (P50, P95, P99).
- Memory usage.
- Error rate.

**Cloud Firestore Index Creation:**
- Monitor "Indexes" tab for slow index builds (can block writes).

**Sentry / Error Tracking:**
- Exception count by type.
- Crash-free users %.
- Release health.

**Setup Monitoring Dashboard (Prometheus + Grafana):**

```yaml
# docker-compose.yml for local monitoring
version: '3'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
volumes:
  prometheus_data:
```

**prometheus.yml:**
```yaml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: 'firebase'
    # Use Firebase admin SDK to export metrics to Prometheus
    static_configs:
      - targets: ['localhost:9090']
```

**Key Dashboards:**
1. **Real-time Load:** Active users, requests/sec, errors/sec.
2. **Latency:** P50, P95, P99 over time.
3. **Firestore Quota:** Daily reads/writes used vs. limit (animated).
4. **Cloud Functions:** Invocations, duration, errors.
5. **Mobile Crashes:** Crash rate, top crashes by version.

---

### 5.2 Frontend Metrics (Mobile App)

**Firebase Performance SDK (automatic):**
- App startup time.
- Screen load time (feed, search results, ride details).
- Network request latency (auto-instrumented).

**Manual Instrumentation (optional, for critical paths):**
```javascript
// React Native example
import { performance } from './firebase-config';

const startMark = 'feed-load-start';
const endMark = 'feed-load-end';

performance.mark(startMark);
// ... fetch and render feed ...
performance.mark(endMark);
performance.measure('feed-load', startMark, endMark);

// Upload to Firebase
firebase.performance().recordCustomMetric('feed-load-ms', measure.duration);
```

**Crash Reporting (Firebase Crashlytics):**
- Automatic: all uncaught exceptions.
- Manual: `firebase.crashlytics().recordError(error)`.

**Device-Level Profiling (During Stress):**
- **Android Studio Profiler:**
  - CPU: flame graph (look for GC spikes, main-thread hangs).
  - Memory: heap snapshot (search for leaks).
  - Battery: power profile (network radio on-time).
- **Xcode Instruments:**
  - System Trace: main thread blocking.
  - Allocations: memory growth.
  - Leaks: detect memory leaks.

---

### 5.3 Metrics Collection & Reporting Template

For each test run, complete a report:

```markdown
# Test Run Report: Feed Browse Baseline

**Date:** 2026-01-17  
**Scenario:** Feed Browse Baseline  
**Load Profile:** 0 → 1,000 users over 5 min; hold 30 min; ramp down.  
**Environment:** Firebase staging project; k6 local; 1 Pixel 6a, 1 iPhone 13.  

## Results

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| P95 Latency | <800ms | 750ms | ✓ PASS |
| P99 Latency | <1200ms | 1100ms | ✓ PASS |
| Error Rate | <0.5% | 0.2% | ✓ PASS |
| Firebase Reads | <50K/day | 8,500/day | ✓ PASS |
| App Crash Rate | 0% | 0% | ✓ PASS |

## Device Testing

| Device | Network | CPU | Memory | Notes |
|--------|---------|-----|--------|-------|
| Pixel 6a | WiFi | 45% | 180MB | Smooth scrolling |
| iPhone 13 | WiFi | 38% | 165MB | Smooth scrolling |

## Issues Found

- None.

## Observations

Feed queries optimized; indexes working. Memory stable. Ready for stress test phase.

## Next Steps

Proceed to Stress Test (2x load).
```

---

## 6. Optimization Strategies (Free Tier)

If tests reveal bottlenecks, apply these tactics **before upgrading to Blaze plan:**

### 6.1 Firestore Optimization

**Problem:** Reads hitting 50K/day limit.

**Solutions:**
1. **Pagination:** Only fetch 10–20 docs per page; lazy-load next page on scroll.
2. **Caching:** Cache user profiles, ride tags in app state; refresh every 5 min.
3. **Batch Reads:** Batch 10 user profile fetches in 1 operation (1 read) instead of 10 reads.
4. **Indexes:** Add compound indexes for common filters (origin, destination, date). Firebase suggests via console.
5. **Listeners:** Unsubscribe from Firestore listeners when leaving screen; avoid N+1 subscriptions.

**Example (Pagination):**
```javascript
// Bad: reads all rides every time
const allRides = await firestore.collection('rides').get();

// Good: paginated
const pageSize = 20;
let query = firestore.collection('rides').limit(pageSize);
const firstPage = await query.get(); // 1 read for 20 docs
const lastDoc = firstPage.docs[firstPage.docs.length - 1];
const nextPageQuery = firestore.collection('rides').startAfter(lastDoc).limit(pageSize);
```

**Example (Caching):**
```javascript
// Cache in Redux/Context; refresh every 5 min
const [userProfileCache, setUserProfileCache] = useState({});
const [cacheTime, setCacheTime] = useState(null);

const getUserProfile = async (userId) => {
  if (userProfileCache[userId] && (now - cacheTime) < 5 * 60 * 1000) {
    return userProfileCache[userId]; // 0 reads
  }
  const doc = await firestore.collection('users').doc(userId).get(); // 1 read
  setUserProfileCache({ ...userProfileCache, [userId]: doc.data() });
  setCacheTime(now);
  return doc.data();
};
```

---

### 6.2 Cloud Functions Optimization

**Problem:** Functions timeout or exceed GB-sec quota.

**Solutions:**
1. **Async Work:** Move slow work (e.g., Mapbox API calls) to async; return response quickly.
2. **Caching:** Cache Mapbox routing results in Firestore (e.g., "LAX to UCLA takes 45 min, 25 miles") for 24 hr.
3. **Reduce Payload:** Don't download entire user profile if only need avatar URL.

**Example (Async Routing):**
```javascript
// Bad: function waits for Mapbox response (10s timeout risk)
exports.calculateRoute = functions.https.onCall(async (data, context) => {
  const route = await mapbox.getRoute(data.origin, data.destination);
  return { distance: route.distance, time: route.time };
});

// Good: async background work
exports.calculateRoute = functions.https.onCall((data, context) => {
  // Return immediately
  functions.firestore.document(`routeCache/${cacheKey}`).set(
    { calculating: true, createdAt: now }
  );
  // Kick off async work
  mapbox.getRoute(data.origin, data.destination).then((route) => {
    firestore.doc(`routeCache/${cacheKey}`).update({
      calculating: false,
      distance: route.distance,
      time: route.time
    });
  });
  return { status: 'calculating' };
});
```

---

### 6.3 Mobile App Optimization

**Problem:** App slow or crashes under stress.

**Solutions:**
1. **Lazy Load Images:** Use `Image.prefetch()` or react-native-fast-image with caching.
2. **FlatList Virtualization:** Ensure feed uses `FlatList` (not ScrollView); set `removeClippedSubviews={true}`.
3. **Debounce Inputs:** Debounce search input (300ms) to avoid query spam.
4. **Memory Leaks:** Unsubscribe from listeners in `useEffect` cleanup.

**Example (FlatList):**
```javascript
<FlatList
  data={rides}
  renderItem={({ item }) => <RideCard ride={item} />}
  keyExtractor={(item) => item.id}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  onEndReached={loadMoreRides}
/>
```

**Example (Debounce Search):**
```javascript
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

const [searchText, setSearchText] = useState('');

const debouncedSearch = useMemo(
  () => debounce((text) => {
    firestore.collection('rides').where('destination', '==', text).limit(10).get();
  }, 300),
  []
);

const handleSearchChange = (text) => {
  setSearchText(text);
  debouncedSearch(text);
};
```

---

## 7. Deployment Readiness Checklist

Before launching to production, confirm:

### 7.1 Test Results
- [ ] Baseline (100% load): all KPIs pass.
- [ ] Stress (2–3x load): graceful degradation, no crashes.
- [ ] Soak (6 hr): no memory leaks, connection stable.
- [ ] Recovery: system recovers within 10 min after spike.
- [ ] Device validation: manual QA on 2 Android, 2 iOS phones; smooth UX.

### 7.2 Code Quality
- [ ] All Sev1/Sev2 bugs fixed and re-tested.
- [ ] Firestore queries optimized (no N+1, all indexes created).
- [ ] Cloud Functions optimized (<500ms P95).
- [ ] Mobile app memory stable (no GC spikes, no leaks).
- [ ] Error handling: user-friendly messages for quota/timeout errors.

### 7.3 Monitoring
- [ ] Sentry configured; alert on error rate spike.
- [ ] Firebase Perf enabled; baselines set.
- [ ] Firebase Crashlytics enabled; alerts on new crash.
- [ ] Custom dashboards (Grafana) deployed for ops team.
- [ ] Escalation plan: who to page if P95 >2s on launch day?

### 7.4 Documentation
- [ ] Stress test results documented (this report).
- [ ] Known limits documented (e.g., "Feed starts degrading at 4k concurrent users on free tier").
- [ ] Upgrade path clear (e.g., "Firestore reads exceed quota? Switch to Blaze plan + optimize queries").
- [ ] Rollback plan: steps to revert if critical issue post-launch.

### 7.5 Rollout Plan
- [ ] Canary: 10% users (specific campus or iOS only) for 24 hr.
- [ ] Metrics target: P95 <1s, crash rate <0.5%, errors <1%.
- [ ] If metrics green, proceed to 50%.
- [ ] If metrics red, rollback and debug.
- [ ] Full rollout once 50% stable for 48 hr.

---

## 8. Free Tier Limitations & Upgrade Path

### 8.1 When to Upgrade to Blaze Plan

Monitor these metrics post-launch. If any are consistently high, upgrade:

| Metric | Free Tier Limit | When to Upgrade |
|--------|-----------------|-----------------|
| Firestore Reads | 50K/day | Average >40K/day sustained |
| Firestore Writes | 20K/day | Average >15K/day sustained |
| Cloud Functions Invocations | 2M/month | Average >60K/day |
| Cloud Functions Compute | 400K GB-sec/month | Functions running >1s frequently |
| Data Transfer | 10 GiB/month | Image/download traffic >8 GiB/month |
| Firebase Auth MAUs | 50K | More than 40K unique users/month |

**Upgrade Impact:** Blaze plan is pay-as-you-go. Example costs (rough):
- 50K Firestore reads/day × 30 days = 1.5M reads/month × $0.06/100K = **$0.90/month**.
- 20K Firestore writes/day × 30 days = 600K writes/month × $0.18/100K = **$1.08/month**.
- 5M Cloud Function invocations × $0.40/million = **$2.00/month**.
- Total: **~$4–10/month** for small production scale (1–10k DAU).

### 8.2 Optimization Before Upgrade

Before upgrading, try:
1. Increase caching (reduce reads by 50%).
2. Batch operations (reduce writes by 30%).
3. Enable CDN for static assets (reduce data transfer).
4. Archive old data (reduce storage).

Often these optimizations keep free tier viable longer.

---

## 9. Post-Launch Monitoring (Week 1)

After production launch, run continuous monitoring:

### 9.1 Daily Health Check (First 7 Days)

```
Each morning, verify:
- Crash rate <0.5% (Crashlytics dashboard).
- P95 latency <1s (Firebase Perf).
- Error rate <1% (Sentry).
- Firestore quota usage <80% of daily limit (console).
- User growth tracking vs. forecast.
```

### 9.2 Weekly Perf Test

```
Every Friday, run:
- Baseline stress test (30 min, 1x expected peak).
- Compare P95 latency to last week.
- Adjust capacity plan if trending up.
```

### 9.3 Upgrade Decision

If metrics approaching limits, trigger upgrade + optimization sprint.

---

## 10. Test Scripts & Artifacts

### 10.1 k6 Load Test Scripts (Examples)

**file: feed_browse.js**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 1000 },   // Ramp up
    { duration: '30m', target: 1000 },  // Hold
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['<0.5%'],
  },
};

export default function () {
  const campusId = 'UCLA';
  const pageNum = Math.floor(Math.random() * 10);

  const res = http.get(
    `https://rideboard-perf-staging.firebaseio.com/feeds/${campusId}?page=${pageNum}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__ENV.FIREBASE_TOKEN}`,
      },
    }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 800ms': (r) => r.timings.duration < 800,
  });

  sleep(Math.random() * 30 + 5); // Random 5-35 sec between scrolls
}
```

**Run:**
```bash
k6 run feed_browse.js \
  --vus 100 \
  --duration 60s \
  -e FIREBASE_TOKEN=$(gcloud auth print-access-token)
```

---

### 10.2 Appium Mobile Automation Script (Example)

**file: feed_scroll_automation.js**
```javascript
const wd = require('webdriverio');
const assert = require('assert');

const opts = {
  path: '/wd/hub',
  port: 4723,
  capabilities: {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'Pixel6a',
    'appium:app': '/path/to/app.apk',
  },
};

async function feedScrollTest() {
  let driver = await wd.remote(opts);

  try {
    // Wait for feed to load
    const feedElement = await driver.$('[data-testid="feed-list"]');
    await feedElement.waitForDisplayed({ timeout: 5000 });

    // Scroll 10 times, measure response time
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      await driver.execute('mobile: swipe', {
        direction: 'up',
        percent: 0.75,
      });
      const duration = Date.now() - startTime;
      console.log(`Scroll ${i + 1}: ${duration}ms`);
      assert(duration < 500, `Scroll took ${duration}ms, expected <500ms`);

      await driver.pause(500); // Wait between scrolls
    }

    console.log('✓ Feed scroll test passed');
  } finally {
    await driver.deleteSession();
  }
}

feedScrollTest().catch(console.error);
```

**Run:**
```bash
npm install webdriverio @wdio/cli
npx appium start --port 4723 &
node feed_scroll_automation.js
```

---

### 10.3 Monitoring Dashboard Config (Grafana JSON)

**Exported Grafana Dashboard** (can import to any Grafana instance):

```json
{
  "dashboard": {
    "title": "RideBoard Stress Test Metrics",
    "panels": [
      {
        "title": "Firestore Reads/sec",
        "targets": [
          {
            "expr": "rate(firestore_reads_total[1m])"
          }
        ]
      },
      {
        "title": "P95 Latency (ms)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_ms_bucket[1m]))"
          }
        ]
      },
      {
        "title": "Error Rate (%)",
        "targets": [
          {
            "expr": "rate(http_requests_failed_total[1m]) * 100"
          }
        ]
      }
    ]
  }
}
```

---

## 11. Appendix: Quick Reference

### 11.1 Free Tier Daily Quotas (Firestore)

| Operation | Free Tier / Day | Rough Per-Second (Sustained) |
|-----------|-----------------|------------------------------|
| Document Reads | 50,000 | 0.58/sec |
| Document Writes | 20,000 | 0.23/sec |
| Document Deletes | 20,000 | 0.23/sec |
| Stored Data | 1 GiB | N/A |

**Rule of Thumb:** At 5k concurrent users, each doing 1 read every 30s, you need 5,000 ÷ 30 ≈ **167 reads/sec**. This **exceeds free tier by 290x**. Free tier is for <100 daily active users with light usage. For 5k CCU, upgrade to Blaze immediately after soft launch validation.

---

### 11.2 Cloud Functions Free Tier / Month

| Resource | Free Tier / Month | Notes |
|----------|-------------------|-------|
| Invocations | 2,000,000 | ~66K/day |
| GB-seconds | 400,000 | At 512MB, = 800K seconds |
| CPU-seconds | 400,000 | 2nd Gen only |
| Data Egress | 5 GiB | Network out to internet |

---

### 11.3 Common Firestore Query Mistakes (Test to Catch)

1. **N+1 Queries:** Loop fetches user profile for each ride (20 rides = 20 queries). **Fix:** Batch or cache.
2. **Full Collection Scans:** `collection('rides').get()` without filter. **Fix:** Add `where()` filter + index.
3. **Missing Indexes:** Query filters on multiple fields without index. **Fix:** Firestore console suggests; click to create.
4. **Unbounded Real-Time Listeners:** Subscribe to 1000 documents. **Fix:** Paginate or unsubscribe when leaving screen.

---

### 11.4 Expected Metrics by Scale (for Reference)

| Metric | 100 DAU | 1K DAU | 5K DAU | 10K DAU |
|--------|---------|--------|--------|---------|
| Peak CCU | ~10 | ~100 | ~500 | ~1,000+ |
| Firestore Reads/day | ~1K | ~10K | ~50K+ | ~100K+ |
| Firebase Auth MAUs | 100 | 1K | 5K | 10K |
| Free Tier Sufficient? | ✓ Yes | ✓ Yes | ✗ No (Blaze) | ✗ No (Blaze) |

---

## 12. Sign-Off & Approval

This stress test plan is approved for execution on the RideBoard app staging environment. All stakeholders confirm understanding of free-tier constraints, test objectives, and deployment gates.

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering Lead | [TBD] | 2026-01-17 | [ ] |
| QA Lead | [TBD] | 2026-01-17 | [ ] |
| Product Manager | [TBD] | 2026-01-17 | [ ] |

---

## 13. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-16 | Stress Test Plan Team | Initial draft; free-tier optimized |

---

**Document Status:** Ready for Execution  
**Next Steps:** Provision staging environment (Section 3.3 checklist); begin Phase 1 baseline tests (Section 4.1).
