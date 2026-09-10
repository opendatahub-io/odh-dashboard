import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  SearchInput,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import SimpleSelect, {
  type SimpleSelectOption,
} from '@odh-dashboard/ui-core/components/SimpleSelect';
import {
  ClusterQueueWorkloadsToolbarFilterOptions,
  clusterQueueWorkloadsFilterOptions,
  clusterQueueWorkloadsFilterPlaceholders,
} from '../../const';
import { QUOTA_USAGE_WORKLOAD_STATUS_FILTER_OPTIONS } from '../../types';

export type ClusterQueueWorkloadsFilterDataType = {
  name?: string;
  status?: string | { label: string; value: string };
  priority?: string | { label: string; value: string };
  hardwareProfile?: string | { label: string; value: string };
};

const statusFilterOptions: SimpleSelectOption[] = [
  { key: '', label: 'All' },
  ...QUOTA_USAGE_WORKLOAD_STATUS_FILTER_OPTIONS.map((status) => ({
    key: status,
    label: status,
  })),
];

const attributeFilterKeys: ClusterQueueWorkloadsToolbarFilterOptions[] = [
  ClusterQueueWorkloadsToolbarFilterOptions.status,
  ClusterQueueWorkloadsToolbarFilterOptions.priority,
  ClusterQueueWorkloadsToolbarFilterOptions.hardwareProfile,
];

const getFilterSelectValue = (
  filter?: string | { label: string; value: string },
): string | undefined => (typeof filter === 'string' ? filter : filter?.value);

const buildWorkloadFilterOptions = (values: Array<string | undefined>): SimpleSelectOption[] => [
  { key: '', label: 'All' },
  ...[...new Set(values.filter((value): value is string => Boolean(value)))]
    .toSorted()
    .map((value) => ({
      key: value,
      label: value,
    })),
];

type ClusterQueueWorkloadsToolbarProps = {
  filterData: ClusterQueueWorkloadsFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
  priorityFilterOptions: SimpleSelectOption[];
  hardwareProfileFilterOptions: SimpleSelectOption[];
};

const ClusterQueueWorkloadsToolbar: React.FC<ClusterQueueWorkloadsToolbarProps> = ({
  filterData,
  onFilterUpdate,
  priorityFilterOptions,
  hardwareProfileFilterOptions,
}) => {
  const [isFilterTypeOpen, setIsFilterTypeOpen] = React.useState(false);
  const [currentFilterType, setCurrentFilterType] =
    React.useState<ClusterQueueWorkloadsToolbarFilterOptions>(
      ClusterQueueWorkloadsToolbarFilterOptions.status,
    );

  const attributeFilterOptions: Record<
    ClusterQueueWorkloadsToolbarFilterOptions,
    SimpleSelectOption[]
  > = {
    [ClusterQueueWorkloadsToolbarFilterOptions.status]: statusFilterOptions,
    [ClusterQueueWorkloadsToolbarFilterOptions.priority]: priorityFilterOptions,
    [ClusterQueueWorkloadsToolbarFilterOptions.hardwareProfile]: hardwareProfileFilterOptions,
  };

  const renderAttributeFilter = (filterKey: ClusterQueueWorkloadsToolbarFilterOptions) => {
    const options = attributeFilterOptions[filterKey];
    const filterValue = filterData[filterKey];
    const selectedValue = getFilterSelectValue(filterValue) ?? '';
    const placeholder = clusterQueueWorkloadsFilterPlaceholders[filterKey];

    return (
      <SimpleSelect
        dataTestId={
          filterKey === ClusterQueueWorkloadsToolbarFilterOptions.hardwareProfile
            ? 'cluster-queue-workloads-hardware-profile-filter'
            : `cluster-queue-workloads-${filterKey}-filter`
        }
        value={selectedValue}
        placeholder={placeholder}
        aria-label={placeholder}
        options={options}
        isScrollable
        maxMenuHeight="300px"
        onChange={(selectedOptionValue) => {
          const option = options.find((item) => item.key === selectedOptionValue);
          onFilterUpdate(
            filterKey,
            option?.label && selectedOptionValue
              ? { label: option.label, value: selectedOptionValue }
              : '',
          );
        }}
        popperProps={{ appendTo: () => document.body, maxWidth: undefined }}
      />
    );
  };

  return (
    <ToolbarToggleGroup breakpoint="md" toggleIcon={<FilterIcon />}>
      <ToolbarGroup variant="filter-group" data-testid="cluster-queue-workloads-table-toolbar">
        <ToolbarItem>
          <SearchInput
            aria-label="Filter by name"
            placeholder="Filter by name"
            data-testid="cluster-queue-workloads-name-filter"
            value={filterData.name ?? ''}
            onChange={(_event, value) => onFilterUpdate('name', value)}
            onClear={() => onFilterUpdate('name', '')}
          />
        </ToolbarItem>
        <ToolbarItem>
          <Dropdown
            onOpenChange={setIsFilterTypeOpen}
            shouldFocusToggleOnSelect
            toggle={(toggleRef) => (
              <MenuToggle
                data-testid="cluster-queue-workloads-table-toolbar-dropdown"
                ref={toggleRef}
                aria-label="Filter attribute"
                onClick={() => setIsFilterTypeOpen((open) => !open)}
                isExpanded={isFilterTypeOpen}
                icon={<FilterIcon />}
              >
                {clusterQueueWorkloadsFilterOptions[currentFilterType]}
              </MenuToggle>
            )}
            isOpen={isFilterTypeOpen}
            popperProps={{ appendTo: 'inline' }}
          >
            <DropdownList>
              {attributeFilterKeys.map((filterKey) => (
                <DropdownItem
                  key={filterKey}
                  id={filterKey}
                  data-testid={`cluster-queue-workloads-table-toolbar-option-${filterKey}`}
                  onClick={() => {
                    setIsFilterTypeOpen(false);
                    setCurrentFilterType(filterKey);
                  }}
                >
                  {clusterQueueWorkloadsFilterOptions[filterKey]}
                </DropdownItem>
              ))}
            </DropdownList>
          </Dropdown>
        </ToolbarItem>
        {attributeFilterKeys.map((filterKey) => {
          const filterValue = filterData[filterKey];
          const filterLabel = typeof filterValue === 'string' ? filterValue : filterValue?.label;
          const filterSelectValue = getFilterSelectValue(filterValue);

          return (
            <ToolbarFilter
              key={filterKey}
              categoryName={clusterQueueWorkloadsFilterOptions[filterKey]}
              data-testid="cluster-queue-workloads-table-toolbar-text-field"
              labels={
                filterSelectValue && filterLabel
                  ? [
                      {
                        key: filterKey,
                        node: <span data-testid={`${filterKey}-filter-chip`}>{filterLabel}</span>,
                      },
                    ]
                  : []
              }
              deleteLabel={() => onFilterUpdate(filterKey, '')}
              showToolbarItem={currentFilterType === filterKey}
            >
              {renderAttributeFilter(filterKey)}
            </ToolbarFilter>
          );
        })}
      </ToolbarGroup>
    </ToolbarToggleGroup>
  );
};

export { buildWorkloadFilterOptions };

export default ClusterQueueWorkloadsToolbar;
