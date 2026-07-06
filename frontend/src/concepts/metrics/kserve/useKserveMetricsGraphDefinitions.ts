import React from 'react';
import {
  KserveMetricsConfigMapKind,
  KserveMetricsDefinition,
} from '#~/concepts/metrics/kserve/types';
import { isValidKserveMetricsDataObject } from '#~/concepts/metrics/kserve/utils';

const useKserveMetricsGraphDefinitions = (
  kserveMetricsConfigMap: KserveMetricsConfigMapKind | null,
): KserveMetricsDefinition =>
  React.useMemo(() => {
    const result: KserveMetricsDefinition = {
      supported: false,
      loaded: !!kserveMetricsConfigMap,
      graphDefinitions: [],
    };

    if (kserveMetricsConfigMap) {
      result.supported = kserveMetricsConfigMap.data.supported === 'true';

      let parsed: unknown;
      if (result.supported) {
        try {
          parsed = JSON.parse(kserveMetricsConfigMap.data.metrics);
        } catch (e) {
          result.error = new Error('Error reading metrics configuration: malformed JSON');
          result.loaded = true;
        }

        if (!result.error) {
          if (isValidKserveMetricsDataObject(parsed)) {
            result.graphDefinitions = parsed.config;
          } else {
            result.error = new Error('Error reading metrics configuration: schema mismatch');
            result.loaded = true;
          }
        }
      }
    }
    return result;
  }, [kserveMetricsConfigMap]);

export default useKserveMetricsGraphDefinitions;
