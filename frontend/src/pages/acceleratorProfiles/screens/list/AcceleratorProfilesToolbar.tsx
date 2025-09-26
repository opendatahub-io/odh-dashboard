import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchInput, ToolbarGroup, ToolbarItem, Button } from '@patternfly/react-core';
import FilterToolbar from '#~/components/FilterToolbar';
import {
  acceleratorProfilesFilterOptions,
  AcceleratorProfilesToolbarFilterOptions,
  AcceleratorProfilesFilterDataType,
} from './const';

type AcceleratorProfilesToolbarProps = {
  filterData: AcceleratorProfilesFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
};

const AcceleratorProfilesToolbar: React.FC<AcceleratorProfilesToolbarProps> = ({
  filterData,
  onFilterUpdate,
}) => {
  const navigate = useNavigate();

  return (
    <FilterToolbar<keyof typeof acceleratorProfilesFilterOptions>
      data-testid="accelerator-profiles-table-toolbar"
      filterOptions={acceleratorProfilesFilterOptions}
      filterOptionRenders={{
        [AcceleratorProfilesToolbarFilterOptions.name]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            aria-label="Filter by name"
            placeholder="Filter by name"
            onChange={(_event, value) => onChange(value)}
          />
        ),
        [AcceleratorProfilesToolbarFilterOptions.identifier]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            aria-label="Filter by identifier"
            placeholder="Filter by identifier"
            onChange={(_event, value) => onChange(value)}
          />
        ),
      }}
      filterData={filterData}
      onFilterUpdate={onFilterUpdate}
    >
      <ToolbarGroup>
        <ToolbarItem>
          <Button
            data-testid="create-accelerator-profile"
            onClick={() => navigate(`/settings/environment-setup/accelerator-profiles/create`)}
          >
            Create accelerator profile
          </Button>
        </ToolbarItem>
      </ToolbarGroup>
    </FilterToolbar>
  );
};

export default AcceleratorProfilesToolbar;
