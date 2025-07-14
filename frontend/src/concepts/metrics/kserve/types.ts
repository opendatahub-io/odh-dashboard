import { ConfigMapKind } from '#~/k8sTypes';
import { KserveMetricsGraphTypes, NimMetricsGraphTypes } from '#~/concepts/metrics/kserve/const';

export type KserveMetricsConfigMapKind = ConfigMapKind & {
  data: {
    supported: 'true' | 'false';
    metrics: string;
  };
};

export type MetricQueryDefinition = {
  title: string;
  query: string;
};

//Kserve Data Type Defenitions

export type KserveMetricsDataObject = {
  config: KserveMetricGraphDefinition[];
};

export type KserveMetricGraphDefinition = {
  title: string;
  type: KserveMetricsGraphTypes;
  queries: MetricQueryDefinition[];
};

export type KserveMetricsDefinition = {
  supported: boolean;
  loaded: boolean;
  error?: Error;
  graphDefinitions: KserveMetricGraphDefinition[];
};

//Nim Data Type Defenitions
export type NimMetricsDataObject = {
  config: NimMetricGraphDefinition[];
};

export type NimMetricGraphDefinition = {
  title: string;
  type: NimMetricsGraphTypes;
  queries: MetricQueryDefinition[];
};

export type NimMetricsDefinition = {
  supported: boolean;
  loaded: boolean;
  error?: Error;
  graphDefinitions: NimMetricGraphDefinition[];
};
