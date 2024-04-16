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
import { FilterOptions } from '~/concepts/pipelines/content/tables/usePipelineFilter';

type FilterOptionRenders = {
  onChange: (value?: string, label?: string) => void;
  value?: string;
  label?: string;
};

type PipelineFilterBarProps<Options extends FilterOptions> = {
  children?: React.ReactNode;
  filterOptions: { [key in Options]?: string };
  filterOptionRenders: Record<Options, (props: FilterOptionRenders) => React.ReactNode>;
  filterData: Record<Options, string | { label: string; value: string } | undefined>;
  onFilterUpdate: (filterType: Options, value?: string | { label: string; value: string }) => void;
  onClearFilters: () => void;
};

export type FilterProps = Pick<
  React.ComponentProps<typeof PipelineFilterBar>,
  'filterData' | 'onFilterUpdate' | 'onClearFilters'
>;

const PipelineFilterBar = <Options extends FilterOptions>({
  filterOptions,
  filterOptionRenders,
  filterData,
  onFilterUpdate,
  onClearFilters,
  children,
  ...props
}: PipelineFilterBarProps<Options>): React.JSX.Element => {
  const keys = Object.keys(filterOptions) as Array<Options>;
  const [open, setOpen] = React.useState(false);
  const [currentFilterType, setCurrentFilterType] = React.useState<Options>(keys[0]);
  const isToolbarChip = (v: unknown): v is ToolbarChip & { key: Options } =>
    !!v && Object.keys(v as ToolbarChip).every((k) => ['key', 'node'].includes(k));

  return (
    <>
      <ToolbarGroup variant="filter-group" data-testid="pipeline-filter-toolbar" {...props}>
        <ToolbarItem>
          <Dropdown
            toggle={
              <DropdownToggle id="pipeline-filter-toggle-button" onToggle={() => setOpen(!open)}>
                <>
                  <FilterIcon /> {filterOptions[currentFilterType]}
                </>
              </DropdownToggle>
            }
            isOpen={open}
            dropdownItems={keys.map((filterKey) => (
              <DropdownItem
                key={filterKey.toString()}
                onClick={() => {
                  setOpen(false);
                  setCurrentFilterType(filterKey);
                }}
              >
                {filterOptions[filterKey]}
              </DropdownItem>
            ))}
            data-testid="pipeline-filter-dropdown"
          />
        </ToolbarItem>
        <ToolbarFilter
          categoryName="Filters"
          data-testid="run-table-toolbar-filter-text-field"
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
              onFilterUpdate(chip.key);
            }
          }}
          deleteChipGroup={() => onClearFilters()}
        >
          {filterOptionRenders[currentFilterType]({
            onChange: (value, label) =>
              onFilterUpdate(currentFilterType, label && value ? { label, value } : value),
            ...(typeof filterData[currentFilterType] === 'string'
              ? { value: filterData[currentFilterType] as string }
              : (filterData[currentFilterType] as { label: string; value: string })),
          })}
        </ToolbarFilter>
      </ToolbarGroup>
      {children}
    </>
  );
};

export default PipelineFilterBar;
