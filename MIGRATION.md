# Migration Guide

This guide helps you migrate between major versions of jscd48.

## Migrating to v1.0.0

### Breaking Changes

#### 1. Module Exports

The package now uses proper ES module exports. If you were importing via CommonJS, you may need to update your imports:

**Before (CommonJS):**

```javascript
const CD48 = require('jscd48');
```

**After (ES Modules):**

```javascript
import CD48 from 'jscd48';
```

For CommonJS compatibility, use the UMD bundle:

```javascript
const CD48 = require('jscd48/dist/cd48.umd.js');
```

#### 2. New Package Exports

Individual modules can now be imported directly:

```javascript
// Import specific modules
import { Statistics, Histogram } from 'jscd48/analysis';
import { CalibrationProfile, CalibrationWizard } from 'jscd48/calibration';
import { validateChannel, voltageToByte } from 'jscd48/validation';
import { CD48Error, NotConnectedError } from 'jscd48/errors';
import { DevLogger, setupDevMode } from 'jscd48/dev-utils';
```

#### 3. measureRate() Returns Uncertainties

The `measureRate()` method now returns measurement uncertainties:

**Before:**

```javascript
const result = await cd48.measureRate(0, 1.0);
// { counts: 1000, duration: 1.0, rate: 1000, channel: 0 }
```

**After:**

```javascript
const result = await cd48.measureRate(0, 1.0);
// {
//   counts: 1000,
//   duration: 1.0,
//   rate: 1000,
//   channel: 0,
//   uncertainty: {
//     counts: 31.62,      // sqrt(1000)
//     rate: 31.62,        // Poisson uncertainty
//     relative: 3.16      // Percentage
//   }
// }
```

#### 4. measureCoincidenceRate() Returns Uncertainties

The `measureCoincidenceRate()` method now includes full uncertainty propagation:

**Before:**

```javascript
const result = await cd48.measureCoincidenceRate({ duration: 10 });
// { singlesA, singlesB, coincidences, rateA, rateB, ... }
```

**After:**

```javascript
const result = await cd48.measureCoincidenceRate({ duration: 10 });
// {
//   singlesA, singlesB, coincidences,
//   rateA, rateB, coincidenceRate, accidentalRate, trueCoincidenceRate,
//   uncertainty: {
//     singlesA: ...,
//     singlesB: ...,
//     coincidences: ...,
//     rateA: ...,
//     rateB: ...,
//     coincidenceRate: ...,
//     accidentalRate: ...,
//     trueCoincidenceRate: ...
//   }
// }
```

### New Features

#### 1. Auto-Reconnection

Enable automatic reconnection when the device disconnects:

```javascript
const cd48 = new CD48({
  autoReconnect: true,
  reconnectAttempts: 3,
  reconnectDelay: 1000,
});

cd48.onDisconnect(() => {
  console.log('Device disconnected, attempting to reconnect...');
});

cd48.onReconnect(() => {
  console.log('Successfully reconnected!');
});
```

#### 2. Rate Limiting

Prevent command flooding with built-in rate limiting:

```javascript
const cd48 = new CD48({
  rateLimitMs: 100, // Minimum 100ms between commands
});
```

#### 3. Manual Reconnection

Reconnect to a previously connected device without user interaction:

```javascript
// After initial connection and disconnect
await cd48.reconnect();
```

### Deprecated Features

None in this release.

### Removed Features

None in this release.

## Migrating from Pre-1.0 Development Versions

If you were using development versions before the official 1.0 release:

1. **Update all imports** to use the new export paths
2. **Update error handling** to use the new error classes from `jscd48/errors`
3. **Review measurement code** to handle the new uncertainty values
4. **Test auto-reconnection** if you were implementing manual reconnection logic

## TypeScript Support

Full TypeScript definitions are now included:

```typescript
import CD48 from 'jscd48';
import type { CD48Options, RateMeasurement } from 'jscd48';

const options: CD48Options = {
  baudRate: 115200,
  autoReconnect: true,
};

const cd48 = new CD48(options);
const result: RateMeasurement = await cd48.measureRate(0, 1.0);
```

Type definitions for sub-modules:

```typescript
import type { Statistics } from 'jscd48/analysis';
import type { CalibrationProfile } from 'jscd48/calibration';
```

## Getting Help

If you encounter issues during migration:

1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Review the [API Documentation](https://github.com/OpenPhysics/jscd48-tmp#api-reference)
3. Open an issue at https://github.com/OpenPhysics/jscd48-tmp/issues

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.
