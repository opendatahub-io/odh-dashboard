import React from 'react';
import { KserveMetricsConfigMapKind, NimMetricsDefinition } from '#~/concepts/metrics/kserve/types';
import { isValidNimMetricsDataObject } from '#~/concepts/metrics/kserve/utils';

const useNimMetricsGraphDefinitions = (
  kserveMetricsConfigMap: KserveMetricsConfigMapKind | null,
): NimMetricsDefinition =>
  React.useMemo(() => {
    const result: NimMetricsDefinition = {
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
          if (isValidNimMetricsDataObject(parsed)) {
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

export default useNimMetricsGraphDefinitions;
