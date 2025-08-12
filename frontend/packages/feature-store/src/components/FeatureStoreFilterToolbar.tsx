import * as React from 'react';
import {
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';

export type FilterOptionRenders = {
  onChange: (value?: string, label?: string) => void;
  value?: string;
  label?: string;
};

export type FeatureStoreFilterToolbarProps<T extends string> = React.ComponentProps<
  typeof ToolbarGroup
> & {
  children?: React.ReactNode;
  filterOptions: { [key in T]?: string };
  filterOptionRenders: Record<T, (props: FilterOptionRenders) => React.ReactNode>;
  filterData: Record<T, string | { label: string; value: string } | undefined>;
  onFilterUpdate: (filterType: T, value?: string | { label: string; value: string }) => void;
  testId?: string;
  currentFilterType?: T;
  onFilterTypeChange?: (filterType: T) => void;
  multipleLabels?: Record<
    T,
    Array<{ key: string; label: string; onRemove: () => void; testId?: string }>
  >;
};

function FeatureStoreFilterToolbar<T extends string>({
  filterOptions,
  filterOptionRenders,
  filterData,
  onFilterUpdate,
  children,
  testId = 'filter-toolbar',
  currentFilterType: externalCurrentFilterType,
  onFilterTypeChange,
  multipleLabels,
  ...toolbarGroupProps
}: FeatureStoreFilterToolbarProps<T>): React.JSX.Element {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const keys = Object.keys(filterOptions) as T[];
  const [open, setOpen] = React.useState(false);
  const [internalCurrentFilterType, setInternalCurrentFilterType] = React.useState<T>(keys[0]);

  const currentFilterType = externalCurrentFilterType ?? internalCurrentFilterType;
  const setCurrentFilterType = (filterType: T) => {
    if (onFilterTypeChange) {
      onFilterTypeChange(filterType);
    } else {
      setInternalCurrentFilterType(filterType);
    }
  };

  const filterItem = filterData[currentFilterType];

  return (
    <>
      <ToolbarToggleGroup breakpoint="md" toggleIcon={<FilterIcon />}>
        <ToolbarGroup variant="filter-group" data-testid={testId} {...toolbarGroupProps}>
          <ToolbarItem>
            <Dropdown
              onOpenChange={(isOpenChange) => setOpen(isOpenChange)}
              shouldFocusToggleOnSelect
              toggle={(toggleRef) => (
                <MenuToggle
                  data-testid={`${testId}-dropdown`}
                  id={`${testId}-toggle-button`}
                  ref={toggleRef}
                  aria-label="Filter toggle"
                  onClick={() => setOpen(!open)}
                  isExpanded={open}
                  icon={<FilterIcon />}
                >
                  {filterOptions[currentFilterType]}
                </MenuToggle>
              )}
              isOpen={open}
              popperProps={{ appendTo: 'inline' }}
            >
              <DropdownList>
                {keys.map((filterKey) => (
                  <DropdownItem
                    key={filterKey}
                    id={filterKey}
                    onClick={() => {
                      setOpen(false);
                      setCurrentFilterType(filterKey);
                    }}
                  >
                    {filterOptions[filterKey]}
                  </DropdownItem>
                ))}
              </DropdownList>
            </Dropdown>
          </ToolbarItem>
          {keys.map((filterKey) => {
            const optionValue = filterOptions[filterKey];
            const data = filterData[filterKey];
            const dataValue: { label: string; value: string } | undefined =
              typeof data === 'string' ? { label: data, value: data } : data;

            const multipleLabelsForType = multipleLabels?.[filterKey] || [];

            const allLabels = [
              ...(data && dataValue
                ? [
                    {
                      key: filterKey,
                      node: dataValue.label,
                    },
                  ]
                : []),
              ...multipleLabelsForType.map((label) => ({
                key: label.key,
                node: label.label,
                props: label.testId ? { 'data-testid': label.testId } : undefined,
              })),
            ];

            return optionValue ? (
              <ToolbarFilter
                key={filterKey}
                categoryName={optionValue}
                data-testid={`${testId}-text-field`}
                labels={allLabels}
                deleteLabel={(category, labelToDelete) => {
                  if (typeof labelToDelete === 'string') {
                    onFilterUpdate(filterKey, '');
                  } else {
                    const labelKey = labelToDelete.key;
                    const tagsToRemove = multipleLabelsForType.find((l) => l.key === labelKey);

                    if (tagsToRemove) {
                      tagsToRemove.onRemove();
                    } else if (labelKey === filterKey) {
                      onFilterUpdate(filterKey, '');
                    }
                  }
                }}
                showToolbarItem={currentFilterType === filterKey}
              >
                {filterOptionRenders[filterKey]({
                  onChange: (value, label) =>
                    onFilterUpdate(filterKey, label && value ? { label, value } : value),
                  ...(typeof filterItem === 'string' ? { value: filterItem } : filterItem),
                })}
              </ToolbarFilter>
            ) : null;
          })}
        </ToolbarGroup>
      </ToolbarToggleGroup>
      {children}
    </>
  );
}

export default FeatureStoreFilterToolbar;
