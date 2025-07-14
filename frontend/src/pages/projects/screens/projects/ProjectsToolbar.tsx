import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import FilterToolbar from '#~/components/FilterToolbar';
import {
  ProjectsFilterDataType,
  projectsFilterOptions,
  ProjectsFilterOptions,
} from '#~/pages/projects/screens/projects/const';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';
import NewProjectButton from './NewProjectButton';

type ProjectsToolbarProps = {
  allowCreate: boolean;
  filterData: ProjectsFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
};

const ProjectsToolbar: React.FC<ProjectsToolbarProps> = ({
  allowCreate,
  filterData,
  onFilterUpdate,
}) => {
  const navigate = useNavigate();

  return (
    <FilterToolbar<keyof typeof projectsFilterOptions>
      data-testid="projects-table-toolbar"
      filterOptions={projectsFilterOptions}
      filterOptionRenders={{
        [ProjectsFilterOptions.name]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            aria-label="Filter by name"
            placeholder="Filter by name"
            onChange={(_event, value) => onChange(value)}
          />
        ),
        [ProjectsFilterOptions.user]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            aria-label="Filter by user"
            placeholder="Filter by user"
            onChange={(_event, value) => onChange(value)}
          />
        ),
      }}
      filterData={filterData}
      onFilterUpdate={onFilterUpdate}
    >
      <ToolbarGroup>
        <ToolbarItem>
          {allowCreate ? (
            <NewProjectButton
              onProjectCreated={(projectName) => navigate(`/projects/${projectName}`)}
            />
          ) : (
            <WhosMyAdministrator
              buttonLabel="Need another project?"
              headerContent="Need another project?"
              leadText="To request a new project, contact your administrator."
              contentTestId="projects-admin-help-content"
            />
          )}
        </ToolbarItem>
      </ToolbarGroup>
    </FilterToolbar>
  );
};

export default ProjectsToolbar;
