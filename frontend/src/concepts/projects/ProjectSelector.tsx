import * as React from 'react';
import { Divider, MenuItem, MenuToggle, Truncate } from '@patternfly/react-core';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import SearchSelector from '~/components/searchSelector/SearchSelector';
import { ProjectKind } from '~/k8sTypes';

type ProjectSelectorProps = {
  onSelection: (projectName: string) => void;
  namespace: string;
  invalidDropdownPlaceholder?: string;
  selectAllProjects?: boolean;
  primary?: boolean;
  variant?: React.ComponentProps<typeof MenuToggle>['variant'];
  filterLabel?: string;
  showTitle?: boolean;
  selectorLabel?: string;
  isFullWidth?: boolean;
};

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  onSelection,
  namespace,
  invalidDropdownPlaceholder,
  selectAllProjects,
  primary,
  variant = 'plainText',
  filterLabel,
  showTitle = false,
  selectorLabel = 'Project',
  isFullWidth = false,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const selection = projects.find(byName(namespace));
  const [searchText, setSearchText] = React.useState('');
  const bySearchText = React.useCallback(
    (project: ProjectKind) =>
      !searchText ||
      getDisplayNameFromK8sResource(project).toLowerCase().includes(searchText.toLowerCase()),
    [searchText],
  );

  const selectionDisplayName = selection
    ? getDisplayNameFromK8sResource(selection)
    : invalidDropdownPlaceholder ?? namespace;

  const filteredProjects = filterLabel
    ? projects.filter((project) => project.metadata.labels?.[filterLabel] !== undefined)
    : projects;
  const visibleProjects = filteredProjects.filter(bySearchText);

  const toggleLabel =
    projects.length === 0
      ? 'No projects'
      : `${showTitle ? `${selectorLabel}: ` : ''}${selectionDisplayName}`;
  const selector = (
    <SearchSelector
      dataTestId="project-selector"
      isFullWidth={isFullWidth}
      minWidth={!isFullWidth ? '250px' : undefined}
      onSearchChange={(value) => setSearchText(value)}
      onSearchClear={() => setSearchText('')}
      searchFocusOnOpen
      searchPlaceholder="Project name"
      searchValue={searchText}
      toggleText={toggleLabel}
      toggleVariant={primary ? 'primary' : variant}
    >
      <>
        {selectAllProjects && (
          <>
            <MenuItem
              key="all-projects"
              isSelected={namespace === ''}
              onClick={() => {
                onSelection('');
              }}
            >
              All projects
            </MenuItem>
            <Divider component="li" />
          </>
        )}
        {visibleProjects.length === 0 && <MenuItem isDisabled>No matching results</MenuItem>}
        {visibleProjects.map((project) => (
          <MenuItem
            key={project.metadata.name}
            isSelected={project.metadata.name === selection?.metadata.name}
            onClick={() => {
              setSearchText('');
              onSelection(project.metadata.name);
            }}
          >
            <Truncate content={getDisplayNameFromK8sResource(project)}>
              {getDisplayNameFromK8sResource(project)}
            </Truncate>
          </MenuItem>
        ))}
      </>
    </SearchSelector>
  );

  return selector;
};

export default ProjectSelector;
