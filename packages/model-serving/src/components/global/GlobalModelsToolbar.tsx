import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import {
  ModelServingFilterDataType,
  modelServingFilterOptions,
  ModelServingToolbarFilterOptions,
} from '@odh-dashboard/internal/pages/modelServing/screens/global/const';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { byName } from '@odh-dashboard/k8s-core';
import { useParams } from 'react-router';
import { DeployButton } from '../deploy/DeployButton';

type GlobalModelsToolbarProps = {
  filterData: ModelServingFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
  hideDeployButton?: boolean;
};

const GlobalModelsToolbar: React.FC<GlobalModelsToolbarProps> = ({
  filterData,
  onFilterUpdate,
  hideDeployButton = false,
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
            <DeployButton project={currentProject ?? null} />
          </ToolbarItem>
        </ToolbarGroup>
      )}
    </FilterToolbar>
  );
};

export default GlobalModelsToolbar;
