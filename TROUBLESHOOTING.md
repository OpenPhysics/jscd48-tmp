# Troubleshooting Guide

This guide helps you diagnose and resolve common issues when using the jscd48 library with the CD48 Coincidence Counter.

## Table of Contents

- [Common Connection Issues](#common-connection-issues)
- [Browser Permission Problems](#browser-permission-problems)
- [Device Detection Failures](#device-detection-failures)
- [Performance Optimization Tips](#performance-optimization-tips)

---

## Common Connection Issues

### Issue: "Serial port already open" error

**Symptoms:** Cannot connect to device, error indicates port is already in use

**Solutions:**

1. Close any other applications using the serial port (Arduino IDE, serial monitors, etc.)
2. Ensure only one instance of your web application is running
3. Refresh your browser page to release the port
4. Check Chrome DevTools console for stuck connections

**Code example:**

```javascript
// Always disconnect before reconnecting
if (cd48.isConnected()) {
  await cd48.disconnect();
}
await cd48.connect();
```

### Issue: Connection drops unexpectedly

**Symptoms:** Device disconnects during operation, commands fail with "Not connected" error

**Solutions:**

1. Check USB cable connection - try a different cable
2. Verify USB port is providing adequate power
3. Update your browser to the latest version
4. Check for system sleep/hibernation settings
5. Ensure the CD48 firmware is up to date

**Prevention code:**

```javascript
// Implement connection monitoring
setInterval(async () => {
  if (!cd48.isConnected()) {
    console.warn('Device disconnected - attempting reconnect');
    try {
      await cd48.connect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }
}, 5000); // Check every 5 seconds
```

### Issue: Timeout errors when sending commands

**Symptoms:** `CommandTimeoutError` thrown when calling device methods

**Solutions:**

1. Increase the command delay:
   ```javascript
   const cd48 = new CD48({ commandDelay: 100 }); // Increase from default 50ms
   ```
2. Check USB connection quality
3. Verify device is powered on and functioning
4. Try a different USB port or hub

### Issue: Device not responding after initial connection

**Symptoms:** First few commands work, then device stops responding

**Solutions:**

1. Clear the input buffer before critical operations:
   ```javascript
   await cd48.clearCounts(); // Clears counters and buffer
   ```
2. Increase delays between rapid commands:
   ```javascript
   await cd48.getCounts();
   await cd48.sleep(100); // Add delay
   await cd48.getSettings();
   ```
3. Check for buffer overflow conditions

---

## Browser Permission Problems

### Issue: "Web Serial API not supported" error

**Symptoms:** `UnsupportedBrowserError` thrown when attempting to connect

**Solutions:**

1. Use a supported browser:
   - Chrome 89+
   - Edge 89+
   - Opera 75+
   - (Not supported: Firefox, Safari)
2. Verify you're using HTTPS or localhost (required for Web Serial API)
3. Check browser compatibility:
   ```javascript
   if (!CD48.isSupported()) {
     alert('Please use Chrome, Edge, or Opera browser');
   }
   ```

### Issue: User cancels the port selection dialog

**Symptoms:** `DeviceSelectionCancelledError` thrown

**Solutions:**

1. Provide clear UI instructions before triggering port selection
2. Implement graceful error handling:
   ```javascript
   try {
     await cd48.connect();
   } catch (error) {
     if (error instanceof DeviceSelectionCancelledError) {
       console.log('User cancelled device selection');
       // Show user-friendly message
     }
   }
   ```
3. Add a "Connect Device" button with clear labeling

### Issue: Browser blocks serial port access

**Symptoms:** Permission denied errors, no port selection dialog appears

**Solutions:**

1. Check browser settings (chrome://settings/content/serialPorts)
2. Ensure page is served over HTTPS or localhost
3. Clear browser permissions and try again
4. Check for browser extensions blocking access
5. Verify user gesture initiated the connection (must be from click/touch event)

**Good example:**

```javascript
// Connection must be initiated by user action
connectButton.addEventListener('click', async () => {
  await cd48.connect();
});
```

**Bad example:**

```javascript
// This will likely fail - not from user gesture
window.addEventListener('load', async () => {
  await cd48.connect(); // ❌ May be blocked
});
```

---

## Device Detection Failures

### Issue: CD48 device not appearing in port selection dialog

**Symptoms:** No devices listed, or CD48 not in the list

**Solutions:**

1. Verify the device is connected via USB
2. Check device drivers are installed (Cypress USB drivers)
3. Test the device in another application (Arduino Serial Monitor)
4. Try a different USB cable (ensure it's data-capable, not power-only)
5. Check USB port functionality with another device
6. Restart your computer

### Issue: Wrong device selected

**Symptoms:** Communication errors, invalid responses

**Solutions:**

1. The library filters for Cypress vendor ID (0x04b4):
   ```javascript
   // This is done automatically in connect()
   navigator.serial.requestPort({
     filters: [{ usbVendorId: 0x04b4 }],
   });
   ```
2. Disconnect other Cypress-based devices
3. Verify device is CD48 by checking firmware version:
   ```javascript
   const version = await cd48.getVersion();
   console.log('Firmware:', version);
   ```

### Issue: Device enumeration fails on Windows

**Symptoms:** Device manager shows unknown device, not detected by browser

**Solutions:**

1. Install Cypress USB drivers manually
2. Update Windows USB drivers
3. Check for Windows USB power management settings
4. Try a powered USB hub
5. Disable USB selective suspend in power settings

### Issue: Multiple CD48 devices connected

**Symptoms:** Need to connect to specific device among multiple units

**Solutions:**

1. Connect devices one at a time
2. Label devices physically
3. Implement device identification:
   ```javascript
   const cd48 = new CD48();
   await cd48.connect();
   const version = await cd48.getVersion();
   const settings = await cd48.getSettings();
   // Use version/settings to identify specific unit
   ```

---

## Performance Optimization Tips

### Optimize Data Collection Rate

**Issue:** Slow data acquisition

**Solutions:**

1. Use the repeat mode for continuous monitoring:

   ```javascript
   // Set automatic repeat every 100ms
   await cd48.setRepeat(100);
   await cd48.toggleRepeat(); // Enable

   // Now data streams automatically
   ```

2. Batch read operations when possible:

   ```javascript
   // Good - single call gets all channels
   const data = await cd48.getCounts();
   console.log(data.counts); // All 8 channels

   // Bad - multiple calls
   for (let i = 0; i < 8; i++) {
     await cd48.measureRate(i, 1); // Too slow!
   }
   ```

3. Reduce command delay for faster operations (if stable):
   ```javascript
   const cd48 = new CD48({ commandDelay: 30 }); // Reduce from 50ms
   ```

### Optimize for Real-time Graphing

**Issue:** UI freezes or lags during continuous monitoring

**Solutions:**

1. Use Web Workers for data processing:

   ```javascript
   // In worker: process and aggregate data
   // In main thread: just update UI
   ```

2. Throttle UI updates:

   ```javascript
   let lastUpdate = 0;
   const updateInterval = 100; // ms

   function updateChart(data) {
     const now = Date.now();
     if (now - lastUpdate < updateInterval) return;
     lastUpdate = now;
     chart.update(data);
   }
   ```

3. Use requestAnimationFrame for smooth rendering:

   ```javascript
   let dataQueue = [];

   function renderLoop() {
     if (dataQueue.length > 0) {
       const data = dataQueue.shift();
       updateChart(data);
     }
     requestAnimationFrame(renderLoop);
   }
   requestAnimationFrame(renderLoop);
   ```

### Reduce Memory Usage

**Issue:** Memory leak during long-running sessions

**Solutions:**

1. Implement circular buffers for data storage:

   ```javascript
   class CircularBuffer {
     constructor(size) {
       this.buffer = new Array(size);
       this.index = 0;
       this.size = size;
     }

     push(item) {
       this.buffer[this.index] = item;
       this.index = (this.index + 1) % this.size;
     }
   }

   const dataBuffer = new CircularBuffer(1000); // Keep last 1000 readings
   ```

2. Clean up old chart data:

   ```javascript
   // Limit chart data points
   if (chartData.length > 500) {
     chartData = chartData.slice(-500);
   }
   ```

3. Properly disconnect when done:
   ```javascript
   // Always clean up
   window.addEventListener('beforeunload', async () => {
     if (cd48.isConnected()) {
       await cd48.disconnect();
     }
   });
   ```

### Optimize Coincidence Measurements

**Issue:** Slow coincidence rate measurements

**Solutions:**

1. Choose optimal measurement duration:

   ```javascript
   // Too short: poor statistics
   // Too long: slow updates
   // Optimal: 1-5 seconds depending on count rate
   const result = await cd48.measureCoincidenceRate({ duration: 2.0 });
   ```

2. Pre-clear counters before critical measurements:

   ```javascript
   await cd48.clearCounts();
   // Ensures clean start
   ```

3. Use appropriate coincidence window:
   ```javascript
   // Default: 25ns
   // Adjust based on your detectors
   const result = await cd48.measureCoincidenceRate({
     duration: 1.0,
     coincidenceWindow: 25e-9, // 25 nanoseconds
   });
   ```

### Network and Browser Optimization

**Solutions:**

1. Use local development server, not file:// protocol
2. Disable browser extensions that may interfere
3. Use Chrome's Task Manager to monitor resource usage
4. Close unused tabs to free resources
5. Use production builds (minified bundles) in deployment:
   ```html
   <!-- Use minified UMD bundle for better performance -->
   <script src="https://cdn.jsdelivr.net/npm/jscd48@latest/dist/cd48.umd.min.js"></script>
   ```

---

## Additional Resources

- [Web Serial API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [CD48 Hardware Manual](https://github.com/OpenPhysics/jscd48-tmp)
- [Error Handling Guide](./ERROR_HANDLING.md)
- [API Documentation](./docs/api)

## Getting Help

If you're still experiencing issues:

1. Check the [Issues](https://github.com/OpenPhysics/jscd48-tmp/issues) page
2. Review the [examples](./examples) directory
3. Enable debug logging to gather more information:
   ```javascript
   // Add detailed logging
   cd48.sendCommand = async function (command) {
     console.log('Sending:', command);
     const response = await originalSendCommand.call(this, command);
     console.log('Received:', response);
     return response;
   };
   ```
4. Create a new issue with:
   - Browser and version
   - Operating system
   - Error messages and stack traces
   - Minimal reproduction code
