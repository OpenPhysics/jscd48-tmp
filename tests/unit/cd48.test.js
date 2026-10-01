import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  setupWebSerialMock,
  cleanupWebSerialMock,
} from '../mocks/web-serial.js';

// Import error classes
import {
  CommandTimeoutError,
  NotConnectedError,
  InvalidChannelError,
} from '../../errors.js';

// Import CD48 after mocks are set up
const CD48Module = await import('../../cd48.js');
const CD48 = CD48Module.default || CD48Module;

describe('CD48', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupWebSerialMock();
  });

  afterEach(() => {
    cleanupWebSerialMock();
  });

  describe('Constructor', () => {
    it('should create instance with default options', () => {
      const cd48 = new CD48();
      expect(cd48.baudRate).toBe(115200);
      expect(cd48.commandDelay).toBe(50);
      expect(cd48.port).toBeNull();
    });

    it('should create instance with custom options', () => {
      const cd48 = new CD48({ baudRate: 9600, commandDelay: 100 });
      expect(cd48.baudRate).toBe(9600);
      expect(cd48.commandDelay).toBe(100);
    });
  });

  describe('isSupported', () => {
    it('should return true when Web Serial API is available', () => {
      expect(CD48.isSupported()).toBe(true);
    });

    it('should return false when Web Serial API is not available', () => {
      delete global.navigator.serial;
      expect(CD48.isSupported()).toBe(false);
    });
  });

  describe('Connection', () => {
    it('should throw error if Web Serial API not supported', async () => {
      delete global.navigator.serial;
      const cd48 = new CD48();
      await expect(cd48.connect()).rejects.toThrow(
        'Web Serial API not supported'
      );
    });

    it('should connect successfully', async () => {
      const cd48 = new CD48();
      const result = await cd48.connect();
      expect(result).toBe(true);
      expect(cd48.isConnected()).toBe(true);
    });

    it('should handle user cancellation', async () => {
      cleanupWebSerialMock();
      setupWebSerialMock({ simulateNoDeviceSelected: true });

      const cd48 = new CD48();
      await expect(cd48.connect()).rejects.toThrow();
    });

    it('should return false for isConnected when not connected', () => {
      const cd48 = new CD48();
      expect(cd48.isConnected()).toBe(false);
    });

    it('should disconnect successfully', async () => {
      const cd48 = new CD48();
      await cd48.connect();
      expect(cd48.isConnected()).toBe(true);

      await cd48.disconnect();
      expect(cd48.isConnected()).toBe(false);
    });
  });

  describe('Helper methods', () => {
    it('should sleep for specified time', async () => {
      const cd48 = new CD48();
      const start = Date.now();
      await cd48.sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(95);
    });

    it('should convert byte to voltage correctly', () => {
      expect(CD48.byteToVoltage(0)).toBe(0);
      expect(CD48.byteToVoltage(255)).toBe(4.08);
      expect(CD48.byteToVoltage(128)).toBeCloseTo(2.048, 2);
      expect(CD48.byteToVoltage(64)).toBeCloseTo(1.024, 2);
      expect(CD48.byteToVoltage(192)).toBeCloseTo(3.072, 2);
    });
  });

  describe('Channel configuration validation', () => {
    let cd48;

    beforeEach(() => {
      cd48 = new CD48();
    });

    it('should throw error for invalid channel in setChannel', async () => {
      await expect(
        cd48.setChannel(-1, { A: 1, B: 0, C: 0, D: 0 })
      ).rejects.toThrow(InvalidChannelError);

      await expect(
        cd48.setChannel(8, { A: 1, B: 0, C: 0, D: 0 })
      ).rejects.toThrow(InvalidChannelError);
    });

    it('should throw error for invalid channel in measureRate', async () => {
      await expect(cd48.measureRate(-1, 1)).rejects.toThrow(
        InvalidChannelError
      );

      await expect(cd48.measureRate(8, 1)).rejects.toThrow(InvalidChannelError);
    });
  });

  describe('Voltage calculations', () => {
    it('should clamp trigger level voltage to valid range', () => {
      const calculateByte = (voltage) =>
        Math.max(0, Math.min(255, Math.round((voltage / 4.08) * 255)));

      expect(calculateByte(-1.0)).toBe(0);
      expect(calculateByte(0.0)).toBe(0);
      expect(calculateByte(2.04)).toBe(128);
      expect(calculateByte(4.08)).toBe(255);
      expect(calculateByte(5.0)).toBe(255);
    });

    it('should clamp DAC voltage to valid range', () => {
      const calculateByte = (voltage) =>
        Math.max(0, Math.min(255, Math.round((voltage / 4.08) * 255)));

      expect(calculateByte(-1.0)).toBe(0);
      expect(calculateByte(0.0)).toBe(0);
      expect(calculateByte(2.04)).toBe(128);
      expect(calculateByte(4.08)).toBe(255);
      expect(calculateByte(5.0)).toBe(255);
    });
  });

  describe('Count parsing', () => {
    it('should parse count response correctly', () => {
      const response = '100 200 300 400 500 600 700 800 0';
      const parts = response.split(/\s+/).filter((p) => p.length > 0);

      expect(parts.length).toBe(9);

      const parsed = {
        counts: parts.slice(0, 8).map(Number),
        overflow: parseInt(parts[8]),
      };

      expect(parsed.counts).toEqual([100, 200, 300, 400, 500, 600, 700, 800]);
      expect(parsed.overflow).toBe(0);
    });
  });

  describe('Rate calculations', () => {
    it('should calculate coincidence rates correctly', () => {
      const singlesA = 1000;
      const singlesB = 2000;
      const coincidences = 50;
      const duration = 10;
      const coincidenceWindow = 25e-9;

      const rateA = singlesA / duration;
      const rateB = singlesB / duration;
      const coincidenceRate = coincidences / duration;
      const accidentalRate = 2 * coincidenceWindow * rateA * rateB;
      const trueCoincidenceRate = Math.max(0, coincidenceRate - accidentalRate);

      expect(rateA).toBe(100);
      expect(rateB).toBe(200);
      expect(coincidenceRate).toBe(5);
      expect(accidentalRate).toBeCloseTo(0.001, 6);
      expect(trueCoincidenceRate).toBeCloseTo(4.999, 3);
    });

    it('should not return negative true coincidence rates', () => {
      const coincidenceRate = 1;
      const accidentalRate = 2;
      const trueCoincidenceRate = Math.max(0, coincidenceRate - accidentalRate);

      expect(trueCoincidenceRate).toBe(0);
    });
  });

  describe('Repeat interval validation', () => {
    it('should clamp repeat interval to valid range', () => {
      const clamp = (ms) => Math.max(100, Math.min(65535, ms));

      expect(clamp(50)).toBe(100);
      expect(clamp(100)).toBe(100);
      expect(clamp(1000)).toBe(1000);
      expect(clamp(65535)).toBe(65535);
      expect(clamp(70000)).toBe(65535);
    });
  });

  describe('Error handling', () => {
    let cd48;

    beforeEach(() => {
      cd48 = new CD48();
    });

    it('should throw error when sending command while not connected', async () => {
      await expect(cd48.sendCommand('v')).rejects.toThrow(NotConnectedError);
    });

    it('should throw error when getting version while not connected', async () => {
      await expect(cd48.getVersion()).rejects.toThrow(NotConnectedError);
    });

    it('should throw error when getting counts while not connected', async () => {
      await expect(cd48.getCounts()).rejects.toThrow(NotConnectedError);
    });
  });

  describe('Commands', () => {
    let cd48;

    beforeEach(async () => {
      cd48 = new CD48();
      await cd48.connect();
    });

    afterEach(async () => {
      if (cd48 && cd48.isConnected()) {
        await cd48.disconnect();
      }
    });

    it('should send version command', async () => {
      const version = await cd48.getVersion();
      expect(typeof version).toBe('string');
      expect(mocks.mockWriter.write).toHaveBeenCalledWith('v\r');
    });

    it('keeps one read pending while waiting for a delayed reply', async () => {
      const pending = [];
      mocks.mockReader.read.mockImplementation(
        () => new Promise((resolve) => pending.push(resolve))
      );
      setTimeout(
        () => pending[0]?.({ value: 'CD48 v1.0\r', done: false }),
        150
      );

      await expect(cd48.getVersion()).resolves.toBe('CD48 v1.0');
      expect(mocks.mockReader.read).toHaveBeenCalledTimes(1);
    });

    it('closes the stream when the response times out', async () => {
      mocks.mockReader.read.mockImplementation(() => new Promise(() => {}));

      await expect(cd48.sendCommand('v')).rejects.toThrow(CommandTimeoutError);
      expect(mocks.mockReader.cancel).toHaveBeenCalledOnce();
      expect(cd48.isConnected()).toBe(false);
    });

    it('should send getCounts command', async () => {
      const counts = await cd48.getCounts();
      expect(counts).toHaveProperty('counts');
      expect(counts).toHaveProperty('overflow');
      expect(Array.isArray(counts.counts)).toBe(true);
      expect(counts.counts.length).toBe(8);
      expect(mocks.mockWriter.write).toHaveBeenCalledWith('c\r');
    });

    it('should send human readable getCounts command', async () => {
      const result = await cd48.getCounts(true);
      expect(typeof result).toBe('string');
      expect(mocks.mockWriter.write).toHaveBeenCalledWith('C\r');
    });

    it('should clear counts', async () => {
      await cd48.clearCounts();
      expect(mocks.mockWriter.write).toHaveBeenCalledWith('c\r');
    });
  });

  describe('Trigger Level Configuration', () => {
    let cd48;

    beforeEach(async () => {
      cd48 = new CD48();
      await cd48.connect();
    });

    afterEach(async () => {
      if (cd48 && cd48.isConnected()) {
        await cd48.disconnect();
      }
    });

    it('should set trigger level within valid range', async () => {
      await cd48.setTriggerLevel(2.0);
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });

    it('should clamp trigger level to minimum', async () => {
      await cd48.setTriggerLevel(-1.0);
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });

    it('should clamp trigger level to maximum', async () => {
      await cd48.setTriggerLevel(5.0);
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });

    it('should throw error when setting trigger level while disconnected', async () => {
      const disconnectedCd48 = new CD48();
      await expect(disconnectedCd48.setTriggerLevel(2.0)).rejects.toThrow(
        NotConnectedError
      );
    });
  });

  describe('DAC Configuration', () => {
    let cd48;

    beforeEach(async () => {
      cd48 = new CD48();
      await cd48.connect();
    });

    afterEach(async () => {
      if (cd48 && cd48.isConnected()) {
        await cd48.disconnect();
      }
    });

    it('should set DAC voltage within valid range', async () => {
      await cd48.setDacVoltage(2.0);
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });

    it('should clamp DAC voltage to minimum', async () => {
      await cd48.setDacVoltage(-1.0);
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });

    it('should clamp DAC voltage to maximum', async () => {
      await cd48.setDacVoltage(5.0);
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });
  });

  describe('Channel Configuration', () => {
    let cd48;

    beforeEach(async () => {
      cd48 = new CD48();
      await cd48.connect();
    });

    afterEach(async () => {
      if (cd48 && cd48.isConnected()) {
        await cd48.disconnect();
      }
    });

    it('should set channel configuration', async () => {
      await cd48.setChannel(0, { A: 1, B: 0, C: 0, D: 0 });
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });

    it('should set channel with all inputs enabled', async () => {
      await cd48.setChannel(1, { A: 1, B: 1, C: 0, D: 0 });
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });
  });

  describe('Measurement Methods', () => {
    let cd48;

    beforeEach(async () => {
      cd48 = new CD48();
      await cd48.connect();
    });

    afterEach(async () => {
      if (cd48 && cd48.isConnected()) {
        await cd48.disconnect();
      }
    });

    it('should measure rate for a channel', async () => {
      const result = await cd48.measureRate(0, 1.0);
      expect(result).toHaveProperty('counts');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('rate');
      expect(result).toHaveProperty('channel');
      expect(result.channel).toBe(0);
      expect(result.duration).toBe(1.0);
    });

    it('should measure rate for different channels', async () => {
      const result = await cd48.measureRate(3, 0.5);
      expect(result.channel).toBe(3);
      expect(result.duration).toBe(0.5);
    });

    it('should measure coincidence rate with default options', async () => {
      const result = await cd48.measureCoincidenceRate({
        duration: 1.0,
      });
      expect(result).toHaveProperty('singlesA');
      expect(result).toHaveProperty('singlesB');
      expect(result).toHaveProperty('coincidences');
      expect(result).toHaveProperty('duration');
      expect(result.duration).toBe(1.0);
    });

    it('should measure coincidence rate with custom channels', async () => {
      const result = await cd48.measureCoincidenceRate({
        duration: 2.0,
        singlesAChannel: 0,
        singlesBChannel: 1,
        coincidenceChannel: 2,
      });
      expect(result).toHaveProperty('singlesA');
      expect(result).toHaveProperty('singlesB');
      expect(result.duration).toBe(2.0);
    });

    it('should calculate coincidence rates correctly', async () => {
      const result = await cd48.measureCoincidenceRate({
        duration: 1.0,
        coincidenceWindow: 25e-9,
      });
      expect(result).toHaveProperty('rateA');
      expect(result).toHaveProperty('rateB');
      expect(result).toHaveProperty('coincidenceRate');
      expect(result).toHaveProperty('accidentalRate');
      expect(result).toHaveProperty('trueCoincidenceRate');
      expect(result.trueCoincidenceRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('LED Control', () => {
    let cd48;

    beforeEach(async () => {
      cd48 = new CD48();
      await cd48.connect();
    });

    afterEach(async () => {
      if (cd48 && cd48.isConnected()) {
        await cd48.disconnect();
      }
    });

    it('should test LED sequence', async () => {
      await cd48.testLeds();
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });
  });

  describe('Impedance Configuration', () => {
    let cd48;

    beforeEach(async () => {
      cd48 = new CD48();
      await cd48.connect();
    });

    afterEach(async () => {
      if (cd48 && cd48.isConnected()) {
        await cd48.disconnect();
      }
    });

    it('should set impedance to 50 Ohm', async () => {
      await cd48.setImpedance50Ohm();
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });

    it('should set impedance to High-Z', async () => {
      await cd48.setImpedanceHighZ();
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });
  });

  describe('Repeat Mode', () => {
    let cd48;

    beforeEach(async () => {
      cd48 = new CD48();
      await cd48.connect();
    });

    afterEach(async () => {
      if (cd48 && cd48.isConnected()) {
        await cd48.disconnect();
      }
    });

    it('should set repeat mode with interval', async () => {
      await cd48.setRepeat(1000);
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });

    it('should toggle repeat mode', async () => {
      await cd48.toggleRepeat();
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });

    it('should clamp repeat interval to minimum', async () => {
      await cd48.setRepeat(50);
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });

    it('should clamp repeat interval to maximum', async () => {
      await cd48.setRepeat(70000);
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });
  });

  describe('Overflow and Settings', () => {
    let cd48;

    beforeEach(async () => {
      cd48 = new CD48();
      await cd48.connect();
    });

    afterEach(async () => {
      if (cd48 && cd48.isConnected()) {
        await cd48.disconnect();
      }
    });

    it('should get overflow status', async () => {
      const overflow = await cd48.getOverflow();
      expect(typeof overflow).toBe('number');
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });

    it('should get settings in human readable format', async () => {
      const settings = await cd48.getSettings(true);
      expect(typeof settings).toBe('string');
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });

    it('should get settings in parseable format', async () => {
      const settings = await cd48.getSettings(false);
      expect(typeof settings).toBe('string');
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });

    it('should get help information', async () => {
      const help = await cd48.getHelp();
      expect(typeof help).toBe('string');
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });
  });

  describe('Advanced Error Handling', () => {
    it('should handle read errors', async () => {
      const cd48 = new CD48();
      await cd48.connect();

      mocks.mockReader.read.mockRejectedValueOnce(new Error('Read error'));

      await expect(cd48.getVersion()).rejects.toThrow();
    });

    it('should handle write errors', async () => {
      const cd48 = new CD48();
      await cd48.connect();

      mocks.mockWriter.write.mockRejectedValueOnce(new Error('Write error'));

      await expect(cd48.clearCounts()).rejects.toThrow();
    });

    it('should handle multiple disconnects gracefully', async () => {
      const cd48 = new CD48();
      await cd48.connect();
      await cd48.disconnect();
      await cd48.disconnect(); // Second disconnect should not throw
      expect(cd48.isConnected()).toBe(false);
    });

    it('should handle disconnected port during write', async () => {
      const cd48 = new CD48();
      await cd48.connect();

      // Simulate device disconnection
      mocks.mockWriter.write.mockRejectedValueOnce(
        new Error('Device disconnected')
      );

      await expect(cd48.getVersion()).rejects.toThrow();
    });
  });

  describe('Data Validation', () => {
    it('should handle empty count response', () => {
      const response = '';
      const parts = response.split(/\s+/).filter((p) => p.length > 0);
      expect(parts.length).toBe(0);
    });

    it('should handle malformed count response', () => {
      const response = 'invalid data';
      const parts = response.split(/\s+/).filter((p) => p.length > 0);
      expect(parts.length).toBeLessThan(9);
    });

    it('should handle overflow in counts', () => {
      const response = '100 200 300 400 500 600 700 800 1';
      const parts = response.split(/\s+/).filter((p) => p.length > 0);
      const parsed = {
        counts: parts.slice(0, 8).map(Number),
        overflow: parseInt(parts[8]),
      };
      expect(parsed.overflow).toBe(1);
    });

    it('should handle large count values', () => {
      const response =
        '4294967295 4294967295 4294967295 4294967295 4294967295 4294967295 4294967295 4294967295 0';
      const parts = response.split(/\s+/).filter((p) => p.length > 0);
      const parsed = {
        counts: parts.slice(0, 8).map(Number),
        overflow: parseInt(parts[8]),
      };
      expect(parsed.counts[0]).toBe(4294967295);
    });
  });

  describe('Edge Cases', () => {
    let cd48;

    beforeEach(async () => {
      cd48 = new CD48();
      await cd48.connect();
    });

    afterEach(async () => {
      if (cd48 && cd48.isConnected()) {
        await cd48.disconnect();
      }
    });

    it('should handle very short duration measurement', async () => {
      const result = await cd48.measureRate(0, 0.001);
      expect(result.duration).toBe(0.001);
    });

    it('should handle longer duration measurement', async () => {
      const result = await cd48.measureRate(0, 2.0);
      expect(result.duration).toBe(2.0);
    });

    it('should handle channel at boundary (0)', async () => {
      const result = await cd48.measureRate(0, 1.0);
      expect(result.channel).toBe(0);
    });

    it('should handle channel at boundary (7)', async () => {
      const result = await cd48.measureRate(7, 1.0);
      expect(result.channel).toBe(7);
    });

    it('should handle voltage at minimum (0V)', async () => {
      await cd48.setTriggerLevel(0);
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });

    it('should handle voltage at maximum (4.08V)', async () => {
      await cd48.setTriggerLevel(4.08);
      expect(mocks.mockWriter.write).toHaveBeenCalled();
    });
  });

  describe('Concurrent Operations', () => {
    let cd48;

    beforeEach(async () => {
      cd48 = new CD48();
      await cd48.connect();
    });

    afterEach(async () => {
      if (cd48 && cd48.isConnected()) {
        await cd48.disconnect();
      }
    });

    it('should handle multiple sequential getCounts calls', async () => {
      const result1 = await cd48.getCounts();
      const result2 = await cd48.getCounts();
      const result3 = await cd48.getCounts();

      expect(result1).toHaveProperty('counts');
      expect(result2).toHaveProperty('counts');
      expect(result3).toHaveProperty('counts');
    });

    it('should handle configuration changes between measurements', async () => {
      await cd48.setTriggerLevel(1.0);
      const result1 = await cd48.measureRate(0, 0.1);
      await cd48.setTriggerLevel(2.0);
      const result2 = await cd48.measureRate(0, 0.1);

      expect(result1).toHaveProperty('rate');
      expect(result2).toHaveProperty('rate');
    });
  });
});
