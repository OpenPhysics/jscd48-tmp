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
  CommunicationError,
} from './errors.js';

import { validateChannel, voltageToByte } from './validation.js';

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
    this._reconnecting = false;
    this._onDisconnect = null;
    this._onReconnect = null;
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

    // Wait for device to initialize
    await this.sleep(500);
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
   * Apply rate limiting between commands.
   * @private
   */
  async _applyRateLimit() {
    if (this.rateLimitMs > 0) {
      const elapsed = Date.now() - this._lastCommandTime;
      if (elapsed < this.rateLimitMs) {
        await this.sleep(this.rateLimitMs - elapsed);
      }
    }
    this._lastCommandTime = Date.now();
  }

  /**
   * Send a command and read the response.
   * @param {string} command - Command to send
   * @returns {Promise<string>} Response from device
   */
  async sendCommand(command) {
    if (!this.isConnected()) {
      // Attempt auto-reconnect if enabled
      if (this.autoReconnect) {
        const reconnected = await this._attemptAutoReconnect();
        if (!reconnected) {
          throw new NotConnectedError('sendCommand');
        }
      } else {
        throw new NotConnectedError('sendCommand');
      }
    }

    // Apply rate limiting
    await this._applyRateLimit();

    try {
      // Clear any pending data
      await this.writer.write(command + '\r');
      await this.sleep(this.commandDelay);

      // Read response with timeout
      let response = '';
      const startTime = Date.now();
      const timeout = 1000;
      let pendingRead = null;

      while (Date.now() - startTime < timeout) {
        pendingRead ??= this.reader.read();
        const result = await Promise.race([
          pendingRead,
          this.sleep(100).then(() => ({
            value: '',
            done: false,
            timeout: true,
          })),
        ]);

        if (result.timeout) continue;
        pendingRead = null;
        if (result.done) break;
        if (result.value) response += result.value;

        // Check if we have a complete response
        if (response.includes('\r') || response.includes('\n')) {
          break;
        }
      }

      // Check if we timed out
      if (Date.now() - startTime >= timeout && (pendingRead || !response)) {
        throw new CommandTimeoutError(command, timeout);
      }

      return response.trim();
    } catch (error) {
      if (error instanceof CommandTimeoutError) {
        // A timed-out read still owns the stream. Close it before a later
        // command can have its reply consumed by that abandoned read.
        await this._cleanupConnection();
        throw error;
      }
      if (error instanceof NotConnectedError) {
        throw error;
      }
      throw new CommunicationError(error.message, error);
    }
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
    return parseInt(response);
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

    await this.clearCounts();
    await this.sleep(duration * 1000);
    const data = await this.getCounts(false);
    const counts = data.counts[channel];
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
    await this.clearCounts();
    await this.sleep(duration * 1000);
    const data = await this.getCounts(false);

    const singlesA = data.counts[singlesAChannel];
    const singlesB = data.counts[singlesBChannel];
    const coincidences = data.counts[coincidenceChannel];

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
