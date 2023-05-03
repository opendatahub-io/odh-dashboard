export enum DataTypes {
  BOOL,
  FLOAT,
  DOUBLE,
  INT32,
  INT64,
  STRING,
}

export enum MetricTypes {
  SPD,
  DIR,
}

export type TypedValue = {
  type: DataTypes;
  value: string;
};

export type BaseMetricRequest = {
  protectedAttribute: string;
  favorableOutcome: TypedValue;
  outcomeName: string;
  privilegedAttribute: TypedValue;
  unprivilegedAttribute: TypedValue;
  modelId: string;
  requestName: string;
  thresholdDelta: number;
  batchSize: number;
};
