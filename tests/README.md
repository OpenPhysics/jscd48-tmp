# Testing Infrastructure

Comprehensive test suite for the CD48 library including unit tests, integration tests, accessibility, and E2E tests.

## Test Structure

```
tests/
├── e2e/                      # End-to-end tests
│   ├── examples.spec.js      # Tests for all example pages
│   ├── main-interface.spec.js     # Main interface tests
│   ├── accessibility.spec.js      # Accessibility tests
│   └── error-scenarios.spec.js    # Error handling tests
├── integration/              # Integration tests
│   └── cd48-integration.test.js   # Mock hardware tests
├── mock-cd48.js             # Mock CD48 device for testing
└── README.md                # This file
```

## Running Tests

### All Tests

```bash
npm run test:all              # Run all tests (unit + integration + E2E)
```

### Unit Tests (Vitest)

```bash
npm test                      # Run unit tests
npm run test:ui               # Run with Vitest UI
npm run test:coverage         # Run with coverage report
npm run test:bench            # Run benchmark tests
```

### Integration Tests

```bash
npm run test:integration      # Run integration tests with mock hardware
```

### E2E Tests (Playwright)

```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e:examples     # Test all example pages
npm run test:e2e:errors       # Error scenario tests
npm run test:e2e:headed       # Run with browser visible
npm run test:e2e:ui           # Run with Playwright UI
npm run test:e2e:debug        # Debug mode
npm run test:e2e:report       # View HTML report
```

## Test Coverage

### Unit Tests

Located in project root and individual module directories:

- Core CD48 functionality
- Validation utilities
- Error classes
- Analysis tools
- Calibration utilities

### Integration Tests

Tests using MockCD48 device:

- ✅ Connection lifecycle
- ✅ Rapid connect/disconnect cycles
- ✅ Data acquisition
- ✅ Auto-incrementing counts
- ✅ Rate measurements
- ✅ Error handling
- ✅ Concurrent operations
- ✅ Edge cases
- ✅ Long-running operations
- ✅ Data consistency

### E2E Tests - Example Pages

Tests for all 11 example pages:

- ✅ Examples Index
- ✅ Simple Monitor
- ✅ Error Handling Demo
- ✅ Demo Mode
- ✅ Multi-Channel Display
- ✅ Continuous Monitoring
- ✅ Coincidence Measurement
- ✅ Graphing & Charts
- ✅ Data Export
- ✅ Statistical Analysis
- ✅ Calibration Wizard
- ✅ Code Playground

### E2E Tests - Functionality

- ✅ Page loading without errors
- ✅ Search functionality
- ✅ Category filtering
- ✅ Code editor (CodeMirror)
- ✅ Template selection
- ✅ Tab switching
- ✅ Responsive design
- ✅ Accessibility

### Error Scenario Tests

- ✅ Syntax errors in code playground
- ✅ Runtime errors
- ✅ Missing resources
- ✅ No search results
- ✅ Network failures
- ✅ Unhandled JavaScript errors
- ✅ Console errors
- ✅ Empty code execution
- ✅ Special characters in input
- ✅ Missing Web Serial API
- ✅ Invalid data
- ✅ Error recovery

## Mock CD48 Device

The `MockCD48` class simulates a real CD48 device without hardware:

```javascript
import { MockCD48 } from './tests/mock-cd48.js';

const cd48 = new MockCD48({
  autoIncrement: true,          // Auto-increment counts
  incrementRate: 10,            // counts/sec per channel
  commandDelay: 10,             // Command response delay (ms)
  version: 'Mock v1.0.0',       // Firmware version
  initialCounts: [0, 0, ...],   // Starting counts
});

await cd48.connect();
const data = await cd48.getCounts();
```

### Mock Features

- Simulates all CD48 methods
- Auto-incrementing counts (configurable)
- Configurable delays and error conditions
- Test helpers (setCounts, failNextCommand, setDisconnectAfter)
- No hardware required

## Continuous Integration

Tests run automatically on:

- Pull requests
- Main branch commits
- Manual workflow dispatch

### CI Configuration

- Runs all test suites
- Retries flaky tests (2 retries)
- Uploads test artifacts
- Generates coverage reports

## Writing New Tests

### Unit Tests (Vitest)

```javascript
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
  it('should work correctly', () => {
    expect(true).toBe(true);
  });
});
```

### Integration Tests

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { MockCD48 } from '../mock-cd48.js';

describe('Integration Test', () => {
  let cd48;

  beforeEach(() => {
    cd48 = new MockCD48();
  });

  it('should connect and get data', async () => {
    await cd48.connect();
    const data = await cd48.getCounts();
    expect(data.counts).toHaveLength(8);
  });
});
```

### E2E Tests (Playwright)

```javascript
import { test, expect } from '@playwright/test';

test('my new feature', async ({ page }) => {
  await page.goto('/examples/my-example.html');
  await expect(page.locator('h1')).toBeVisible();
});
```

## Test Best Practices

1. **Keep tests isolated** - Each test should be independent
2. **Use meaningful names** - Describe what the test does
3. **Test one thing** - Focus on a single behavior
4. **Mock external dependencies** - Use MockCD48 for hardware
5. **Clean up resources** - Disconnect devices, clear state
6. **Handle async properly** - Use async/await
7. **Use appropriate timeouts** - Don't make tests flaky

## Debugging Tests

### Vitest

```bash
# Run specific test file
npm test tests/integration/cd48-integration.test.js

# Run in watch mode
npm test -- --watch

# Run with UI
npm run test:ui
```

### Playwright

```bash
# Run with browser visible
npm run test:e2e:headed

# Debug mode (pause and inspect)
npm run test:e2e:debug

# Run specific test
npm run test:e2e -- tests/e2e/examples.spec.js

# Run with trace
npm run test:e2e -- --trace on
```

## Test Metrics

- **Total Tests**: 100+ across all suites
- **E2E Coverage**: 11 example pages
- **Integration Tests**: 20+ scenarios
- **Error Scenarios**: 15+ cases

## Troubleshooting

### Tests Failing Locally

1. Ensure dev server is not already running
2. Clear test artifacts: `rm -rf tests/e2e-report`
3. Update dependencies: `npm install`
4. Check for port conflicts (8080)

### Flaky Tests

1. Increase timeouts
2. Add explicit waits
3. Check for race conditions
4. Use `waitForLoadState('networkidle')`

## Contributing

When adding new features:

1. Add unit tests for core functionality
2. Add integration tests for workflows
3. Add E2E tests for UI features
4. Update this README if needed
