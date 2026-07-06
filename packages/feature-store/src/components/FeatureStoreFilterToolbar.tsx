import React from 'react';
import { FilterIcon } from '@patternfly/react-icons';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import {
  buildFilterLabelList,
  handleLabelDelete,
  getFilterOptionProps,
} from '../utils/toolbarUtils';
import { FeatureStoreFilterToolbarProps, FilterLabel } from '../types/toolbarTypes';

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
  const keys = React.useMemo(() => Object.keys(filterOptions) as T[], [filterOptions]);

  const [open, setOpen] = React.useState(false);
  const [internalCurrentFilterType, setInternalCurrentFilterType] = React.useState<T>(keys[0]);

  const currentFilterType = externalCurrentFilterType ?? internalCurrentFilterType;

  const setCurrentFilterType = React.useCallback(
    (filterType: T) => {
      if (onFilterTypeChange) {
        onFilterTypeChange(filterType);
      } else {
        setInternalCurrentFilterType(filterType);
      }
    },
    [onFilterTypeChange],
  );

  const allFilterItems = React.useMemo(() => {
    const result = new Map<T, FilterLabel[]>();
    keys.forEach((filterKey) => {
      result.set(filterKey, buildFilterLabelList(filterKey, filterData, multipleLabels));
    });
    return result;
  }, [keys, filterData, multipleLabels]);

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
            const allActiveFilterItems = allFilterItems.get(filterKey);

            return optionValue ? (
              <ToolbarFilter
                key={filterKey}
                categoryName={optionValue}
                data-testid={`${testId}-text-field`}
                labels={allActiveFilterItems}
                deleteLabel={(category, labelToDelete) =>
                  handleLabelDelete(
                    labelToDelete,
                    filterKey,
                    multipleLabels?.[filterKey] || [],
                    onFilterUpdate,
                  )
                }
                showToolbarItem={currentFilterType === filterKey}
              >
                {filterOptionRenders[filterKey](
                  getFilterOptionProps(filterKey, filterData[filterKey], onFilterUpdate),
                )}
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
