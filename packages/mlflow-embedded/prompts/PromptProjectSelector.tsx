import * as React from 'react';
import { Divider, MenuGroup, MenuItem, Truncate } from '@patternfly/react-core';
import { Link, useSearchParams } from 'react-router-dom';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import SearchSelector from '@odh-dashboard/internal/components/searchSelector/SearchSelector';
import {
  mlflowPromptManagementBaseRoute,
  WORKSPACE_QUERY_PARAM,
} from '@odh-dashboard/internal/routes/pipelines/mlflow';

type PromptProjectSelectorProps = {
  globalNamespace: string | undefined;
};

const PromptProjectSelector: React.FC<PromptProjectSelectorProps> = ({ globalNamespace }) => {
  const { projects, updatePreferredProject } = React.useContext(ProjectsContext);
  const [searchParams] = useSearchParams();
  const namespace = searchParams.get(WORKSPACE_QUERY_PARAM) ?? '';
  const [searchText, setSearchText] = React.useState('');

  const namespaces = React.useMemo(
    () =>
      projects.map((project) => ({
        name: project.metadata.name,
        displayName: getDisplayNameFromK8sResource(project),
      })),
    [projects],
  );

  const selection = namespaces.find((n) => n.name === namespace);

  const globalProject = globalNamespace
    ? namespaces.find((n) => n.name === globalNamespace)
    : undefined;

  const otherProjects = React.useMemo(
    () =>
      namespaces.filter(
        (n) =>
          n.name !== globalNamespace &&
          (!searchText ||
            n.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
            n.name.toLowerCase().includes(searchText.toLowerCase())),
      ),
    [namespaces, globalNamespace, searchText],
  );

  const globalMatchesSearch =
    globalProject &&
    (!searchText ||
      globalProject.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
      globalProject.name.toLowerCase().includes(searchText.toLowerCase()));

  const toggleLabel = selection ? selection.displayName : 'Select a project';

  const handleSelection = (projectName: string) => {
    const match = projectName ? projects.find(byName(projectName)) ?? null : null;
    updatePreferredProject(match);
  };

  const renderItem = (n: { name: string; displayName: string }) => {
    const href = mlflowPromptManagementBaseRoute(n.name);
    return (
      <MenuItem
        key={n.name}
        isSelected={n.name === namespace}
        component={(props: React.ComponentProps<'a'>) => <Link {...props} to={href} />}
        onClick={() => handleSelection(n.name)}
      >
        <Truncate content={n.displayName}>{n.displayName}</Truncate>
      </MenuItem>
    );
  };

  return (
    <SearchSelector
      dataTestId="prompt-project-selector"
      minWidth="250px"
      onSearchChange={(value) => setSearchText(value)}
      onSearchClear={() => setSearchText('')}
      searchFocusOnOpen
      searchPlaceholder="Project name"
      searchValue={searchText}
      toggleContent={toggleLabel}
      appendTo={() => document.body}
    >
      <>
        {globalMatchesSearch && (
          <>
            <MenuGroup label="Global project" data-testid="global-project-group">
              {renderItem(globalProject)}
            </MenuGroup>
            {otherProjects.length > 0 && <Divider component="li" />}
          </>
        )}
        {otherProjects.length > 0 && (
          <MenuGroup label="Projects" data-testid="projects-group">
            {otherProjects.map(renderItem)}
          </MenuGroup>
        )}
        {!globalMatchesSearch && otherProjects.length === 0 && (
          <MenuItem isDisabled>No matching results</MenuItem>
        )}
      </>
    </SearchSelector>
  );
};

export default PromptProjectSelector;
