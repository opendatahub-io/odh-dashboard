export enum DataTypes {
  BOOL = 'BOOL',
  FLOAT = 'FLOAT',
  DOUBLE = 'DOUBLE',
  INT32 = 'INT32',
  INT64 = 'INT64',
  STRING = 'STRING',
}

export enum BiasMetricType {
  SPD = 'SPD',
  DIR = 'DIR',
}

export type TypedValue = {
  type: DataTypes;
  value: string;
};

export type BaseMetric = {
  protectedAttribute: string;
  outcomeName: string;
  modelId: string;
  requestName?: string;
  thresholdDelta?: number;
  batchSize?: number;
};

// Request type only for user input
export type BaseMetricRequestInput = {
  favorableOutcome: string;
  privilegedAttribute: string;
  unprivilegedAttribute: string;
} & BaseMetric;

// Request type for creating
export type BaseMetricRequest = {
  favorableOutcome: string | number | boolean;
  privilegedAttribute: string | number | boolean;
  unprivilegedAttribute: string | number | boolean;
} & BaseMetric;

export type BaseMetricResponse = {
  id: string;
  request: {
    metricName: BiasMetricType;
    favorableOutcome: TypedValue;
    privilegedAttribute: TypedValue;
    unprivilegedAttribute: TypedValue;
  } & BaseMetric;
};

export type BaseMetricListResponse = {
  requests: BaseMetricResponse[];
};

export type BaseMetricCreationResponse = {
  requestId: string;
  timestamp: string;
};
