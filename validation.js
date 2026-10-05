/**
 * Validation utilities for CD48 parameters
 */

import {
  InvalidChannelError,
  InvalidVoltageError,
  ValidationError,
} from './errors.js';

/**
 * Valid channel range (0-7)
 */
export const CHANNEL_MIN = 0;
export const CHANNEL_MAX = 7;

/**
 * Valid voltage range (0-4.08V)
 */
export const VOLTAGE_MIN = 0.0;
export const VOLTAGE_MAX = 4.08;

/**
 * Valid byte range (0-255)
 */
export const BYTE_MIN = 0;
export const BYTE_MAX = 255;

/**
 * Valid repeat interval range (100-65535 ms)
 */
export const REPEAT_INTERVAL_MIN = 100;
export const REPEAT_INTERVAL_MAX = 65535;

/**
 * Validate channel number
 * @param {number} channel - Channel number to validate
 * @throws {InvalidChannelError} If channel is out of range
 */
export function validateChannel(channel) {
  if (typeof channel !== 'number' || isNaN(channel)) {
    throw new ValidationError(
      'channel',
      channel,
      'must be a number between 0 and 7'
    );
  }

  if (
    !Number.isInteger(channel) ||
    channel < CHANNEL_MIN ||
    channel > CHANNEL_MAX
  ) {
    throw new InvalidChannelError(channel);
  }
}

/**
 * Validate a counter input enable (0 or 1).
 * @param {string} name - Input name (A, B, C, or D)
 * @param {number} value - Value to validate
 * @throws {ValidationError} If value is not 0 or 1
 */
export function validateBinaryInput(name, value) {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(name, value, 'must be 0 or 1');
  }
  if (!Number.isInteger(value) || (value !== 0 && value !== 1)) {
    throw new ValidationError(name, value, 'must be 0 or 1');
  }
}

/**
 * Validate voltage value
 * @param {number} voltage - Voltage to validate
 * @throws {InvalidVoltageError} If voltage is out of range
 */
export function validateVoltage(voltage) {
  if (typeof voltage !== 'number' || isNaN(voltage)) {
    throw new ValidationError(
      'voltage',
      voltage,
      'must be a number between 0.0 and 4.08'
    );
  }

  if (voltage < VOLTAGE_MIN || voltage > VOLTAGE_MAX) {
    throw new InvalidVoltageError(voltage);
  }
}

/**
 * Validate byte value
 * @param {number} byte - Byte value to validate
 * @throws {ValidationError} If byte is out of range
 */
export function validateByte(byte) {
  if (typeof byte !== 'number' || isNaN(byte)) {
    throw new ValidationError(
      'byte',
      byte,
      'must be a number between 0 and 255'
    );
  }

  if (byte < BYTE_MIN || byte > BYTE_MAX) {
    throw new ValidationError('byte', byte, '0-255');
  }
}

/**
 * Validate repeat interval
 * @param {number} interval - Interval in milliseconds
 * @throws {ValidationError} If interval is out of range
 */
export function validateRepeatInterval(interval) {
  if (typeof interval !== 'number' || isNaN(interval)) {
    throw new ValidationError(
      'repeat_interval',
      interval,
      'must be a number between 100 and 65535'
    );
  }

  if (interval < REPEAT_INTERVAL_MIN || interval > REPEAT_INTERVAL_MAX) {
    throw new ValidationError('repeat_interval', interval, '100-65535 ms');
  }
}

/**
 * Validate duration
 * @param {number} duration - Duration in seconds
 * @throws {ValidationError} If duration is invalid
 */
export function validateDuration(duration) {
  if (typeof duration !== 'number' || isNaN(duration)) {
    throw new ValidationError(
      'duration',
      duration,
      'must be a positive number'
    );
  }

  if (duration <= 0) {
    throw new ValidationError('duration', duration, 'must be greater than 0');
  }
}

/**
 * Validate impedance mode
 * @param {string} mode - Impedance mode ('highz' or '50ohm')
 * @throws {ValidationError} If mode is invalid
 */
export function validateImpedanceMode(mode) {
  const validModes = ['highz', '50ohm'];

  if (typeof mode !== 'string') {
    throw new ValidationError('impedance', mode, "must be 'highz' or '50ohm'");
  }

  if (!validModes.includes(mode.toLowerCase())) {
    throw new ValidationError('impedance', mode, "must be 'highz' or '50ohm'");
  }
}

/**
 * Validate boolean parameter
 * @param {string} paramName - Parameter name
 * @param {*} value - Value to validate
 * @throws {ValidationError} If value is not boolean
 */
export function validateBoolean(paramName, value) {
  if (typeof value !== 'boolean') {
    throw new ValidationError(paramName, value, 'must be true or false');
  }
}

/**
 * Clamp value to range
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamp voltage to valid range
 * @param {number} voltage - Voltage to clamp
 * @returns {number} Clamped voltage
 */
export function clampVoltage(voltage) {
  return clamp(voltage, VOLTAGE_MIN, VOLTAGE_MAX);
}

/**
 * Clamp repeat interval to valid range
 * @param {number} interval - Interval to clamp
 * @returns {number} Clamped interval
 */
export function clampRepeatInterval(interval) {
  return clamp(interval, REPEAT_INTERVAL_MIN, REPEAT_INTERVAL_MAX);
}

/**
 * Convert voltage to byte value (0-255)
 * @param {number} voltage - Voltage (0-4.08V)
 * @returns {number} Byte value (0-255)
 */
export function voltageToByte(voltage) {
  const clamped = clampVoltage(voltage);
  return Math.round((clamped / VOLTAGE_MAX) * BYTE_MAX);
}

/**
 * Convert byte value to voltage
 * @param {number} byte - Byte value (0-255)
 * @returns {number} Voltage (0-4.08V)
 */
export function byteToVoltage(byte) {
  validateByte(byte);
  return (byte / BYTE_MAX) * VOLTAGE_MAX;
}
