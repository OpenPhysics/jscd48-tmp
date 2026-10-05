/**
 * @fileoverview Advanced statistical analysis tools for CD48 data
 * @module analysis
 */

/**
 * Minimum that does not spread the array (Math.min throws past the stack limit).
 * @param {number[]} data
 * @returns {number}
 */
function safeMin(data) {
  let min = Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
  }
  return min;
}

/**
 * Maximum that does not spread the array.
 * @param {number[]} data
 * @returns {number}
 */
function safeMax(data) {
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] > max) max = data[i];
  }
  return max;
}

/**
 * Statistical analysis utilities for count data
 * @namespace Statistics
 */
export const Statistics = {
  /**
   * Calculate mean (average) of an array of numbers
   * @param {number[]} data - Array of numeric values
   * @returns {number} Mean value
   */
  mean(data) {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  },

  /**
   * Calculate median of an array of numbers
   * @param {number[]} data - Array of numeric values
   * @returns {number} Median value
   */
  median(data) {
    if (!data || data.length === 0) return 0;
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  },

  /**
   * Calculate standard deviation
   * @param {number[]} data - Array of numeric values
   * @param {boolean} [sample=true] - Use sample standard deviation (n-1)
   * @returns {number} Standard deviation
   */
  standardDeviation(data, sample = true) {
    if (!data || data.length === 0) return 0;
    if (data.length === 1) return 0;
    const avg = this.mean(data);
    const squareDiffs = data.map((value) => Math.pow(value - avg, 2));
    const avgSquareDiff =
      squareDiffs.reduce((sum, val) => sum + val, 0) /
      (sample ? data.length - 1 : data.length);
    return Math.sqrt(avgSquareDiff);
  },

  /**
   * Calculate variance
   * @param {number[]} data - Array of numeric values
   * @param {boolean} [sample=true] - Use sample variance (n-1)
   * @returns {number} Variance
   */
  variance(data, sample = true) {
    const std = this.standardDeviation(data, sample);
    return std * std;
  },

  /**
   * Calculate Poisson uncertainty (sqrt(N))
   * @param {number} count - Count value
   * @returns {number} Poisson uncertainty
   */
  poissonUncertainty(count) {
    return Math.sqrt(Math.max(0, count));
  },

  /**
   * Calculate statistical significance between two count rates
   * @param {number} count1 - First count
   * @param {number} count2 - Second count
   * @returns {number} Z-score
   */
  zScore(count1, count2) {
    const uncertainty = Math.sqrt(count1 + count2);
    if (uncertainty === 0) return 0;
    return Math.abs(count1 - count2) / uncertainty;
  },

  /**
   * Perform linear regression on time-series data
   * @param {number[]} x - X values (e.g., time)
   * @param {number[]} y - Y values (e.g., counts)
   * @returns {{slope: number, intercept: number, r2: number}} Regression results
   */
  linearRegression(x, y) {
    if (!x || !y || x.length !== y.length || x.length === 0) {
      return { slope: 0, intercept: 0, r2: 0 };
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) {
      return { slope: 0, intercept: 0, r2: 0 };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = sumYY - n * yMean * yMean;
    const ssResidual = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const r2 = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

    return { slope, intercept, r2 };
  },

  /**
   * Calculate all basic statistics for a dataset
   * @param {number[]} data - Array of numeric values
   * @returns {Object} Object containing mean, median, std, variance, min, max
   */
  summary(data) {
    if (!data || data.length === 0) {
      return {
        mean: 0,
        median: 0,
        std: 0,
        variance: 0,
        min: 0,
        max: 0,
        count: 0,
      };
    }

    return {
      mean: this.mean(data),
      median: this.median(data),
      std: this.standardDeviation(data),
      variance: this.variance(data),
      min: safeMin(data),
      max: safeMax(data),
      count: data.length,
    };
  },
};

/**
 * Histogram generation utilities
 * @namespace Histogram
 */
export const Histogram = {
  /**
   * Create a histogram from data
   * @param {number[]} data - Array of numeric values
   * @param {Object} options - Histogram options
   * @param {number} [options.bins=10] - Number of bins
   * @param {number} [options.min] - Minimum value (auto-detected if not provided)
   * @param {number} [options.max] - Maximum value (auto-detected if not provided)
   * @returns {Object} Histogram data with bins, counts, and edges
   */
  create(data, options = {}) {
    if (!data || data.length === 0) {
      return { bins: [], counts: [], edges: [], binWidth: 0 };
    }

    const bins = options.bins || 10;
    const min = options.min !== undefined ? options.min : safeMin(data);
    const max = options.max !== undefined ? options.max : safeMax(data);
    const binWidth = (max - min) / bins;

    if (binWidth === 0) {
      return {
        bins: [min],
        counts: [data.length],
        edges: [min, min],
        binWidth: 0,
      };
    }

    const counts = new Array(bins).fill(0);
    const edges = Array.from(
      { length: bins + 1 },
      (_, i) => min + i * binWidth
    );

    // Count values in each bin
    data.forEach((value) => {
      if (value < min || value > max) return;
      let binIndex = Math.floor((value - min) / binWidth);
      if (binIndex === bins) binIndex = bins - 1; // Handle max value
      counts[binIndex]++;
    });

    // Calculate bin centers
    const binCenters = edges.slice(0, -1).map((edge) => edge + binWidth / 2);

    return {
      bins: binCenters,
      counts,
      edges,
      binWidth,
    };
  },

  /**
   * Create histogram with automatic binning using Sturges' rule
   * @param {number[]} data - Array of numeric values
   * @returns {Object} Histogram data
   */
  autobin(data) {
    if (!data || data.length === 0) {
      return this.create([], {});
    }
    const bins = Math.ceil(Math.log2(data.length) + 1);
    return this.create(data, { bins });
  },

  /**
   * Create histogram with Freedman-Diaconis rule for bin width
   * @param {number[]} data - Array of numeric values
   * @returns {Object} Histogram data
   */
  freedmanDiaconis(data) {
    if (!data || data.length === 0) {
      return this.create([], {});
    }

    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    const binWidth = (2 * iqr) / Math.pow(data.length, 1 / 3);
    const min = safeMin(data);
    const max = safeMax(data);
    const calculatedBins = Math.ceil((max - min) / binWidth);
    const bins =
      binWidth === 0
        ? 1
        : calculatedBins !== 0 && !Number.isNaN(calculatedBins)
          ? calculatedBins
          : 1;

    return this.create(data, { bins, min, max });
  },

  /**
   * Calculate cumulative histogram
   * @param {number[]} data - Array of numeric values
   * @param {Object} options - Histogram options
   * @returns {Object} Cumulative histogram data
   */
  cumulative(data, options = {}) {
    const hist = this.create(data, options);
    const cumulativeCounts = [];
    let sum = 0;

    for (const count of hist.counts) {
      sum += count;
      cumulativeCounts.push(sum);
    }

    return {
      ...hist,
      counts: cumulativeCounts,
      normalized: cumulativeCounts.map((c) => c / sum),
    };
  },
};

/**
 * Time-series analysis helpers
 * @namespace TimeSeries
 */
export const TimeSeries = {
  /**
   * Calculate moving average
   * @param {number[]} data - Time series data
   * @param {number} window - Window size
   * @returns {number[]} Smoothed data
   */
  movingAverage(data, window) {
    if (!data || data.length === 0 || window < 1) return [];

    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(data.length, i + Math.ceil(window / 2));
      const slice = data.slice(start, end);
      result.push(Statistics.mean(slice));
    }
    return result;
  },

  /**
   * Calculate exponential moving average
   * @param {number[]} data - Time series data
   * @param {number} alpha - Smoothing factor (0-1)
   * @returns {number[]} Smoothed data
   */
  exponentialMovingAverage(data, alpha = 0.3) {
    if (!data || data.length === 0) return [];
    if (alpha < 0 || alpha > 1) {
      throw new Error('Alpha must be between 0 and 1');
    }

    const result = [data[0]];
    for (let i = 1; i < data.length; i++) {
      result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
    }
    return result;
  },

  /**
   * Detect outliers using z-score method
   * @param {number[]} data - Time series data
   * @param {number} [threshold=3] - Z-score threshold
   * @returns {number[]} Indices of outliers
   */
  detectOutliers(data, threshold = 3) {
    if (!data || data.length === 0) return [];

    const mean = Statistics.mean(data);
    const std = Statistics.standardDeviation(data);

    if (std === 0) return [];

    const outliers = [];
    data.forEach((value, index) => {
      const z = Math.abs((value - mean) / std);
      if (z > threshold) {
        outliers.push(index);
      }
    });

    return outliers;
  },

  /**
   * Calculate rate of change
   * @param {number[]} data - Time series data
   * @param {number[]} [times] - Time values (optional)
   * @returns {number[]} Rate of change
   */
  rateOfChange(data, times = null) {
    if (!data || data.length < 2) return [];

    const result = [];
    for (let i = 1; i < data.length; i++) {
      const dt = times ? times[i] - times[i - 1] : 1;
      result.push((data[i] - data[i - 1]) / dt);
    }
    return result;
  },

  /**
   * Calculate autocorrelation
   * @param {number[]} data - Time series data
   * @param {number} lag - Lag value
   * @returns {number} Autocorrelation coefficient
   */
  autocorrelation(data, lag) {
    if (!data || data.length === 0 || lag >= data.length) return 0;

    const mean = Statistics.mean(data);
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < data.length - lag; i++) {
      numerator += (data[i] - mean) * (data[i + lag] - mean);
    }

    for (let i = 0; i < data.length; i++) {
      denominator += Math.pow(data[i] - mean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  },

  /**
   * Resample time series data
   * @param {number[]} data - Time series data
   * @param {number[]} times - Original time values
   * @param {number[]} newTimes - New time values to interpolate to
   * @returns {number[]} Resampled data
   */
  resample(data, times, newTimes) {
    if (!data || !times || !newTimes || data.length !== times.length) {
      return [];
    }

    return newTimes.map((newTime) => {
      // Find surrounding points
      let i = 0;
      while (i < times.length && times[i] < newTime) i++;

      if (i === 0) return data[0];
      if (i === times.length) return data[data.length - 1];

      // Linear interpolation
      const t0 = times[i - 1];
      const t1 = times[i];
      const v0 = data[i - 1];
      const v1 = data[i];
      const fraction = (newTime - t0) / (t1 - t0);

      return v0 + fraction * (v1 - v0);
    });
  },

  /**
   * Calculate dead time correction
   * @param {number} observedRate - Observed count rate (counts/sec)
   * @param {number} deadTime - Dead time in seconds
   * @returns {number} Corrected count rate
   */
  deadTimeCorrection(observedRate, deadTime) {
    // Using the formula: true_rate = observed_rate / (1 - observed_rate * dead_time)
    const denominator = 1 - observedRate * deadTime;
    if (denominator <= 0) {
      throw new Error('Dead time correction overflow - rate too high');
    }
    return observedRate / denominator;
  },
};

/**
 * Coincidence analysis utilities
 * @namespace Coincidence
 */
export const Coincidence = {
  /**
   * Calculate expected accidental coincidence rate
   * @param {number} rate1 - Rate of first detector (counts/sec)
   * @param {number} rate2 - Rate of second detector (counts/sec)
   * @param {number} coincidenceWindow - Coincidence window in seconds
   * @returns {number} Expected accidental rate (counts/sec)
   */
  accidentalRate(rate1, rate2, coincidenceWindow) {
    return 2 * rate1 * rate2 * coincidenceWindow;
  },

  /**
   * Calculate true coincidence rate
   * @param {number} measuredRate - Measured coincidence rate
   * @param {number} rate1 - Rate of first detector
   * @param {number} rate2 - Rate of second detector
   * @param {number} coincidenceWindow - Coincidence window in seconds
   * @returns {number} True coincidence rate
   */
  trueRate(measuredRate, rate1, rate2, coincidenceWindow) {
    const accidental = this.accidentalRate(rate1, rate2, coincidenceWindow);
    return Math.max(0, measuredRate - accidental);
  },

  /**
   * Calculate signal-to-noise ratio
   * @param {number} trueRate - True coincidence rate
   * @param {number} accidentalRate - Accidental coincidence rate
   * @returns {number} Signal-to-noise ratio
   */
  signalToNoise(trueRate, accidentalRate) {
    return accidentalRate === 0 ? Infinity : trueRate / accidentalRate;
  },

  /**
   * Calculate optimal coincidence window
   * @param {number} rate1 - Rate of first detector
   * @param {number} rate2 - Rate of second detector
   * @param {number} targetSNR - Target signal-to-noise ratio
   * @returns {number} Optimal window in seconds
   */
  optimalWindow(rate1, rate2, targetSNR = 10) {
    // Simplified estimation - actual optimal depends on specific application
    return 1 / (2 * targetSNR * Math.sqrt(rate1 * rate2));
  },
};

export default {
  Statistics,
  Histogram,
  TimeSeries,
  Coincidence,
};
