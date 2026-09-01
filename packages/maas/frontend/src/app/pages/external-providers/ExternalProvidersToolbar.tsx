import * as React from 'react';
import { Button, SearchInput, ToolbarItem, ToolbarGroup } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import { Link } from 'react-router-dom';
import {
  ExternalProvidersFilterDataType,
  externalProvidersFilterOptions,
  ExternalProvidersFilterOptions,
  externalProvidersManagementPath,
} from '~/app/pages/external-providers/const';

type ExternalProvidersToolBarProps = {
  namespace: string;
  filterData: ExternalProvidersFilterDataType;
  onFilterUpdate: (
    key: ExternalProvidersFilterOptions,
    value?: string | { label: string; value: string },
  ) => void;
};

const ExternalProvidersToolBar: React.FC<ExternalProvidersToolBarProps> = ({
  namespace,
  filterData,
  onFilterUpdate,
}) => (
  <FilterToolbar<ExternalProvidersFilterOptions>
    data-testid="external-providers-table-toolbar"
    filterOptions={externalProvidersFilterOptions}
    filterOptionRenders={{
      [ExternalProvidersFilterOptions.name]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          style={{ minWidth: '350px' }}
          aria-label="Filter by name"
          placeholder="Filter by name"
          onChange={(_event, value) => onChange(value)}
          data-testid="external-providers-filter-input"
        />
      ),
      [ExternalProvidersFilterOptions.providerType]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          style={{ minWidth: '350px' }}
          aria-label="Filter by provider type"
          placeholder="Filter by provider type"
          onChange={(_event, value) => onChange(value)}
          data-testid="external-providers-filter-input"
        />
      ),
      [ExternalProvidersFilterOptions.authentication]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          style={{ minWidth: '350px' }}
          aria-label="Filter by authentication"
          placeholder="Filter by authentication"
          onChange={(_event, value) => onChange(value)}
          data-testid="external-providers-filter-input"
        />
      ),
      [ExternalProvidersFilterOptions.status]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          style={{ minWidth: '350px' }}
          aria-label="Filter by status"
          placeholder="Filter by status"
          onChange={(_event, value) => onChange(value)}
          data-testid="external-providers-filter-input"
        />
      ),
    }}
    filterData={filterData}
    onFilterUpdate={onFilterUpdate}
  >
    <ToolbarGroup>
      <ToolbarItem>
        <Button
          data-testid="add-external-provider-button"
          variant="primary"
          component={(props) => <Link {...props} to={externalProvidersManagementPath(namespace)} />}
        >
          Add external provider
        </Button>
      </ToolbarItem>
    </ToolbarGroup>
  </FilterToolbar>
);

export default ExternalProvidersToolBar;
