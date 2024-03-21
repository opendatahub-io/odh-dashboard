export enum TimeframeTitle {
  ONE_HOUR = '1 hour',
  ONE_DAY = '24 hours',
  ONE_WEEK = '7 days',
  ONE_MONTH = '30 days',
  // UNLIMITED = 'Unlimited',
}

export type TimeframeTimeType = {
  [key in TimeframeTitle]: number;
};

export type TimeframeStepType = TimeframeTimeType;

export enum RefreshIntervalTitle {
  FIFTEEN_SECONDS = '15 seconds',
  THIRTY_SECONDS = '30 seconds',
  ONE_MINUTE = '1 minute',
  FIVE_MINUTES = '5 minutes',
  FIFTEEN_MINUTES = '15 minutes',
  THIRTY_MINUTES = '30 minutes',
  ONE_HOUR = '1 hour',
  TWO_HOURS = '2 hours',
  ONE_DAY = '1 day',
}

export type RefreshIntervalValueType = {
  [key in RefreshIntervalTitle]: number;
};
