import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import FilterToolbar from '#~/components/FilterToolbar';
import {
  aiProjectFilterKey,
  ProjectsFilterDataType,
  projectsFilterOptions,
  ProjectsFilterOptions,
} from '#~/pages/projects/screens/projects/const';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import NewProjectButton from './NewProjectButton';

type ProjectsToolbarProps = {
  allowCreate: boolean;
  filterData: ProjectsFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
  aiProjectNum: number;
  fullProjectNum: number;
};

const ProjectsToolbar: React.FC<ProjectsToolbarProps> = ({
  allowCreate,
  filterData,
  onFilterUpdate,
  aiProjectNum,
  fullProjectNum,
}) => {
  const navigate = useNavigate();

  // TODO: Define actual project type options
  const projectTypeOptions: SimpleSelectOption[] = [
    { key: 'All', label: `All - ${fullProjectNum}` },
    { key: aiProjectFilterKey, label: `AI Projects - ${aiProjectNum}` },
  ];

  console.log('77b aiProjectNum', aiProjectNum);
  console.log('77a fullProjectNum', fullProjectNum);
  return (
    <FilterToolbar<keyof typeof projectsFilterOptions>
      data-testid="projects-table-toolbar"
      filterOptions={projectsFilterOptions}
      filterOptionRenders={{
        [ProjectsFilterOptions.projectType]: ({ value, onChange, ...props }) => (
          <SimpleSelect
            {...props}
            value={value ?? ''}
            aria-label="Filter by project type"
            placeholder="Filter by project type"
            options={projectTypeOptions}
            onChange={(v) => onChange(v)}
            popperProps={{ maxWidth: undefined }}
          />
        ),
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
