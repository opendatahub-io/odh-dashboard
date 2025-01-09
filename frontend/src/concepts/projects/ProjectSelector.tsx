import * as React from 'react';
import {
  Bullseye,
  Divider,
  Flex,
  FlexItem,
  MenuGroup,
  MenuItem,
  MenuList,
  Truncate,
} from '@patternfly/react-core';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import SearchSelector from '~/components/searchSelector/SearchSelector';
import { ProjectKind } from '~/k8sTypes';
import { ProjectIcon } from '~/images/icons';
import ProjectLink from '~/concepts/projects/ProjectLink';
import { AppContext } from '~/app/AppContext';

type ProjectSelectorProps = {
  onSelection: (projectName: string) => void;
  namespace: string;
  invalidDropdownPlaceholder?: string;
  selectAllProjects?: boolean;
  primary?: boolean;
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
  filterLabel,
  showTitle = false,
  selectorLabel = 'Project',
  isFullWidth = false,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const { favoriteProjects, setFavoriteProjects } = React.useContext(AppContext);
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

  const favorites = favoriteProjects.reduce<ProjectKind[]>((acc, name) => {
    const project = filteredProjects.find((p) => p.metadata.name === name);
    if (project) {
      acc.push(project);
    }
    return acc;
  }, []);
  const otherProjects = filteredProjects.filter((p) => !favoriteProjects.includes(p.metadata.name));

  const onFavorite = (itemId: string, actionId: string) => {
    if (actionId === 'fav') {
      const isFavorite = favoriteProjects.includes(itemId);
      if (isFavorite) {
        setFavoriteProjects(favoriteProjects.filter((fav) => fav !== itemId));
      } else {
        setFavoriteProjects([...favoriteProjects, itemId]);
      }
      return true;
    }
    return false;
  };

  const toggleLabel = projects.length === 0 ? 'No projects' : selectionDisplayName;
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
      toggleVariant={primary ? 'primary' : undefined}
      hasLists
      handleAction={onFavorite}
    >
      <>
        {favorites.length ? (
          <>
            <MenuGroup label="Favorites">
              <MenuList>
                {favorites.map((project) => (
                  <MenuItem
                    key={project.metadata.name}
                    itemId={project.metadata.name}
                    isFavorited
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
              </MenuList>
            </MenuGroup>
            <Divider />
          </>
        ) : null}
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
            <Divider />
          </>
        )}
        {visibleProjects.length === 0 && <MenuItem isDisabled>No matching results</MenuItem>}
        <MenuGroup label="Projects">
          <MenuList>
            {otherProjects.map((project) => (
              <MenuItem
                key={project.metadata.name}
                itemId={project.metadata.name}
                isFavorited={false}
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
          </MenuList>
        </MenuGroup>
      </>
    </SearchSelector>
  );

  if (showTitle) {
    return (
      <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
        <ProjectIcon
          alt=""
          style={{
            width: 'var(--pf-t--global--icon--size--font--2xl)',
            height: 'var(--pf-t--global--icon--size--font--2xl)',
          }}
        />
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Bullseye>{selectorLabel}</Bullseye>
          </FlexItem>
          <FlexItem>{selector}</FlexItem>
          <FlexItem>
            <ProjectLink namespace={namespace} />
          </FlexItem>
        </Flex>
      </Flex>
    );
  }
  return selector;
};

export default ProjectSelector;
