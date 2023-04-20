import * as React from 'react';
import {
  DatePicker,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  TextInput,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarChip,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import ImportPipelineButton from '~/concepts/pipelines/content/import/ImportPipelineButton';

export enum FilterType {
  PIPELINE_NAME = 'Pipeline name',
  CREATED_ON = 'Created on',
}
export type FilterData = Record<FilterType, string>;

type GlobalPipelinesTableToolbarProps = {
  filterData: FilterData;
  onFilterUpdate: (filterType: FilterType, value: string) => void;
  onClearFilters: () => void;
};

const GlobalPipelinesTableToolbar: React.FC<GlobalPipelinesTableToolbarProps> = ({
  filterData,
  onFilterUpdate,
  onClearFilters,
}) => {
  const [open, setOpen] = React.useState(false);
  const [currentFilterType, setCurrentFilterType] = React.useState<FilterType>(
    FilterType.PIPELINE_NAME,
  );

  const chips: React.ComponentProps<typeof ToolbarFilter>['chips'] = [];
  if (filterData[FilterType.PIPELINE_NAME]) {
    chips.push({
      key: FilterType.PIPELINE_NAME,
      node: (
        <>
          <b>Name:</b> {filterData[FilterType.PIPELINE_NAME]}
        </>
      ),
    });
  }
  if (filterData[FilterType.CREATED_ON]) {
    chips.push({
      key: FilterType.CREATED_ON,
      node: (
        <>
          <b>Created:</b> {filterData[FilterType.CREATED_ON]}
        </>
      ),
    });
  }

  return (
    <>
      <ToolbarGroup variant="filter-group">
        <ToolbarItem>
          <Dropdown
            toggle={
              <DropdownToggle id="toggle-basic" onToggle={() => setOpen(!open)}>
                <FilterIcon /> {currentFilterType}
              </DropdownToggle>
            }
            isOpen={open}
            dropdownItems={Object.keys(FilterType).map((filterKey) => (
              <DropdownItem
                key={filterKey}
                onClick={() => {
                  setOpen(false);
                  setCurrentFilterType(FilterType[filterKey]);
                }}
              >
                {FilterType[filterKey]}
              </DropdownItem>
            ))}
          />
        </ToolbarItem>
        <ToolbarFilter
          categoryName="Filters"
          variant="search-filter"
          chips={chips}
          deleteChip={(category, chip) =>
            onFilterUpdate((chip as ToolbarChip).key as FilterType, '')
          }
          deleteChipGroup={() => onClearFilters()}
        >
          {currentFilterType === FilterType.PIPELINE_NAME && (
            <TextInput
              aria-label="Search for a pipeline name"
              value={filterData[FilterType.PIPELINE_NAME]}
              onChange={(value) => onFilterUpdate(FilterType.PIPELINE_NAME, value)}
              placeholder="Pipeline name"
            />
          )}
          {currentFilterType === FilterType.CREATED_ON && (
            <DatePicker
              aria-label="Select a creation date"
              value={filterData[FilterType.CREATED_ON]}
              onChange={(event, value) => onFilterUpdate(FilterType.CREATED_ON, value)}
            />
          )}
        </ToolbarFilter>
      </ToolbarGroup>
      <ToolbarItem>
        <ImportPipelineButton />
      </ToolbarItem>
    </>
  );
};

export default GlobalPipelinesTableToolbar;
