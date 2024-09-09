import * as React from 'react';
import {
  Button,
  Icon,
  Popover,
  SearchInput,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import PopoverListContent from '~/components/PopoverListContent';
import FilterToolbar from '~/components/FilterToolbar';
import {
  FindAdministratorOptions,
  ProjectsFilterDataType,
  projectsFilterOptions,
  ProjectsFilterOptions,
} from '~/pages/projects/screens/projects/const';
import NewProjectButton from './NewProjectButton';

type ProjectsToolbarProps = {
  allowCreate: boolean;
  filterData: ProjectsFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
  onClearFilters: () => void;
};

const ProjectsToolbar: React.FC<ProjectsToolbarProps> = ({
  allowCreate,
  filterData,
  onFilterUpdate,
  onClearFilters,
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
      onClearFilters={onClearFilters}
      onFilterUpdate={onFilterUpdate}
    >
      <ToolbarGroup>
        <ToolbarItem>
          {allowCreate ? (
            <NewProjectButton
              onProjectCreated={(projectName) => navigate(`/projects/${projectName}`)}
            />
          ) : (
            <Popover
              minWidth="400px"
              headerContent="Need another project?"
              bodyContent={
                <PopoverListContent
                  data-testid="projects-admin-help-content"
                  leadText="To request a new project, contact your administrator."
                  listHeading="Your administrator might be:"
                  listItems={FindAdministratorOptions}
                />
              }
            >
              <Button data-testid="projects-empty-admin-help" variant="link">
                <Icon isInline aria-label="More info">
                  <OutlinedQuestionCircleIcon />
                </Icon>
                <span className="pf-v5-u-ml-xs">Need another project?</span>
              </Button>
            </Popover>
          )}
        </ToolbarItem>
      </ToolbarGroup>
    </FilterToolbar>
  );
};

export default ProjectsToolbar;
