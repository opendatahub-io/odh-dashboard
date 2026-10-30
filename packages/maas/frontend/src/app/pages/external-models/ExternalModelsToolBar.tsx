import * as React from 'react';
import { Button, SearchInput, ToolbarItem, ToolbarGroup } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import { Link } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { externalProvidersManagementPath } from '~/app/pages/external-providers/const';
import {
  AddProviderReferenceSource,
  ExternalProvidersAddClickedProperties,
  ExternalProvidersAddSource,
  MaaSEvents,
  ExternalModelsManageProvidersSource,
  ExternalModelsManageProvidersClickedProperties,
} from '~/app/types/event-tracking';
import {
  ExternalModelsFilterDataType,
  externalModelsFilterOptions,
  ExternalModelsFilterOptions,
  createExternalModelPath,
  CreateExternalModelLocationState,
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
          data-testid="add-external-model-button"
          variant="primary"
          component={(props) => (
            <Link
              {...props}
              to={createExternalModelPath(namespace)}
              state={
                {
                  addProviderReferenceSource: AddProviderReferenceSource.TOOLBAR,
                } satisfies CreateExternalModelLocationState
              }
            />
          )}
          onClick={() =>
            fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODELS_ADD_CLICKED, {
              source: ExternalProvidersAddSource.TOOLBAR,
            } satisfies ExternalProvidersAddClickedProperties)
          }
        >
          Add external model
        </Button>
      </ToolbarItem>
      <ToolbarItem>
        <Button
          data-testid="manage-external-providers-button"
          variant="secondary"
          component={(props) => <Link {...props} to={externalProvidersManagementPath(namespace)} />}
          onClick={() =>
            fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODELS_MANAGE_PROVIDERS_CLICKED, {
              source: ExternalModelsManageProvidersSource.TOOLBAR,
            } satisfies ExternalModelsManageProvidersClickedProperties)
          }
        >
          View providers
        </Button>
      </ToolbarItem>
    </ToolbarGroup>
  </FilterToolbar>
);

export default ExternalModelsToolBar;
