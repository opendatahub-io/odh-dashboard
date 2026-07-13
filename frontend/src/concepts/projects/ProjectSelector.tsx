import * as React from 'react';
import { Bullseye, Divider, Flex, FlexItem, MenuItem, Truncate } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import SearchSelector from '#~/components/searchSelector/SearchSelector';
import ProjectNavigatorLink from '#~/concepts/projects/ProjectNavigatorLink';
import { ProjectIconWithSize } from '#~/concepts/projects/ProjectIconWithSize';
import { IconSize, Namespace } from '#~/types';

type ProjectSelectorProps = {
  onSelection: (projectName: string) => void;
  namespace: string;
  getSelectionHref?: (projectName: string) => string | undefined;
  invalidDropdownPlaceholder?: string;
  selectAllProjects?: boolean;
  /** When set, shows a clear option at the top with this label (e.g. "None"). Selects empty string. */
  clearLabel?: string;
  primary?: boolean;
  showTitle?: boolean;
  selectorLabel?: string;
  isFullWidth?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  namespacesOverride?: Namespace[];
  appendTo?: 'inline' | (() => HTMLElement) | HTMLElement;
};

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  onSelection,
  namespace,
  getSelectionHref,
  invalidDropdownPlaceholder,
  selectAllProjects,
  clearLabel,
  primary,
  showTitle = false,
  selectorLabel = 'Project',
  isFullWidth = false,
  placeholder = undefined,
  isLoading = false,
  namespacesOverride,
  appendTo,
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
  const allProjectsHref = selectAllProjects ? getSelectionHref?.('') : undefined;

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
      {...(appendTo && { appendTo })}
    >
      <>
        {(selectAllProjects || clearLabel) && (
          <>
            <MenuItem
              key="all-projects"
              isSelected={namespace === ''}
              component={
                allProjectsHref
                  ? (props: React.ComponentProps<'a'>) => <Link {...props} to={allProjectsHref} />
                  : undefined
              }
              onClick={() => {
                setSearchText('');
                onSelection('');
              }}
            >
              {clearLabel ?? 'All projects'}
            </MenuItem>
            <Divider component="li" />
          </>
        )}
        {visibleNamespaces.length === 0 && <MenuItem isDisabled>No matching results</MenuItem>}
        {visibleNamespaces.map((n) => {
          const selectionHref = getSelectionHref?.(n.name);
          return (
            <MenuItem
              key={n.name}
              isSelected={n.name === selection?.name}
              component={
                selectionHref
                  ? (props: React.ComponentProps<'a'>) => <Link {...props} to={selectionHref} />
                  : undefined
              }
              onClick={() => {
                setSearchText('');
                onSelection(n.name);
              }}
            >
              <Truncate content={n.displayName ?? n.name}>{n.displayName ?? n.name}</Truncate>
            </MenuItem>
          );
        })}
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
