import * as React from 'react';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { ProjectsContext } from '@odh-dashboard/ui-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { useNavigate } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';

type MaaSExternalResourcesProjectSelectorProps = {
  namespace: string;
  pathFunction: (namespace: string) => string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const MaaSExternalResourcesProjectSelector: React.FC<MaaSExternalResourcesProjectSelectorProps> = ({
  namespace,
  pathFunction,
  ...projectSelectorProps
}) => {
  const navigate = useNavigate();
  const {
    projects,
    updatePreferredProject,
    loaded: projectsLoaded,
    loadError: projectsLoadError,
  } = React.useContext(ProjectsContext);
  const {
    namespaces,
    updatePreferredNamespace,
    namespacesLoaded: modArchLoaded,
  } = useNamespaceSelector();

  const hostProjectsAvailable =
    projectsLoadError?.message !== 'Not in project provider' &&
    (projectsLoaded || projectsLoadError !== undefined);

  // Always pass an explicit list. ProjectSelector's own ProjectsContext can be a different
  // module instance under Module Federation, so relying on it shows "No projects" incorrectly.
  const namespacesOverride = hostProjectsAvailable
    ? projects.map((project) => ({
        name: project.metadata.name,
        displayName: getDisplayNameFromK8sResource(project),
      }))
    : namespaces;

  return (
    <div data-testid="maas-external-resources-project-selector">
      <ProjectSelector
        {...projectSelectorProps}
        showTitle
        onSelection={(projectName) => {
          if (hostProjectsAvailable) {
            const hostMatch = projectName
              ? (projects.find((p) => p.metadata.name === projectName) ?? null)
              : null;
            updatePreferredProject(hostMatch);
            updatePreferredNamespace(hostMatch ? { name: hostMatch.metadata.name } : undefined);
          } else {
            const match = projectName
              ? (namespaces.find((n) => n.name === projectName) ?? undefined)
              : undefined;
            updatePreferredNamespace(match);
          }
          navigate(pathFunction(projectName));
        }}
        namespace={namespace}
        isLoading={hostProjectsAvailable ? !projectsLoaded : !modArchLoaded}
        namespacesOverride={namespacesOverride}
      />
    </div>
  );
};

export default MaaSExternalResourcesProjectSelector;
