/**
 * Custom error classes for CD48 operations
 */

/**
 * Base error class for CD48-related errors
 */
export class CD48Error extends Error {
  constructor(message) {
    super(message);
    this.name = 'CD48Error';
  }
}

/**
 * Error thrown when Web Serial API is not supported
 */
export class UnsupportedBrowserError extends CD48Error {
  constructor() {
    super(
      'Web Serial API not supported. Use Chrome 89+, Edge 89+, or Opera 76+.'
    );
    this.name = 'UnsupportedBrowserError';
  }
}

/**
 * Error thrown when device is not connected
 */
export class NotConnectedError extends CD48Error {
  constructor(operation) {
    super(
      `Cannot perform operation '${operation}' - device not connected. Call connect() first.`
    );
    this.name = 'NotConnectedError';
    this.operation = operation;
  }
}

/**
 * Error thrown when connection fails
 */
export class ConnectionError extends CD48Error {
  constructor(message, cause) {
    super(`Connection failed: ${message}`);
    this.name = 'ConnectionError';
    this.cause = cause;
  }
}

/**
 * Error thrown when user cancels device selection
 */
export class DeviceSelectionCancelledError extends CD48Error {
  constructor() {
    super('No CD48 device selected by user');
    this.name = 'DeviceSelectionCancelledError';
  }
}

/**
 * Error thrown when command times out
 */
export class CommandTimeoutError extends CD48Error {
  constructor(command, timeout) {
    super(`Command '${command}' timed out after ${timeout}ms`);
    this.name = 'CommandTimeoutError';
    this.command = command;
    this.timeout = timeout;
  }
}

/**
 * Error thrown when response format is invalid
 */
export class InvalidResponseError extends CD48Error {
  constructor(response, expected) {
    super(`Invalid response format. Got: '${response}', expected: ${expected}`);
    this.name = 'InvalidResponseError';
    this.response = response;
    this.expected = expected;
  }
}

/**
 * Error thrown when parameter validation fails
 */
export class ValidationError extends CD48Error {
  constructor(parameter, value, constraints) {
    super(
      `Invalid parameter '${parameter}': ${value}. Constraints: ${constraints}`
    );
    this.name = 'ValidationError';
    this.parameter = parameter;
    this.value = value;
    this.constraints = constraints;
  }
}

/**
 * Error thrown when channel number is out of range
 */
export class InvalidChannelError extends ValidationError {
  constructor(channel) {
    super('channel', channel, '0-7');
    this.name = 'InvalidChannelError';
  }
}

/**
 * Error thrown when voltage is out of range
 */
export class InvalidVoltageError extends ValidationError {
  constructor(voltage) {
    super('voltage', voltage, '0.0-4.08V');
    this.name = 'InvalidVoltageError';
  }
}

/**
 * Error thrown when a measured channel's overflow bit is set.
 * The raw count would understate the rate.
 */
export class OverflowError extends CD48Error {
  /**
   * @param {number[]} channels
   * @param {number} overflow
   */
  constructor(channels, overflow) {
    super(
      `Counter overflow on channel(s) ${channels.join(', ')}; rate would be understated (overflow=${overflow})`
    );
    this.name = 'OverflowError';
    this.channels = channels;
    this.overflow = overflow;
  }
}

/**
 * Error thrown when communication with device fails
 */
export class CommunicationError extends CD48Error {
  constructor(message, cause) {
    super(`Communication error: ${message}`);
    this.name = 'CommunicationError';
    this.cause = cause;
  }
}
