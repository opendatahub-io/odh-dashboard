import React from 'react';
import { ModelCatalogContext } from '~/app/context/modelCatalog/ModelCatalogContext';
import { hasFiltersApplied } from '~/app/pages/modelCatalog/utils/modelCatalogUtils';
import { BASIC_FILTER_KEYS } from '~/concepts/modelCatalog/const';

export const useHasVisibleFiltersApplied = (): boolean => {
  const { filters, performanceViewEnabled } = React.useContext(ModelCatalogContext);

  return React.useMemo(
    () =>
      performanceViewEnabled
        ? hasFiltersApplied(filters)
        : hasFiltersApplied(filters, BASIC_FILTER_KEYS),
    [filters, performanceViewEnabled],
  );
};
