import type { BaseMetric, BiasMetricType } from '@odh-dashboard/k8s-core/trustyai';

export enum DataTypes {
  BOOL = 'BOOL',
  FLOAT = 'FLOAT',
  DOUBLE = 'DOUBLE',
  INT32 = 'INT32',
  INT64 = 'INT64',
  STRING = 'STRING',
}

export type TypedValue = {
  type: DataTypes;
  value: string;
};

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
