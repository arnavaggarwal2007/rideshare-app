# RideBoard Load Testing Suite

Industry-standard load testing infrastructure for the RideBoard mobile app.

## Overview

This suite provides comprehensive load testing following the procedures defined in `Documents/load_testing_procedure.md`.

## Directory Structure

```
load-tests/
├── config/
│   ├── environments.json      # Environment-specific settings
│   ├── load-profiles.js       # Ramp patterns for all test types
│   └── thresholds.js          # SLO thresholds and KPIs
├── scenarios/
│   ├── feed-browse.js         # Feed scrolling scenario
│   ├── search.js              # Search/filter scenario
│   ├── ride-post.js           # Ride creation scenario
│   ├── chat-request.js        # Chat and seat request scenario
│   └── auth-login.js          # Authentication scenario
├── tests/
│   ├── baseline-feed.js       # LT-SCN-001: Baseline feed test
│   ├── stress-feed.js         # LT-SCN-006: Stress feed test
│   ├── spike-all.js           # LT-SCN-009: Spike test
│   ├── soak-all.js            # LT-SCN-010: Soak test (6+ hours)
│   ├── mixed-workload.js      # LT-SCN-015: Mixed realistic workload
│   └── smoke-test.js          # Quick validation test
├── utils/
│   ├── http-client.js         # HTTP wrapper with retries
│   ├── firebase-auth.js       # Firebase Auth helpers
│   ├── data-generators.js     # Test data generation
│   └── metrics.js             # Custom metric collection
├── __tests__/
│   └── load-test-validation.test.js  # Jest validation suite
└── README.md
```

## Prerequisites

1. **Install k6**:
   ```bash
   # macOS
   brew install k6
   
   # Or via npm
   npm install -g k6
   ```

2. **Set Environment Variables**:
   ```bash
   export API_BASE_URL="https://your-firebase-project.firebaseio.com"
   export FIREBASE_API_KEY="your-api-key"
   export AUTH_TOKEN="your-auth-token"
   ```

## Running Tests

### Quick Smoke Test (2 min)
```bash
k6 run load-tests/tests/smoke-test.js
```

### Baseline Tests (40 min each)
```bash
# Feed Browse Baseline (LT-SCN-001)
k6 run load-tests/tests/baseline-feed.js \
  -e API_BASE_URL=$API_BASE_URL \
  -e AUTH_TOKEN=$AUTH_TOKEN
```

### Stress Tests (60 min)
```bash
# Feed Stress (LT-SCN-006)
k6 run load-tests/tests/stress-feed.js \
  -e API_BASE_URL=$API_BASE_URL
```

### Spike Test (20 min)
```bash
k6 run load-tests/tests/spike-all.js
```

### Soak Test (6+ hours)
```bash
# Run overnight
k6 run load-tests/tests/soak-all.js \
  --out json=results/soak-$(date +%Y%m%d).json
```

### Mixed Workload (40 min)
```bash
k6 run load-tests/tests/mixed-workload.js
```

## Test Types

| Test Type | Duration | Load | Purpose |
|-----------|----------|------|---------|
| Smoke | 2 min | 10 VUs | Quick validation |
| Baseline | 40 min | 1,000 VUs | Establish healthy KPIs |
| Stress | 60 min | 2-3x peak | Find breaking points |
| Spike | 20 min | 0→2K in 30s | Test sudden surge |
| Soak | 6+ hours | 50% peak | Detect memory leaks |
| Mixed | 40 min | All scenarios | Realistic workload |

## SLO Targets

### Baseline (Normal Load)
- **P95 Latency**: <800ms (feed), <1000ms (search), <1500ms (post)
- **Error Rate**: <0.5%
- **Device CPU**: <50%
- **Device Memory**: <200MB

### Stress (2-3x Load)
- **P95 Latency**: <2000ms
- **Error Rate**: <5%
- **Recovery Time**: <10 min

## Validation Tests

Run Jest tests to validate load test infrastructure:

```bash
npm test -- --testPathPattern="load-tests"
```

## Results

Test results are written to `results/` directory:
- `baseline-feed.json` - Baseline test metrics
- `stress-feed.json` - Stress test metrics
- `spike-test.json` - Spike test metrics
- `soak-test.json` - Soak test metrics
- `mixed-workload.json` - Mixed workload metrics

## CI/CD Integration

Add to GitHub Actions:

```yaml
load-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - name: Install k6
      run: |
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    - name: Run Smoke Test
      run: k6 run load-tests/tests/smoke-test.js
      env:
        API_BASE_URL: ${{ secrets.STAGING_API_URL }}
```

## References

- [Load Testing Procedure](../Documents/load_testing_procedure.md)
- [Stress Test Plan](../Documents/stress_test_plan.md)
- [k6 Documentation](https://k6.io/docs/)
