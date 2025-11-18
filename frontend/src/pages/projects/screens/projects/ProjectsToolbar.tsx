import * as React from 'react';
import {
  SearchInput,
  ToolbarGroup,
  ToolbarItem,
  // eslint-disable-next-line no-restricted-imports
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
  Badge,
  Label,
  Flex,
  FlexItem,
  Divider,
} from '@patternfly/react-core';
import { FilterIcon, OutlinedStarIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import {
  aiProjectFilterKey,
  allProjectFilterKey,
  ProjectsFilterDataType,
  projectsFilterOptions,
  ProjectsFilterOptions,
} from '#~/pages/projects/screens/projects/const';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';
import FilterToolbar from '#~/components/FilterToolbar.tsx';
import NewProjectButton from './NewProjectButton';

type ProjectsToolbarProps = {
  allowCreate: boolean;
  filterData: ProjectsFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
  aiProjectNum: number;
  fullProjectNum: number;
  projectFilter: string;
  setProjectFilter: (projectFilter: string) => void;
};

export const AiLabel: React.FC = () => (
  <Label icon={<OutlinedStarIcon />} variant="outline" data-testid="ai-project-label" isCompact>
    AI
  </Label>
);

const ProjectsToolbar: React.FC<ProjectsToolbarProps> = ({
  allowCreate,
  filterData,
  onFilterUpdate,
  aiProjectNum,
  fullProjectNum,
  projectFilter: currentProjectType,
  setProjectFilter,
}) => {
  const navigate = useNavigate();
  const [isProjectTypeDropdownOpen, setIsProjectTypeDropdownOpen] = React.useState(false);
  const isAISelected = currentProjectType === aiProjectFilterKey;
  const currentCount = isAISelected ? aiProjectNum : fullProjectNum;
  const currentLabel = isAISelected ? 'A.I. projects' : 'All projects';

  const projectTypeOptions = [
    {
      key: allProjectFilterKey,
      label: 'All projects',
      description: 'All projects that you have access to',
      count: fullProjectNum,
      isAI: false,
    },
    {
      key: aiProjectFilterKey,
      label: aiProjectFilterKey,
      description: 'Projects configured for AI resources',
      count: aiProjectNum,
      isAI: true,
    },
  ];

  return (
    <>
      <Select
        data-testid="project-type-dropdown"
        isOpen={isProjectTypeDropdownOpen}
        selected={currentProjectType}
        onSelect={(_event, value) => {
          setProjectFilter(String(value));
          setIsProjectTypeDropdownOpen(false);
        }}
        onOpenChange={setIsProjectTypeDropdownOpen}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setIsProjectTypeDropdownOpen(!isProjectTypeDropdownOpen)}
            isExpanded={isProjectTypeDropdownOpen}
            data-testid="project-type-dropdown-toggle"
          >
            <Flex
              spaceItems={{ default: 'spaceItemsSm' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem>
                <FilterIcon />
              </FlexItem>
              <FlexItem>{currentLabel}</FlexItem>
              <FlexItem>
                <Badge isRead>{currentCount}</Badge>
              </FlexItem>
              {isAISelected && (
                <FlexItem>
                  <AiLabel />
                </FlexItem>
              )}
            </Flex>
          </MenuToggle>
        )}
        popperProps={{ appendTo: 'inline' }}
      >
        <SelectList>
          {projectTypeOptions.map((option) => (
            <SelectOption key={option.key} value={option.key} description={option.description}>
              <Flex
                spaceItems={{ default: 'spaceItemsSm' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem style={{ fontWeight: 'bold' }}>{option.label}</FlexItem>
                <FlexItem>
                  <Badge isRead>{option.count}</Badge>
                </FlexItem>
                {option.isAI && (
                  <FlexItem>
                    <AiLabel />
                  </FlexItem>
                )}
              </Flex>
            </SelectOption>
          ))}
        </SelectList>
      </Select>
      <Divider orientation={{ default: 'vertical' }} />
      <FilterToolbar
        data-testid="projects-table-toolbar"
        filterOptions={projectsFilterOptions}
        filterOptionRenders={{
          [ProjectsFilterOptions.name]: ({ onChange, ...props }) => (
            <SearchInput
              {...props}
              data-testid="project-list-name-filter"
              aria-label="Filter by name"
              placeholder="Filter by name"
              onChange={(_event, value) => onChange(value)}
            />
          ),
          [ProjectsFilterOptions.user]: ({ onChange, ...props }) => (
            <SearchInput
              {...props}
              data-testid="project-list-user-filter"
              aria-label="Filter by provider"
              placeholder="Filter by provider"
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
    </>
  );
};

export default ProjectsToolbar;
