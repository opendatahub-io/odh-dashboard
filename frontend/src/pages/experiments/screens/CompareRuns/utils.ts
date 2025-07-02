import { min, max } from 'lodash-es';

// Transform data into dimensions format for parallel coordinates plot
export const transformDataToDimensions = (data: any) => {
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

export const getColorScaleConfigsForDimension = (dimension: any) => {
  if (!dimension) {
    return null;
  }
  const cmin = min(dimension.values);
  const cmax = max(dimension.values);
  return {
    showscale: true,
    colorscale: 'Jet',
    cmin,
    cmax,
    color: dimension.values,
  };
};

export interface Option {
  label: string;
  value: string;
}

export interface MockDataItem {
  artifactType: string;
  createTimeSinceEpoch: string;
  customProperties?: any;
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
  data: MockDataRun[],
  criteria: FilterCriteria,
): MockDataRun[] => {
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
  data: MockDataRun[],
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
