import { ConfigMapKind } from '~/k8sTypes';
import { KserveMetricsGraphTypes } from '~/concepts/metrics/kserve/const';

export type KserveMetricsConfigMapKind = ConfigMapKind & {
  data: {
    supported: 'true' | 'false';
    metrics: string;
  };
};

export type KserveMetricGraphDefinition = {
  title: string;
  type: KserveMetricsGraphTypes;
  queries: KserveMetricQueryDefinition[];
};

export type KserveMetricQueryDefinition = {
  title: string;
  query: string;
};

export type KserveMetricsDataObject = {
  config: KserveMetricGraphDefinition[];
};

export type KserveMetricsDefinition = {
  supported: boolean;
  loaded: boolean;
  error?: Error;
  graphDefinitions: KserveMetricGraphDefinition[];
};
