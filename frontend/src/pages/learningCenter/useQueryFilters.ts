import * as React from 'react';
import { useQueryParams } from '#~/utilities/useQueryParams';

export const useQueryFilters = (key: string): string[] => {
  const queryParams = useQueryParams();
  const enabledFilters = queryParams.get(key);

  const filters = React.useMemo(() => {
    if (!enabledFilters) {
      return [];
    }
    try {
      const parsedFilters = JSON.parse(enabledFilters);
      return Array.isArray(parsedFilters) ? parsedFilters : [parsedFilters];
    } catch {
      return [];
    }
  }, [enabledFilters]);

  return filters;
};
