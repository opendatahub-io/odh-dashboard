import * as React from 'react';
import { Bullseye, Divider, Flex, FlexItem, MenuItem, Truncate } from '@patternfly/react-core';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import SearchSelector from '#~/components/searchSelector/SearchSelector';
import ProjectNavigatorLink from '#~/concepts/projects/ProjectNavigatorLink';
import { ProjectIconWithSize } from '#~/concepts/projects/ProjectIconWithSize';
import { IconSize, Namespace } from '#~/types';

type ProjectSelectorProps = {
  onSelection: (projectName: string) => void;
  namespace: string;
  invalidDropdownPlaceholder?: string;
  selectAllProjects?: boolean;
  primary?: boolean;
  showTitle?: boolean;
  selectorLabel?: string;
  isFullWidth?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  namespacesOverride?: Namespace[];
};

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  onSelection,
  namespace,
  invalidDropdownPlaceholder,
  selectAllProjects,
  primary,
  showTitle = false,
  selectorLabel = 'Project',
  isFullWidth = false,
  placeholder = undefined,
  isLoading = false,
  namespacesOverride,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const namespaces =
    namespacesOverride ??
    projects.map((project) => ({
      name: project.metadata.name,
      displayName: getDisplayNameFromK8sResource(project),
    }));
  const selection = namespaces.find((n) => n.name === namespace);
  const [searchText, setSearchText] = React.useState('');
  const bySearchText = React.useCallback(
    (n: Namespace) =>
      !searchText || n.displayName?.toLowerCase().includes(searchText.toLowerCase()),
    [searchText],
  );

  const selectionDisplayName = selection
    ? selection.displayName
    : invalidDropdownPlaceholder ?? placeholder ?? namespace;

  const visibleNamespaces = namespaces.filter(bySearchText);

  const toggleLabel = namespaces.length === 0 ? 'No projects' : selectionDisplayName;

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
      isLoading={isLoading}
      isDisabled={isLoading}
      toggleContent={toggleLabel}
      toggleVariant={primary ? 'primary' : undefined}
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
        {visibleNamespaces.length === 0 && <MenuItem isDisabled>No matching results</MenuItem>}
        {visibleNamespaces.map((n) => (
          <MenuItem
            key={n.name}
            isSelected={n.name === selection?.name}
            onClick={() => {
              setSearchText('');
              onSelection(n.name);
            }}
          >
            <Truncate content={n.displayName ?? n.name}>{n.displayName ?? n.name}</Truncate>
          </MenuItem>
        ))}
      </>
    </SearchSelector>
  );

  if (showTitle) {
    return (
      <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
        <ProjectIconWithSize size={IconSize.XXL} />
        <Flex
          spaceItems={{ default: 'spaceItemsSm' }}
          alignItems={{ default: 'alignItemsCenter' }}
          flex={{ default: 'flex_2' }}
        >
          <FlexItem>
            <Bullseye>{selectorLabel}</Bullseye>
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }}>
            {selector}
            <ProjectNavigatorLink namespace={selection} />
          </FlexItem>
        </Flex>
      </Flex>
    );
  }
  return selector;
};

export default ProjectSelector;
