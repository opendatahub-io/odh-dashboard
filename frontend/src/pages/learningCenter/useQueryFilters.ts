import * as React from 'react';
import { useQueryParams } from '../../utilities/useQueryParams';

export const useQueryFilters = (key: string): string[] => {
  const queryParams = useQueryParams();
  const enabledFilters = queryParams.get(key);

  const filters = React.useMemo(() => {
    if (!enabledFilters) {
      return [];
    }
    try {
      const filters = JSON.parse(enabledFilters);
      return Array.isArray(filters) ? filters : [filters];
    } catch {
      return [];
    }
  }, [enabledFilters]);

  return filters;
};
