import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import ImportBYONImageButton from './ImportBYONImageButton';
import {
  BYONImagesToolbarFilterOptions,
  BYONImagesFilterDataType,
  byonImagesFilterOptions,
  imageTypeFilterOptions,
  imageEnabledFilterOptions,
} from './const';

type BYONImagesToolbarProps = {
  filterData: BYONImagesFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
};

const BYONImagesToolbar: React.FC<BYONImagesToolbarProps> = ({ filterData, onFilterUpdate }) => (
  <FilterToolbar<keyof typeof byonImagesFilterOptions>
    data-testid="byonImages-table-toolbar"
    filterOptions={byonImagesFilterOptions}
    filterOptionRenders={{
      [BYONImagesToolbarFilterOptions.name]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by name"
          placeholder="Filter by name"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [BYONImagesToolbarFilterOptions.provider]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          aria-label="Filter by provider"
          placeholder="Filter by provider"
          onChange={(_event, value) => onChange(value)}
        />
      ),
      [BYONImagesToolbarFilterOptions.type]: ({ value, onChange, ...props }) => (
        <SimpleSelect
          {...props}
          popperProps={{ maxWidth: undefined }}
          value={value ?? ''}
          options={imageTypeFilterOptions}
          onChange={(v) => onChange(v)}
          data-testid="image-type-filter-select"
          ariaLabel="Filter by type"
        />
      ),
      [BYONImagesToolbarFilterOptions.enabled]: ({ value, onChange, ...props }) => (
        <SimpleSelect
          {...props}
          popperProps={{ maxWidth: undefined }}
          value={value ?? ''}
          options={imageEnabledFilterOptions}
          onChange={(v) => onChange(v)}
          data-testid="image-enabled-filter-select"
          ariaLabel="Filter by enabled status"
        />
      ),
    }}
    filterData={filterData}
    onFilterUpdate={onFilterUpdate}
  >
    <ToolbarGroup>
      <ToolbarItem>
        <ImportBYONImageButton />
      </ToolbarItem>
    </ToolbarGroup>
  </FilterToolbar>
);

export default BYONImagesToolbar;
