import * as React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import ProjectSelector from './ProjectSelector';

type ProjectSelectorProps = {
  getRedirectPath: (namespace: string) => string;
  queryParamNamespace?: string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const ProjectSelectorNavigator: React.FC<ProjectSelectorProps> = ({
  getRedirectPath,
  queryParamNamespace,
  ...projectSelectorProps
}) => {
  const navigate = useNavigate();
  const { namespace: pathNamespace } = useParams();
  const { projects, updatePreferredProject } = React.useContext(ProjectsContext);
  const [searchParams] = useSearchParams();
  const queryNamespace = queryParamNamespace ? searchParams.get(queryParamNamespace) : null;
  const namespace = pathNamespace || queryNamespace || '';

  return (
    <ProjectSelector
      {...projectSelectorProps}
      onSelection={(projectName) => {
        const match = projectName ? projects.find(byName(projectName)) ?? null : null;
        updatePreferredProject(match);
        navigate(getRedirectPath(projectName));
      }}
      namespace={namespace}
    />
  );
};

export default ProjectSelectorNavigator;
