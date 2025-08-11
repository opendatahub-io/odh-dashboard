import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import {
  ModelServingFilterDataType,
  modelServingFilterOptions,
  ModelServingToolbarFilterOptions,
} from '@odh-dashboard/internal/pages/modelServing/screens/global/const';
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useParams } from 'react-router';
import { DeployButton } from '../deploy/DeployButton';

type GlobalModelsToolbarProps = {
  filterData: ModelServingFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
};

const GlobalModelsToolbar: React.FC<GlobalModelsToolbarProps> = ({
  filterData,
  onFilterUpdate,
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
      <ToolbarGroup>
        <ToolbarItem>
          <DeployButton project={currentProject ?? null} />
        </ToolbarItem>
      </ToolbarGroup>
    </FilterToolbar>
  );
};

export default GlobalModelsToolbar;
