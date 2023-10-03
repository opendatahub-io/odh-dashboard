import * as React from 'react';
import {
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarChip,
  Tooltip,
} from '@patternfly/react-core';
import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core/deprecated';
import { FilterIcon } from '@patternfly/react-icons';
import { ValueOf } from '~/typeHelpers';

type FilterProps = {
  onChange: (value: string) => void;
  value: string;
};

type Child = React.ReactElement<typeof ToolbarItem>;
type PipelineFilterBarProps<Options extends Record<string, string>> = {
  children: Child | Child[];
  filterOptions: Options;
  filterOptionRenders: Record<ValueOf<Options>, (props: FilterProps) => React.ReactNode>;
  filterData: Record<ValueOf<Options>, string>;
  onFilterUpdate: (filterType: ValueOf<Options>, value: string) => void;
  onClearFilters: () => void;
};

const PipelineFilterBar = <Options extends Record<string, string>>({
  filterOptions,
  filterOptionRenders,
  filterData,
  onFilterUpdate,
  onClearFilters,
  children,
}: PipelineFilterBarProps<Options>) => {
  const [open, setOpen] = React.useState(false);
  const [currentFilterType, setCurrentFilterType] = React.useState<keyof Options>(
    Object.keys(filterOptions)[0],
  );
  const isToolbarChip = (v: unknown): v is ToolbarChip & { key: keyof Options } =>
    !!v && Object.keys(v as ToolbarChip).every((k) => ['key', 'node'].includes(k));

  return (
    <>
      <ToolbarGroup variant="filter-group">
        <ToolbarItem>
          <Dropdown
            toggle={
              <DropdownToggle id="toggle-basic" onToggle={() => setOpen(!open)}>
                <>
                  <FilterIcon /> {filterOptions[currentFilterType]}
                </>
              </DropdownToggle>
            }
            isOpen={open}
            dropdownItems={Object.keys(filterOptions).map((filterKey) => (
              <DropdownItem
                key={filterKey}
                onClick={() => {
                  setOpen(false);
                  setCurrentFilterType(filterKey);
                }}
              >
                {filterOptions[filterKey]}
              </DropdownItem>
            ))}
          />
        </ToolbarItem>
        <ToolbarFilter
          categoryName="Filters"
          variant="search-filter"
          chips={Object.keys(filterOptions)
            .map<ToolbarChip | null>((filterKey) => {
              const optionValue = filterOptions[filterKey];
              const dataValue = filterData[optionValue as ValueOf<Options>];
              if (dataValue) {
                return {
                  key: filterKey,
                  node: (
                    <>
                      <b>{optionValue}:</b>{' '}
                      <Tooltip content={dataValue} position="top-start">
                        <span>{dataValue}</span>
                      </Tooltip>
                    </>
                  ),
                };
              }
              return null;
            })
            .filter(isToolbarChip)}
          deleteChip={(_, chip) => {
            if (isToolbarChip(chip)) {
              onFilterUpdate(filterOptions[chip.key as keyof Options], '');
            }
          }}
          deleteChipGroup={() => onClearFilters()}
        >
          {filterOptionRenders[filterOptions[currentFilterType]]({
            onChange: (value) => onFilterUpdate(filterOptions[currentFilterType], value),
            value: filterData[filterOptions[currentFilterType]],
          })}
        </ToolbarFilter>
      </ToolbarGroup>
      {children}
    </>
  );
};

export default PipelineFilterBar;
