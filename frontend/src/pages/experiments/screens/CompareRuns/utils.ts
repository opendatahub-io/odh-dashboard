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
  if (!dimension) return null;
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
