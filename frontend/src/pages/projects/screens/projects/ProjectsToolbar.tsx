import * as React from 'react';
import {
  SearchInput,
  ToolbarGroup,
  ToolbarItem,
  Dropdown,
  MenuToggle,
  DropdownList,
  DropdownItem,
  Badge,
  Label,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { FilterIcon, CheckIcon, StarIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import FilterToolbar from '#~/components/FilterToolbar';
import {
  aiProjectFilterKey,
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
  const [isProjectTypeDropdownOpen, setIsProjectTypeDropdownOpen] = React.useState(false);

  const currentProjectType = filterData[ProjectsFilterOptions.projectType] || 'All';
  const isAISelected = currentProjectType === aiProjectFilterKey;
  const currentCount = isAISelected ? aiProjectNum : fullProjectNum;
  const currentLabel = isAISelected ? 'A.I. projects' : 'All projects';

  const projectTypeOptions = [
    {
      key: 'All',
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
    <FilterToolbar<keyof typeof projectsFilterOptions>
      data-testid="projects-table-toolbar"
      filterOptions={projectsFilterOptions}
      filterOptionRenders={{
        [ProjectsFilterOptions.projectType]: () => (
          <Dropdown
            isOpen={isProjectTypeDropdownOpen}
            onOpenChange={setIsProjectTypeDropdownOpen}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setIsProjectTypeDropdownOpen(!isProjectTypeDropdownOpen)}
                isExpanded={isProjectTypeDropdownOpen}
                style={{ minWidth: '300px' }}
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
                      <Label color="blue" icon={<StarIcon />}>
                        AI
                      </Label>
                    </FlexItem>
                  )}
                </Flex>
              </MenuToggle>
            )}
            popperProps={{ appendTo: 'inline' }}
          >
            <DropdownList>
              {projectTypeOptions.map((option) => (
                <DropdownItem
                  key={option.key}
                  onClick={() => {
                    onFilterUpdate(ProjectsFilterOptions.projectType, option.key);
                    setIsProjectTypeDropdownOpen(false);
                  }}
                >
                  <Flex
                    direction={{ default: 'column' }}
                    spaceItems={{ default: 'spaceItemsNone' }}
                    style={{ width: '100%' }}
                  >
                    <FlexItem>
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
                            <Label color="blue" icon={<StarIcon />}>
                              AI
                            </Label>
                          </FlexItem>
                        )}
                        <FlexItem spacer={{ default: 'spacerNone' }} style={{ marginLeft: 'auto' }}>
                          {currentProjectType === option.key && (
                            <CheckIcon color="var(--pf-v5-global--primary-color--100)" />
                          )}
                        </FlexItem>
                      </Flex>
                    </FlexItem>
                    <FlexItem
                      style={{
                        color: 'var(--pf-v5-global--Color--200)',
                        fontSize: 'var(--pf-v5-global--FontSize--sm)',
                      }}
                    >
                      {option.description}
                    </FlexItem>
                  </Flex>
                </DropdownItem>
              ))}
            </DropdownList>
          </Dropdown>
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
