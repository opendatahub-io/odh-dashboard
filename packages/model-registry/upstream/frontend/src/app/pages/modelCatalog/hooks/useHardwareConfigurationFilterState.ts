import * as React from 'react';
import { ModelCatalogStringFilterKey } from '~/concepts/modelCatalog/const';
import { ModelCatalogContext } from '~/app/context/modelCatalog/ModelCatalogContext';

const filterKey = ModelCatalogStringFilterKey.HARDWARE_CONFIGURATION;

export const useHardwareConfigurationFilterState = (): {
  appliedValues: string[];
  setAppliedValues: (values: string[]) => void;
  clearFilters: () => void;
} => {
  const { filters, setFilters } = React.useContext(ModelCatalogContext);
  const appliedValues: string[] = filters[filterKey];

  const setAppliedValues = React.useCallback(
    (values: string[]) => {
      setFilters((prev) => ({ ...prev, [filterKey]: values }));
    },
    [setFilters],
  );

  const clearFilters = React.useCallback(() => {
    setFilters((prev) => ({ ...prev, [filterKey]: [] }));
  }, [setFilters]);

  return { appliedValues, setAppliedValues, clearFilters };
};
