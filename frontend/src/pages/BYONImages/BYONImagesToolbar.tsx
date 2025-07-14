import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '#~/components/FilterToolbar';
import ImportBYONImageButton from './ImportBYONImageButton';
import {
  BYONImagesToolbarFilterOptions,
  BYONImagesFilterDataType,
  byonImagesFilterOptions,
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
