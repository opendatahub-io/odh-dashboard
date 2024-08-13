import * as React from 'react';
import {
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarChip,
  Tooltip,
  Dropdown,
  DropdownItem,
  MenuToggle,
  DropdownList,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { FilterOptions } from '~/concepts/pipelines/content/tables/usePipelineFilter';

type FilterOptionRenders = {
  onChange: (value?: string, label?: string) => void;
  value?: string;
  label?: string;
};

type ToolbarFilterProps<T extends string> = React.ComponentProps<typeof ToolbarGroup> & {
  children?: React.ReactNode;
  filterOptions: { [key in T]?: string };
  filterOptionRenders: Record<T, (props: FilterOptionRenders) => React.ReactNode>;
  filterData: Record<T, string | { label: string; value: string } | undefined>;
  onFilterUpdate: (filterType: T, value?: string | { label: string; value: string }) => void;
  onClearFilters: () => void;
  testId?: string;
};

export type FilterProps = Pick<
  React.ComponentProps<typeof FilterToolbar>,
  'filterData' | 'onFilterUpdate' | 'onClearFilters'
>;

export function FilterToolbar<T extends string>({
  filterOptions,
  filterOptionRenders,
  filterData,
  onFilterUpdate,
  onClearFilters,
  children,
  testId = 'filter-toolbar',
  ...toolbarGroupProps
}: ToolbarFilterProps<T>): React.JSX.Element {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const keys = Object.keys(filterOptions) as Array<T>;
  const [open, setOpen] = React.useState(false);
  const [currentFilterType, setCurrentFilterType] = React.useState<T>(keys[0]);
  const isToolbarChip = (v: unknown): v is ToolbarChip & { key: T } =>
    !!v && Object.keys(v).every((k) => ['key', 'node'].includes(k));
  const filterItem = filterData[currentFilterType];

  return (
    <>
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
                aria-label="Pipeline Filter toggle"
                onClick={() => setOpen(!open)}
                isExpanded={open}
              >
                <>
                  <FilterIcon /> {filterOptions[currentFilterType]}
                </>
              </MenuToggle>
            )}
            isOpen={open}
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
        <ToolbarFilter
          categoryName="Filters"
          data-testid={`${testId}-text-field`}
          variant="search-filter"
          chips={keys
            .map<ToolbarChip | null>((filterKey) => {
              const optionValue = filterOptions[filterKey];
              const data = filterData[filterKey];
              if (data) {
                const dataValue: { label: string; value: string } | undefined =
                  typeof data === 'string' ? { label: data, value: data } : data;
                return {
                  key: filterKey,
                  node: (
                    <span data-testid={`${optionValue?.toLowerCase()}-filter-chip`}>
                      <b>{optionValue}:</b>{' '}
                      <Tooltip content={dataValue.value} position="top-start">
                        <span>{dataValue.label}</span>
                      </Tooltip>
                    </span>
                  ),
                };
              }
              return null;
            })
            .filter(isToolbarChip)}
          deleteChip={(_, chip) => {
            if (isToolbarChip(chip)) {
              onFilterUpdate(chip.key, '');
            }
          }}
          deleteChipGroup={() => onClearFilters()}
        >
          {filterOptionRenders[currentFilterType]({
            onChange: (value, label) =>
              onFilterUpdate(currentFilterType, label && value ? { label, value } : value),
            ...(typeof filterItem === 'string' ? { value: filterItem } : filterItem),
          })}
        </ToolbarFilter>
      </ToolbarGroup>
      {children}
    </>
  );
}

const PipelineFilterBar = <Options extends FilterOptions>(
  props: ToolbarFilterProps<Options>,
): React.JSX.Element => <FilterToolbar {...props} testId="pipeline-filter" />;

export default PipelineFilterBar;
