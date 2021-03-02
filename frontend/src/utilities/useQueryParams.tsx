import * as React from 'react';
import { useLocation } from 'react-router-dom';

export const useQueryParams = (): URLSearchParams => {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
};
