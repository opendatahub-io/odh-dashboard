import React from 'react';
import { getMetricsColumnsLocalStorageKey } from './utils';

export const useMetricColumnNames = (experimentId: string, metricsNames: Set<string>): string[] => {
  const metricsColumnsLocalStorageKey = getMetricsColumnsLocalStorageKey(experimentId);
  const metricsColumnsLocalStorageItem = localStorage.getItem(metricsColumnsLocalStorageKey) ?? '';
  const storedMetricsColumnNames: string[] | undefined = metricsColumnsLocalStorageItem
    ? JSON.parse(metricsColumnsLocalStorageItem)
    : undefined;
  const [firstDefaultMetricColumn, secondDefaultMetricColumn] = [...metricsNames];

  // Defaults include at least 1 and no more than 2 metrics.
  const defaultMetricsColumnNames = React.useMemo(
    () => [
      ...(firstDefaultMetricColumn ? [firstDefaultMetricColumn] : []),
      ...(secondDefaultMetricColumn ? [secondDefaultMetricColumn] : []),
    ],
    [firstDefaultMetricColumn, secondDefaultMetricColumn],
  );
  const metricsColumnNames = experimentId
    ? storedMetricsColumnNames ?? defaultMetricsColumnNames
    : [];

  // Set default metric columns in localStorage when no prior stored
  // columns exist and at least 1 metric exists to use as a default.
  React.useEffect(() => {
    if (
      metricsColumnsLocalStorageKey &&
      !storedMetricsColumnNames &&
      defaultMetricsColumnNames.length
    ) {
      localStorage.setItem(
        metricsColumnsLocalStorageKey,
        JSON.stringify(defaultMetricsColumnNames),
      );
    }
  }, [defaultMetricsColumnNames, metricsColumnsLocalStorageKey, storedMetricsColumnNames]);

  return metricsColumnNames;
};
