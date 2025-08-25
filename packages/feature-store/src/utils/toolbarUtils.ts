import {
  FilterLabel,
  FilterData,
  MultipleLabels,
  BaseFilterOptionRenders,
  OnFilterUpdate,
  LabelToDelete,
  MultipleLabelForType,
} from '../types/toolbarTypes';

export const buildFilterLabel = (key: string, node: string, testIdParam?: string): FilterLabel => ({
  key,
  node,
  ...(testIdParam ? { props: { 'data-testid': testIdParam } } : {}),
});

export const buildFilterLabelList = <T extends string>(
  filterKey: T,
  filterData: FilterData<T>,
  multipleLabels?: MultipleLabels<T>,
): FilterLabel[] => {
  const data = filterData[filterKey];
  const multipleLabelsForType = multipleLabels?.[filterKey] || [];

  const items: FilterLabel[] = [];

  // Add main active filter item
  if (data) {
    const mainLabel = typeof data === 'string' ? data : data.label;
    if (mainLabel) {
      items.push(buildFilterLabel(filterKey, mainLabel));
    }
  }

  // Add multiple active filter items
  items.push(
    ...multipleLabelsForType.map(({ key, label, testId: labelTestId }) =>
      buildFilterLabel(key, label, labelTestId),
    ),
  );

  return items;
};

export const handleLabelDelete = <T extends string>(
  labelToDelete: LabelToDelete,
  filterKey: T,
  multipleLabelsForType: MultipleLabelForType,
  onFilterUpdate: OnFilterUpdate<T>,
): void => {
  if (typeof labelToDelete === 'string') {
    onFilterUpdate(filterKey, '');
    return;
  }

  const labelKey = labelToDelete.key;
  if (labelKey === filterKey) {
    // Remove the main filter value
    onFilterUpdate(filterKey, '');
    return;
  }
  //logic to remove a specific multiple labels in the filter
  const multipleLabelToRemove = multipleLabelsForType.find((l) => l.key === labelKey);

  if (multipleLabelToRemove) {
    // Remove a specific multiple label/tag
    multipleLabelToRemove.onRemove();
  }
};

export const getFilterOptionProps = <T extends string>(
  filterKey: T,
  filterItem: string | { label: string; value: string } | undefined,
  onFilterUpdate: OnFilterUpdate<T>,
): BaseFilterOptionRenders => ({
  onChange: (value?: string, label?: string) =>
    onFilterUpdate(filterKey, label && value ? { label, value } : value),
  ...(typeof filterItem === 'string' ? { value: filterItem } : filterItem ?? {}),
});
