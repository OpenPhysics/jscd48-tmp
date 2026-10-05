/**
 * CD48 Coincidence Counter - Web Serial API Interface
 *
 * A JavaScript library for controlling the Red Dog Physics CD48
 * Coincidence Counter via the Web Serial API.
 *
 * Requires Chrome 89+ or Edge 89+
 *
 * @example
 * const cd48 = new CD48();
 * await cd48.connect();
 * const version = await cd48.getVersion();
 * console.log('Firmware:', version);
 * const counts = await cd48.getCounts();
 * console.log('Counts:', counts);
 * await cd48.disconnect();
 */

import {
  UnsupportedBrowserError,
  NotConnectedError,
  ConnectionError,
  DeviceSelectionCancelledError,
  CommandTimeoutError,
  InvalidResponseError,
  InvalidChannelError,
  CommunicationError,
  OverflowError,
} from './errors.js';

import {
  validateBinaryInput,
  validateChannel,
  validateDuration,
  voltageToByte,
} from './validation.js';

const COMMAND_TIMEOUT_MS = 1000;
const READ_TIMEOUT_INTERVAL_MS = 100;
const INPUT_DRAIN_MS = 15;
const RESPONSE_IDLE_GAP_MS = 50;

class CD48 {
  /**
   * Create a CD48 interface instance.
   * @param {Object} options - Configuration options
   * @param {number} options.baudRate - Baud rate (default: 115200)
   * @param {number} options.commandDelay - Delay after commands in ms (default: 50)
   * @param {boolean} options.autoReconnect - Enable auto-reconnection (default: false)
   * @param {number} options.reconnectAttempts - Max reconnection attempts (default: 3)
   * @param {number} options.reconnectDelay - Delay between reconnect attempts in ms (default: 1000)
   * @param {number} options.rateLimitMs - Minimum ms between commands (default: 0)
   */
  constructor(options = {}) {
    this.baudRate = options.baudRate || 115200;
    this.commandDelay = options.commandDelay || 50;
    this.autoReconnect = options.autoReconnect || false;
    this.reconnectAttempts = options.reconnectAttempts || 3;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.rateLimitMs = options.rateLimitMs || 0;
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.readableStreamClosed = null;
    this.writableStreamClosed = null;
    this._lastCommandTime = 0;
    this._rateLimitLock = Promise.resolve();
    this._pendingRead = null;
    this._reconnecting = false;
    this._onDisconnect = null;
    this._onReconnect = null;
    this._boundHandleDisconnect = null;
  }

  /**
   * Set callback for disconnect events.
   * @param {Function} callback - Function called on disconnect
   */
  onDisconnect(callback) {
    this._onDisconnect = callback;
  }

  /**
   * Set callback for reconnect events.
   * @param {Function} callback - Function called on successful reconnect
   */
  onReconnect(callback) {
    this._onReconnect = callback;
  }

  /**
   * Check if Web Serial API is supported.
   * @returns {boolean}
   */
  static isSupported() {
    return 'serial' in navigator;
  }

  /**
   * Connect to the CD48 device.
   * Opens a serial port picker dialog for the user.
   * @returns {Promise<boolean>} True if connected successfully
   */
  async connect() {
    if (!CD48.isSupported()) {
      throw new UnsupportedBrowserError();
    }

    try {
      // Request port with Cypress VID filter
      this.port = await navigator.serial.requestPort({
        filters: [{ usbVendorId: 0x04b4 }], // Cypress Semiconductor
      });

      await this._setupConnection();
      return true;
    } catch (error) {
      await this._cleanupConnection();
      if (error.name === 'NotFoundError') {
        throw new DeviceSelectionCancelledError();
      }
      throw new ConnectionError(error.message, error);
    }
  }

  /**
   * Set up connection streams after port is opened.
   * @private
   */
  async _setupConnection() {
    await this.port.open({ baudRate: this.baudRate });

    // Set up reader and writer
    const textDecoder = new TextDecoderStream();
    this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    const textEncoder = new TextEncoderStream();
    this.writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
    this.writer = textEncoder.writable.getWriter();

    this._boundHandleDisconnect = () => {
      void this._handleDisconnect();
    };
    if (typeof this.port.addEventListener === 'function') {
      this.port.addEventListener('disconnect', this._boundHandleDisconnect);
    }

    // Wait for device to initialize
    await this.sleep(500);
  }

  /**
   * Handle an unexpected port disconnect the same way the TypeScript client does.
   * @private
   */
  async _handleDisconnect() {
    if (this._onDisconnect) {
      this._onDisconnect();
    }
    if (this.autoReconnect) {
      await this._attemptAutoReconnect();
    }
  }

  /**
   * Attempt to reconnect to the device.
   * @returns {Promise<boolean>} True if reconnected successfully
   */
  async reconnect() {
    if (this._reconnecting) {
      return false;
    }

    this._reconnecting = true;

    try {
      // Clean up existing connection
      await this._cleanupConnection();

      // Get previously granted ports
      const ports = await navigator.serial.getPorts();
      const cd48Port = ports.find((p) => {
        const info = p.getInfo();
        return info.usbVendorId === 0x04b4;
      });

      if (!cd48Port) {
        throw new ConnectionError('No previously connected CD48 device found');
      }

      this.port = cd48Port;
      await this._setupConnection();

      if (this._onReconnect) {
        this._onReconnect();
      }

      return true;
    } finally {
      this._reconnecting = false;
    }
  }

  /**
   * Attempt auto-reconnection with retries.
   * @returns {Promise<boolean>} True if reconnected successfully
   * @private
   */
  async _attemptAutoReconnect() {
    if (!this.autoReconnect || this._reconnecting) {
      return false;
    }

    for (let attempt = 1; attempt <= this.reconnectAttempts; attempt++) {
      try {
        await this.sleep(this.reconnectDelay * attempt);
        const success = await this.reconnect();
        if (success) {
          return true;
        }
      } catch {
        // Continue to next attempt
      }
    }

    return false;
  }

  /**
   * Clean up connection resources.
   * @private
   */
  async _cleanupConnection() {
    this._abandonPendingRead();
    if (this.reader) {
      try {
        await this.reader.cancel();
        await this.readableStreamClosed.catch(() => {});
      } catch {
        // Ignore cleanup errors
      }
      this.reader = null;
    }
    if (this.writer) {
      try {
        await this.writer.close();
        await this.writableStreamClosed;
      } catch {
        // Ignore cleanup errors
      }
      this.writer = null;
    }
    if (this.port) {
      if (
        this._boundHandleDisconnect &&
        typeof this.port.removeEventListener === 'function'
      ) {
        this.port.removeEventListener(
          'disconnect',
          this._boundHandleDisconnect
        );
        this._boundHandleDisconnect = null;
      }
      try {
        await this.port.close();
      } catch {
        // Ignore cleanup errors
      }
      this.port = null;
    }
  }

  /**
   * Disconnect from the CD48 device.
   */
  async disconnect() {
    await this._cleanupConnection();
    if (this._onDisconnect) {
      this._onDisconnect();
    }
  }

  /**
   * Check if connected to device.
   * @returns {boolean}
   */
  isConnected() {
    return this.port !== null && this.reader !== null;
  }

  /**
   * Sleep for specified milliseconds.
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Serialize write/read. The rate-limit sleep stays inside the lock, which
   * is released only after the framed read finishes.
   * @template T
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   * @private
   */
  async _withCommandLock(fn) {
    const previousLock = this._rateLimitLock;
    let resolveCurrentLock;
    this._rateLimitLock = new Promise((resolve) => {
      resolveCurrentLock = resolve;
    });

    try {
      await previousLock;
      if (this.rateLimitMs > 0) {
        const elapsed = Date.now() - this._lastCommandTime;
        if (elapsed < this.rateLimitMs) {
          await this.sleep(this.rateLimitMs - elapsed);
        }
      }
      try {
        return await fn();
      } finally {
        this._lastCommandTime = Date.now();
      }
    } finally {
      resolveCurrentLock();
    }
  }

  /**
   * @returns {Promise<{value: string, done: boolean, timeout?: boolean}>}
   * @private
   */
  _armPendingRead() {
    if (this._pendingRead === null) {
      if (!this.reader) {
        this._pendingRead = Promise.resolve({ value: '', done: true });
      } else {
        const pending = this.reader.read().then((result) => ({
          value: result.value ?? '',
          done: result.done,
        }));
        pending.catch(() => {});
        this._pendingRead = pending;
      }
    }
    return this._pendingRead;
  }

  /**
   * @param {number} waitMs
   * @returns {Promise<{value: string, done: boolean, timeout?: boolean}>}
   * @private
   */
  async _readFor(waitMs) {
    const pending = this._armPendingRead();
    const result = await Promise.race([
      pending,
      this.sleep(Math.max(0, waitMs)).then(() => ({
        value: '',
        done: false,
        timeout: true,
      })),
    ]);
    if (!result.timeout) {
      this._pendingRead = null;
    }
    return result;
  }

  /**
   * Discard bytes already buffered. A read that is still pending is kept.
   * @private
   */
  async _drainPendingInput() {
    const deadline = Date.now() + INPUT_DRAIN_MS;
    while (Date.now() < deadline) {
      const remaining = Math.max(1, deadline - Date.now());
      const result = await this._readFor(remaining);
      if (result.timeout || result.done || result.value === '') {
        return;
      }
    }
  }

  /**
   * Read until an idle gap after at least one line. Do not return a partial
   * buffer when the overall timeout expires.
   * @param {string} command
   * @returns {Promise<string>}
   * @private
   */
  async _readFramedResponse(command) {
    let response = '';
    let sawLine = false;
    let lastDataAt = Date.now();
    const started = Date.now();

    while (Date.now() - started < COMMAND_TIMEOUT_MS) {
      const remaining = COMMAND_TIMEOUT_MS - (Date.now() - started);
      if (remaining <= 0) break;

      const idleFor = Date.now() - lastDataAt;
      if (
        sawLine &&
        idleFor >= RESPONSE_IDLE_GAP_MS &&
        this._pendingRead === null
      ) {
        return response.trim();
      }

      const waitMs = sawLine
        ? Math.min(remaining, Math.max(1, RESPONSE_IDLE_GAP_MS - idleFor))
        : Math.min(remaining, READ_TIMEOUT_INTERVAL_MS);

      const result = await this._readFor(waitMs);
      if (result.timeout) {
        if (sawLine && Date.now() - lastDataAt >= RESPONSE_IDLE_GAP_MS) {
          return response.trim();
        }
        continue;
      }
      if (result.done) break;

      if (result.value) {
        response += result.value;
        lastDataAt = Date.now();
        if (response.includes('\r') || response.includes('\n')) {
          sawLine = true;
        }
        continue;
      }

      if (sawLine) {
        const gap = RESPONSE_IDLE_GAP_MS - (Date.now() - lastDataAt);
        if (gap > 0) {
          await this.sleep(
            Math.min(
              gap,
              Math.max(0, COMMAND_TIMEOUT_MS - (Date.now() - started))
            )
          );
        }
        if (Date.now() - started >= COMMAND_TIMEOUT_MS) break;
        const follow = await this._readFor(1);
        if (follow.timeout || follow.done || !follow.value) {
          return response.trim();
        }
        response += follow.value;
        lastDataAt = Date.now();
        continue;
      }

      await this.sleep(
        Math.min(READ_TIMEOUT_INTERVAL_MS, Math.max(1, remaining))
      );
    }

    this._abandonPendingRead();
    throw new CommandTimeoutError(command, COMMAND_TIMEOUT_MS);
  }

  /**
   * Attach a rejection handler before dropping an in-flight read.
   * @private
   */
  _abandonPendingRead() {
    if (this._pendingRead) {
      this._pendingRead.catch(() => {});
      this._pendingRead = null;
    }
  }

  /**
   * Close the port after a transport failure and reconnect when enabled.
   * @param {Error} error
   * @private
   */
  async _failTransport(error) {
    this._abandonPendingRead();
    await this._cleanupConnection();
    if (this.autoReconnect) {
      await this._attemptAutoReconnect();
    }
    throw error;
  }

  /**
   * Send a command and read the response.
   * @param {string} command - Command to send
   * @returns {Promise<string>} Response from device
   */
  async sendCommand(command) {
    return this._withCommandLock(async () => {
      if (!this.isConnected()) {
        if (this.autoReconnect) {
          const reconnected = await this._attemptAutoReconnect();
          if (!reconnected) {
            throw new NotConnectedError('sendCommand');
          }
        } else {
          throw new NotConnectedError('sendCommand');
        }
      }

      try {
        if (!this.writer || !this.reader) {
          throw new NotConnectedError('sendCommand');
        }

        await this._drainPendingInput();
        await this.writer.write(command + '\r');
        await this.sleep(this.commandDelay);
        return await this._readFramedResponse(command);
      } catch (error) {
        if (error instanceof NotConnectedError) {
          throw error;
        }
        if (error instanceof CommandTimeoutError) {
          await this._failTransport(error);
        }
        if (error instanceof CommunicationError) {
          await this._failTransport(error);
        }
        await this._failTransport(new CommunicationError(error.message, error));
      }
    });
  }

  /**
   * Get firmware version.
   * @returns {Promise<string>}
   */
  async getVersion() {
    return await this.sendCommand('v');
  }

  /**
   * Get help text from device.
   * @returns {Promise<string>}
   */
  async getHelp() {
    return await this.sendCommand('H');
  }

  /**
   * Get current counts from all channels.
   * @param {boolean} humanReadable - If true, returns formatted string
   * @returns {Promise<Object|string>} Counts data or formatted string
   */
  async getCounts(humanReadable = false) {
    if (humanReadable) {
      return await this.sendCommand('C');
    }

    const response = await this.sendCommand('c');
    const parts = response.split(/\s+/).filter((p) => p.length > 0);

    if (parts.length >= 9) {
      return {
        counts: parts.slice(0, 8).map(Number),
        overflow: parseInt(parts[8]),
      };
    }

    throw new InvalidResponseError(response, '8 counts + overflow flag');
  }

  /**
   * Clear all counters by reading them.
   */
  async clearCounts() {
    await this.getCounts(false);
  }

  /**
   * Get current settings.
   * @param {boolean} humanReadable - If true, returns formatted string
   * @returns {Promise<string>}
   */
  async getSettings(humanReadable = true) {
    return await this.sendCommand(humanReadable ? 'P' : 'p');
  }

  /**
   * Configure a counter channel.
   * @param {number} channel - Channel number (0-7)
   * @param {Object} inputs - Input configuration
   * @param {number} inputs.A - Enable input A (0 or 1)
   * @param {number} inputs.B - Enable input B (0 or 1)
   * @param {number} inputs.C - Enable input C (0 or 1)
   * @param {number} inputs.D - Enable input D (0 or 1)
   * @returns {Promise<string>}
   */
  async setChannel(channel, { A = 0, B = 0, C = 0, D = 0 } = {}) {
    validateChannel(channel);
    validateBinaryInput('A', A);
    validateBinaryInput('B', B);
    validateBinaryInput('C', C);
    validateBinaryInput('D', D);
    return await this.sendCommand(`S${channel}${A}${B}${C}${D}`);
  }

  /**
   * Set trigger level voltage.
   * @param {number} voltage - Voltage threshold (0.0 to 4.08V)
   * @returns {Promise<string>}
   */
  async setTriggerLevel(voltage) {
    // Clamp voltage to valid range instead of throwing
    const byteVal = voltageToByte(voltage);
    return await this.sendCommand(`L${byteVal}`);
  }

  /**
   * Get trigger level as voltage.
   * @param {number} byteValue - Raw byte value (0-255)
   * @returns {number} Voltage (0.0 to 4.08V)
   */
  static byteToVoltage(byteValue) {
    return (byteValue / 255) * 4.08;
  }

  /**
   * Set input impedance to 50 Ohms.
   * @returns {Promise<string>}
   */
  async setImpedance50Ohm() {
    return await this.sendCommand('z');
  }

  /**
   * Set input impedance to High-Z.
   * @returns {Promise<string>}
   */
  async setImpedanceHighZ() {
    return await this.sendCommand('Z');
  }

  /**
   * Set automatic repeat interval.
   * @param {number} intervalMs - Interval in milliseconds (100-65535)
   * @returns {Promise<string>}
   */
  async setRepeat(intervalMs) {
    const clamped = Math.max(100, Math.min(65535, intervalMs));
    return await this.sendCommand(`r${clamped}`);
  }

  /**
   * Toggle automatic repeat mode.
   * @returns {Promise<string>}
   */
  async toggleRepeat() {
    return await this.sendCommand('R');
  }

  /**
   * Set DAC output voltage.
   * @param {number} voltage - Output voltage (0.0 to 4.08V)
   * @returns {Promise<string>}
   */
  async setDacVoltage(voltage) {
    const byteVal = Math.max(
      0,
      Math.min(255, Math.round((voltage / 4.08) * 255))
    );
    return await this.sendCommand(`V${byteVal}`);
  }

  /**
   * Get and clear overflow status.
   * @returns {Promise<number>} 8-bit overflow flag
   */
  async getOverflow() {
    const response = await this.sendCommand('E');
    const trimmed = response.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      throw new InvalidResponseError(response, 'integer overflow flag');
    }
    return parseInt(trimmed, 10);
  }

  /**
   * @param {number} overflow
   * @param {number[]} channels
   * @private
   */
  _assertNoOverflow(overflow, channels) {
    const overflowed = channels.filter(
      (channel) => (overflow & (1 << channel)) !== 0
    );
    if (overflowed.length > 0) {
      throw new OverflowError(overflowed, overflow);
    }
  }

  /**
   * Test all LEDs (lights for 1 second).
   * @returns {Promise<string>}
   */
  async testLeds() {
    return await this.sendCommand('T');
  }

  /**
   * Measure count rate on a channel with Poisson uncertainty.
   * @param {number} channel - Channel number (0-7)
   * @param {number} duration - Measurement duration in seconds
   * @returns {Promise<Object>} Rate measurement result with uncertainties
   */
  async measureRate(channel = 0, duration = 1.0) {
    validateChannel(channel);
    validateDuration(duration);

    await this.clearCounts();
    await this.sleep(duration * 1000);
    const data = await this.getCounts(false);
    this._assertNoOverflow(data.overflow, [channel]);
    const counts = data.counts[channel];
    if (counts === undefined) {
      throw new InvalidChannelError(channel);
    }
    const rate = counts / duration;

    // Poisson uncertainty: sigma_N = sqrt(N)
    const countUncertainty = Math.sqrt(Math.max(0, counts));
    // Rate uncertainty: sigma_R = sigma_N / T
    const rateUncertainty = countUncertainty / duration;
    // Relative uncertainty as percentage
    const relativeUncertainty =
      counts > 0 ? (countUncertainty / counts) * 100 : 0;

    return {
      counts,
      duration,
      rate,
      channel,
      uncertainty: {
        counts: countUncertainty,
        rate: rateUncertainty,
        relative: relativeUncertainty,
      },
    };
  }

  /**
   * Measure coincidence rate with accidental correction and uncertainties.
   * @param {Object} options - Measurement options
   * @param {number} options.duration - Measurement duration in seconds
   * @param {number} options.singlesAChannel - Channel for singles A (default: 0)
   * @param {number} options.singlesBChannel - Channel for singles B (default: 1)
   * @param {number} options.coincidenceChannel - Channel for coincidences (default: 4)
   * @param {number} options.coincidenceWindow - Window in seconds (default: 25e-9)
   * @returns {Promise<Object>} Coincidence measurement result with uncertainties
   */
  async measureCoincidenceRate({
    duration = 1.0,
    singlesAChannel = 0,
    singlesBChannel = 1,
    coincidenceChannel = 4,
    coincidenceWindow = 25e-9,
  } = {}) {
    validateDuration(duration);
    validateChannel(singlesAChannel);
    validateChannel(singlesBChannel);
    validateChannel(coincidenceChannel);

    await this.clearCounts();
    await this.sleep(duration * 1000);
    const data = await this.getCounts(false);
    this._assertNoOverflow(data.overflow, [
      singlesAChannel,
      singlesBChannel,
      coincidenceChannel,
    ]);

    const singlesA = data.counts[singlesAChannel];
    const singlesB = data.counts[singlesBChannel];
    const coincidences = data.counts[coincidenceChannel];
    if (
      singlesA === undefined ||
      singlesB === undefined ||
      coincidences === undefined
    ) {
      throw new InvalidResponseError(
        String(data.counts),
        'count for each requested channel'
      );
    }

    const rateA = singlesA / duration;
    const rateB = singlesB / duration;
    const coincidenceRate = coincidences / duration;
    const accidentalRate = 2 * coincidenceWindow * rateA * rateB;
    const trueCoincidenceRate = Math.max(0, coincidenceRate - accidentalRate);

    // Poisson uncertainties for counts
    const sigmaA = Math.sqrt(Math.max(0, singlesA));
    const sigmaB = Math.sqrt(Math.max(0, singlesB));
    const sigmaC = Math.sqrt(Math.max(0, coincidences));

    // Rate uncertainties
    const rateAUncertainty = sigmaA / duration;
    const rateBUncertainty = sigmaB / duration;
    const coincidenceRateUncertainty = sigmaC / duration;

    // Accidental rate uncertainty (error propagation)
    // sigma_acc = 2 * tau * sqrt((R_B * sigma_A)^2 + (R_A * sigma_B)^2) / T
    const accidentalRateUncertainty =
      ((2 * coincidenceWindow) / duration) *
      Math.sqrt(Math.pow(rateB * sigmaA, 2) + Math.pow(rateA * sigmaB, 2));

    // True coincidence rate uncertainty (quadrature sum)
    const trueCoincidenceRateUncertainty = Math.sqrt(
      Math.pow(coincidenceRateUncertainty, 2) +
        Math.pow(accidentalRateUncertainty, 2)
    );

    return {
      singlesA,
      singlesB,
      coincidences,
      duration,
      rateA,
      rateB,
      coincidenceRate,
      accidentalRate,
      trueCoincidenceRate,
      uncertainty: {
        singlesA: sigmaA,
        singlesB: sigmaB,
        coincidences: sigmaC,
        rateA: rateAUncertainty,
        rateB: rateBUncertainty,
        coincidenceRate: coincidenceRateUncertainty,
        accidentalRate: accidentalRateUncertainty,
        trueCoincidenceRate: trueCoincidenceRateUncertainty,
      },
    };
  }
}

export { CD48 };
export default CD48;
