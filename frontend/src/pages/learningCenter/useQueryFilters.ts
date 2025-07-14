import * as React from 'react';
import { useSearchParams } from 'react-router-dom';

export const useQueryFilters = (key: string): string[] => {
  const [searchParams] = useSearchParams();
  const enabledFilters = searchParams.get(key);

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
