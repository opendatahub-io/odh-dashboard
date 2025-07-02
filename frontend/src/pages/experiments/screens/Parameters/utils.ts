import { min, max } from 'lodash-es';
import { RegistryArtifactList } from '#~/concepts/modelRegistry/types.ts';

// Transform data into dimensions format for parallel coordinates plot
export const transformDataToDimensions = (
  data: RegistryArtifactList[],
): {
  label: string;
  values: number[];
}[] => {
  // Get all unique parameter/metric names
  const uniqueNames = new Set<string>();
  data.forEach((run) => {
    run.items.forEach((item) => {
      uniqueNames.add(item.name);
    });
  });

  // Create dimensions array
  return Array.from(uniqueNames).map((name) => {
    const values: number[] = [];

    data.forEach((run) => {
      const item = run.items.find((i) => i.name === name);
      if (item) {
        // For parameters, convert string value to number
        if (item.artifactType === 'parameter' && 'value' in item) {
          values.push(parseFloat(String(item.value)) || 0);
        }
        // For metrics, use the value directly
        else if (item.artifactType === 'metric' && 'value' in item) {
          values.push(Number(item.value));
        }
      } else {
        // If this run doesn't have this parameter/metric, use 0 or handle as needed
        values.push(0);
      }
    });

    return {
      label: name,
      values,
    };
  });
};

export const getColorScaleConfigsForDimension = (dimension?: {
  values: number[];
  label: string;
}): {
  showscale: boolean;
  colorscale: string;
  cmin: number;
  cmax: number;
  color: number[];
} | null => {
  const cmin = min(dimension?.values) ?? 0;
  const cmax = max(dimension?.values) ?? 0;
  return {
    showscale: true,
    colorscale: 'Jet',
    cmin,
    cmax,
    color: dimension?.values ?? [],
  };
};

export interface Option {
  label: string;
  value: string;
}

export interface MockDataItem {
  artifactType: string;
  createTimeSinceEpoch: string;
  customProperties?: Record<string, string>;
  id: string;
  lastUpdateTimeSinceEpoch: string;
  name: string;
  parameterType?: string;
  value?: string | number;
  step?: number;
  timestamp?: string;
  description?: string;
  state?: string;
  uri?: string;
}

export interface MockDataRun {
  items: MockDataItem[];
  nextPageToken: string;
  pageSize: number;
  size: number;
}

export type FilterCriteria = {
  parameterNames?: string[];
  artifactType?: 'parameter' | 'metric' | 'model-artifact';
  includeMetrics?: boolean;
  includeModelArtifacts?: boolean;
};

export const filterMockDataByParameters = (
  data: RegistryArtifactList[],
  criteria: FilterCriteria,
): RegistryArtifactList[] => {
  const {
    parameterNames = [],
    artifactType,
    includeMetrics = false,
    includeModelArtifacts = false,
  } = criteria;

  return data
    .map((run) => ({
      ...run,
      items: run.items.filter((item) => {
        if (artifactType && item.artifactType !== artifactType) {
          return false;
        }
        if (parameterNames.length > 0) {
          if (item.artifactType === 'parameter') {
            return parameterNames.includes(item.name);
          }
          if (item.artifactType === 'metric') {
            return includeMetrics && parameterNames.includes(item.name);
          }
          if (item.artifactType === 'model-artifact') {
            return includeModelArtifacts;
          }
          return false;
        }

        if (item.artifactType === 'parameter') {
          return true;
        }
        if (item.artifactType === 'metric') {
          return includeMetrics;
        }
        if (item.artifactType === 'model-artifact') {
          return includeModelArtifacts;
        }

        return true;
      }),
      size: 0,
    }))
    .map((run) => ({
      ...run,
      size: run.items.length,
    }));
};

export const getUniqueParameterNames = (
  data: RegistryArtifactList[],
  artifactType?: 'parameter' | 'metric' | 'model-artifact',
): string[] => {
  const names = new Set<string>();

  data.forEach((run) => {
    run.items.forEach((item) => {
      if (!artifactType || item.artifactType === artifactType) {
        names.add(item.name);
      }
    });
  });
  return Array.from(names).toSorted();
};
