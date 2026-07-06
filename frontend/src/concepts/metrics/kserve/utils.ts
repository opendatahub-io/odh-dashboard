import { ConfigMapKind } from '#~/k8sTypes';
import {
  KserveMetricsConfigMapKind,
  KserveMetricsDataObject,
  NimMetricsDataObject,
} from '#~/concepts/metrics/kserve/types';

export const isKserveMetricsConfigMapKind = (
  configMapKind: ConfigMapKind,
): configMapKind is KserveMetricsConfigMapKind => {
  if (configMapKind.data?.supported === 'true' && typeof configMapKind.data.metrics === 'string') {
    return true;
  }

  return configMapKind.data?.supported === 'false';
};

export const isValidKserveMetricsDataObject = (obj: unknown): obj is KserveMetricsDataObject => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  return 'config' in obj && Array.isArray(obj.config) && obj.config.length > 0;
};

export const isValidNimMetricsDataObject = (obj: unknown): obj is NimMetricsDataObject => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  return 'config' in obj && Array.isArray(obj.config) && obj.config.length > 0;
};
