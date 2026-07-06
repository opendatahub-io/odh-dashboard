import {
  TimeframeTimeType,
  TimeframeTitle,
  TimeframeStepType,
  RefreshIntervalValueType,
  RefreshIntervalTitle,
} from '#~/concepts/metrics/types';

/**
 * The desired range (x-axis) of the charts.
 * Unit is in seconds
 */
export const TimeframeTimeRange: TimeframeTimeType = {
  [TimeframeTitle.ONE_HOUR]: 60 * 60,
  [TimeframeTitle.ONE_DAY]: 24 * 60 * 60,
  [TimeframeTitle.ONE_WEEK]: 7 * 24 * 60 * 60,
  [TimeframeTitle.ONE_MONTH]: 30 * 24 * 60 * 60,
};

/**
 * How large a step is -- value is in how many seconds to combine to create an individual data response
 * Each should be getting ~300 data points (assuming data fills the gap)
 *
 * eg. [TimeframeTitle.ONE_DAY]: 24 * 12,
 *   24h * 60m * 60s => 86,400 seconds of space
 *   86,400 / (24 * 12) => 300 points of prometheus data
 *
 * NOTE: In order to match up with the values used by the OpenShift console, these are set as 12 * NUMBER_OF_HOURS.
 */
export const TimeframeStep: TimeframeStepType = {
  [TimeframeTitle.ONE_HOUR]: 12,
  [TimeframeTitle.ONE_DAY]: 24 * 12,
  [TimeframeTitle.ONE_WEEK]: 7 * 24 * 12,
  [TimeframeTitle.ONE_MONTH]: 30 * 24 * 12,
};

/**
 * How often to poll for new prometheus data in milliseconds.
 */
export const RefreshIntervalValue: RefreshIntervalValueType = {
  [RefreshIntervalTitle.FIFTEEN_SECONDS]: 15 * 1000,
  [RefreshIntervalTitle.THIRTY_SECONDS]: 30 * 1000,
  [RefreshIntervalTitle.ONE_MINUTE]: 60 * 1000,
  [RefreshIntervalTitle.FIVE_MINUTES]: 5 * 60 * 1000,
  [RefreshIntervalTitle.FIFTEEN_MINUTES]: 15 * 60 * 1000,
  [RefreshIntervalTitle.THIRTY_MINUTES]: 30 * 60 * 1000,
  [RefreshIntervalTitle.ONE_HOUR]: 60 * 60 * 1000,
  [RefreshIntervalTitle.TWO_HOURS]: 2 * 60 * 60 * 1000,
  [RefreshIntervalTitle.ONE_DAY]: 24 * 60 * 60 * 1000,
};

/**
 * Value chosen to match rates used in OpenShift console observability dashboard. This means for rate
 * queries (e.g. http requests) that the time series will contain values for number of requests per 5m.
 */
export const PROMETHEUS_REQUEST_RESOLUTION = '300s';
