import * as React from 'react';
import {
  Bullseye,
  Divider,
  Flex,
  FlexItem,
  MenuGroup,
  MenuItem,
  Truncate,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import SearchSelector from '../searchSelector/SearchSelector';
import { ProjectsContext } from '../../context/ProjectsContext';
import ProjectNavigatorLink from './ProjectNavigatorLink';
import { ProjectIconWithSize } from './ProjectIconWithSize';
import { IconSize, Namespace } from '../../types';

type ProjectSelectorProps = {
  onSelection: (projectName: string) => void;
  namespace: string;
  getSelectionHref?: (projectName: string) => string | undefined;
  invalidDropdownPlaceholder?: string;
  selectAllProjects?: boolean;
  clearLabel?: string;
  primary?: boolean;
  showTitle?: boolean;
  selectorLabel?: string;
  isFullWidth?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  namespacesOverride?: Namespace[];
  appendTo?: 'inline' | (() => HTMLElement) | HTMLElement;
  pinnedNamespace?: { name: string; label: string };
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
  pinnedNamespace,
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

  const pinnedItem = pinnedNamespace
    ? visibleNamespaces.find((n) => n.name === pinnedNamespace.name)
    : undefined;
  const otherItems = pinnedNamespace
    ? visibleNamespaces.filter((n) => n.name !== pinnedNamespace.name)
    : visibleNamespaces;

  const renderItem = (n: Namespace) => {
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
  };

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
      appendTo={appendTo}
      toggleContent={toggleLabel}
      toggleVariant={primary ? 'primary' : undefined}
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
        {!pinnedItem && otherItems.length === 0 ? (
          <MenuItem isDisabled>No matching results</MenuItem>
        ) : (
          <>
            {pinnedItem && pinnedNamespace && (
              <>
                <MenuGroup data-testid="pinned-project-group" label={pinnedNamespace.label}>
                  {renderItem(pinnedItem)}
                </MenuGroup>
                {otherItems.length > 0 && <Divider component="li" />}
              </>
            )}
            {otherItems.length > 0 &&
              (pinnedItem ? (
                <MenuGroup data-testid="other-projects-group" label="Projects">
                  {otherItems.map(renderItem)}
                </MenuGroup>
              ) : (
                otherItems.map(renderItem)
              ))}
          </>
        )}
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
