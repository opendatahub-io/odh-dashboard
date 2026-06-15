import * as React from 'react';
import { ModelCatalogContext } from '~/app/context/modelCatalog/ModelCatalogContext';
import {
  ModelCatalogStringFilterKey,
  ModelCatalogNumberFilterKey,
} from '~/concepts/modelCatalog/const';
import {
  ModelCatalogFilterStates,
  ModelCatalogStringFilterValueType,
} from '~/app/modelCatalogTypes';
import { useStringFilterState } from '~/app/shared/components/catalog';

export const useCatalogStringFilterState = <K extends ModelCatalogStringFilterKey>(
  filterKey: K,
): {
  selectedValues: string[];
  isSelected: (value: ModelCatalogStringFilterValueType[K]) => boolean;
  setSelected: (value: string, selected: boolean) => void;
} => {
  const { filters, setFilters } = React.useContext(ModelCatalogContext);
  const currentValues: string[] = filters[filterKey];

  const onChange = React.useCallback(
    (values: string[]) => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- all string filter keys map to string[] subtypes at runtime
      setFilters((prev) => ({ ...prev, [filterKey]: values as ModelCatalogFilterStates[K] }));
    },
    [filterKey, setFilters],
  );

  const shared = useStringFilterState(currentValues, onChange);

  const { isSelected: sharedIsSelected } = shared;
  const isSelected = React.useCallback(
    (value: ModelCatalogStringFilterValueType[K]) => sharedIsSelected(value),
    [sharedIsSelected],
  );

  return {
    selectedValues: shared.selectedValues,
    isSelected,
    setSelected: shared.setSelected,
  };
};

export const useCatalogNumberFilterState = (
  filterKey: ModelCatalogNumberFilterKey,
): {
  value: number | undefined;
  setValue: (value: number | undefined) => void;
} => {
  const { filters, setFilters } = React.useContext(ModelCatalogContext);
  const value = filters[filterKey];
  const setValue = React.useCallback(
    (newValue: number | undefined) => {
      setFilters((prev) => ({ ...prev, [filterKey]: newValue }));
    },
    [filterKey, setFilters],
  );
  return { value, setValue };
};
