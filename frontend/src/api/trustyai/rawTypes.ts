export enum DataTypes {
  BOOL = 'BOOL',
  FLOAT = 'FLOAT',
  DOUBLE = 'DOUBLE',
  INT32 = 'INT32',
  INT64 = 'INT64',
  STRING = 'STRING',
}

export enum MetricTypes {
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
  requestName: string;
  thresholdDelta?: number;
  batchSize?: number;
};

export type BaseMetricRequest = {
  favorableOutcome: string;
  privilegedAttribute: string;
  unprivilegedAttribute: string;
} & BaseMetric;

export type BaseMetricResponse = {
  id: string;
  request: {
    metricName: MetricTypes;
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

export type BaseMetricDeletionRequest = {
  requestId: string;
};
