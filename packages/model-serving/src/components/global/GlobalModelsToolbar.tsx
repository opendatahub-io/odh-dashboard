import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem, Pagination } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import {
  ModelServingFilterDataType,
  modelServingFilterOptions,
  ModelServingToolbarFilterOptions,
} from '@odh-dashboard/internal/pages/modelServing/screens/global/const';
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useParams } from 'react-router';
import { DeployButton } from '../deploy/DeployButton';
import { getDeploymentWizardRoute } from '../deploymentWizard/utils';

type GlobalModelsToolbarProps = {
  filterData: ModelServingFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
  hideDeployButton?: boolean;
  showPagination?: boolean;
  paginationProps?: {
    itemCount: number;
    perPage: number;
    page: number;
    onSetPage: (
      event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
      newPage: number,
    ) => void;
    onPerPageSelect: (
      event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
      newPerPage: number,
    ) => void;
  };
};

const GlobalModelsToolbar: React.FC<GlobalModelsToolbarProps> = ({
  filterData,
  onFilterUpdate,
  hideDeployButton = false,
  showPagination = false,
  paginationProps,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const { namespace: modelNamespace } = useParams<{ namespace: string }>();
  const currentProject = projects.find(byName(modelNamespace));

  return (
    <FilterToolbar<keyof typeof modelServingFilterOptions>
      data-testid="model-serving-table-toolbar"
      filterOptions={modelServingFilterOptions}
      filterOptionRenders={{
        [ModelServingToolbarFilterOptions.name]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            aria-label="Filter by name"
            placeholder="Filter by name"
            onChange={(_event, value) => onChange(value)}
          />
        ),
        [ModelServingToolbarFilterOptions.project]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            aria-label="Filter by project"
            placeholder="Filter by project"
            onChange={(_event, value) => onChange(value)}
          />
        ),
      }}
      filterData={filterData}
      onFilterUpdate={onFilterUpdate}
    >
      {!hideDeployButton && (
        <ToolbarGroup>
          <ToolbarItem>
            <DeployButton
              project={currentProject ?? null}
              createRoute={
                currentProject?.metadata.name
                  ? getDeploymentWizardRoute(`/modelServing/${currentProject.metadata.name}`)
                  : undefined
              }
            />
          </ToolbarItem>
        </ToolbarGroup>
      )}
      {showPagination && paginationProps && (
        <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
          <Pagination
            itemCount={paginationProps.itemCount}
            perPage={paginationProps.perPage}
            page={paginationProps.page}
            onSetPage={paginationProps.onSetPage}
            onPerPageSelect={paginationProps.onPerPageSelect}
            variant="top"
            isCompact
          />
        </ToolbarItem>
      )}
    </FilterToolbar>
  );
};

export default GlobalModelsToolbar;
