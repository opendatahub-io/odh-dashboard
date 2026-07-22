import * as React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { byName } from '@odh-dashboard/k8s-core';
import { ProjectsContext } from '../../context/ProjectsContext';
import ProjectSelector from './ProjectSelector';

type ProjectSelectorNavigatorProps = {
  getRedirectPath: (namespace: string) => string;
  queryParamNamespace?: string;
  onProjectChange?: (projectName: string) => void;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const ProjectSelectorNavigator: React.FC<ProjectSelectorNavigatorProps> = ({
  getRedirectPath,
  queryParamNamespace,
  onProjectChange,
  ...projectSelectorProps
}) => {
  const { namespace: pathNamespace } = useParams();
  const { projects, updatePreferredProject } = React.useContext(ProjectsContext);
  const [searchParams] = useSearchParams();
  const queryNamespace = queryParamNamespace ? searchParams.get(queryParamNamespace) : null;
  const namespace = pathNamespace || queryNamespace || '';

  return (
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
  );
};

export default ProjectSelectorNavigator;
