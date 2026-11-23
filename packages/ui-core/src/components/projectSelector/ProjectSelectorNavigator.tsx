import * as React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { byName } from '@odh-dashboard/k8s-core';
import ProjectSelector from './ProjectSelector';
import WorkingProjectNavigationAdapter from './WorkingProjectNavigationAdapter';
import { ProjectsContext } from '../../context/ProjectsContext';
import { useWorkingProject } from '../../context/WorkingProjectContext';

type ProjectSelectorNavigatorProps = {
  getRedirectPath: (namespace: string) => string;
  queryParamNamespace?: string;
  onProjectChange?: (projectName: string) => void;
  /** Viewed-project routes must not follow changes to the active working project. */
  syncWorkingProject?: boolean;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const ProjectSelectorNavigator: React.FC<ProjectSelectorNavigatorProps> = ({
  getRedirectPath,
  queryParamNamespace,
  onProjectChange,
  syncWorkingProject = true,
  ...projectSelectorProps
}) => {
  const { namespace: pathNamespace } = useParams();
  const { projects, updatePreferredProject } = React.useContext(ProjectsContext);
  const [searchParams] = useSearchParams();
  const queryNamespace = queryParamNamespace ? searchParams.get(queryParamNamespace) : null;
  const namespace = pathNamespace || queryNamespace || '';
  const { registerProjectNavigation } = useWorkingProject();

  return (
    <>
      {syncWorkingProject && registerProjectNavigation && (
        <WorkingProjectNavigationAdapter getRedirectPath={getRedirectPath} />
      )}
      <ProjectSelector
        {...projectSelectorProps}
        getSelectionHref={(projectName) => getRedirectPath(projectName)}
        onSelection={(projectName) => {
          const match = projectName ? projects.find(byName(projectName)) ?? null : null;
          updatePreferredProject(match);
          if (projectName && projectName !== namespace) {
            onProjectChange?.(projectName);
          }
        }}
        namespace={namespace}
      />
    </>
  );
};

export default ProjectSelectorNavigator;
