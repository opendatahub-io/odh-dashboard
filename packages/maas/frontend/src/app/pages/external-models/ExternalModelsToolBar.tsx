import * as React from 'react';
import { Button, SearchInput, ToolbarItem, ToolbarGroup } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import { Link } from 'react-router-dom';
import { externalProvidersManagementPath } from '~/app/pages/external-providers/const';
import {
  ExternalModelsFilterDataType,
  externalModelsFilterOptions,
  ExternalModelsFilterOptions,
} from './const';

type ExternalModelsToolBarProps = {
  namespace: string;
  filterData: ExternalModelsFilterDataType;
  onFilterUpdate: (
    key: ExternalModelsFilterOptions,
    value?: string | { label: string; value: string },
  ) => void;
};

const ExternalModelsToolBar: React.FC<ExternalModelsToolBarProps> = ({
  namespace,
  filterData,
  onFilterUpdate,
}) => (
  <FilterToolbar<ExternalModelsFilterOptions>
    data-testid="external-models-table-toolbar"
    filterOptions={externalModelsFilterOptions}
    filterOptionRenders={{
      [ExternalModelsFilterOptions.keyword]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          style={{ minWidth: '350px' }}
          aria-label="Filter by name, resource name, or description"
          placeholder="Filter by name, resource name, or description"
          onChange={(_event, value) => onChange(value)}
          data-testid="external-models-filter-input"
        />
      ),
    }}
    filterData={filterData}
    onFilterUpdate={onFilterUpdate}
  >
    <ToolbarGroup>
      <ToolbarItem>
        <Button
          data-testid="manage-external-providers-button"
          variant="secondary"
          component={(props) => <Link {...props} to={externalProvidersManagementPath(namespace)} />}
        >
          Manage external providers
        </Button>
      </ToolbarItem>
    </ToolbarGroup>
  </FilterToolbar>
);

export default ExternalModelsToolBar;
