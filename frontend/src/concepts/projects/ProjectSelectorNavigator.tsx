import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import ProjectSelector from './ProjectSelector';

type ProjectSelectorProps = {
  getRedirectPath: (namespace: string) => string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const ProjectSelectorNavigator: React.FC<ProjectSelectorProps> = ({
  getRedirectPath,
  ...projectSelectorProps
}) => {
  const navigate = useNavigate();
  const { namespace } = useParams();
  const { projects, updatePreferredProject } = React.useContext(ProjectsContext);

  return (
    <ProjectSelector
      {...projectSelectorProps}
      onSelection={(projectName) => {
        const match = projectName ? projects.find(byName(projectName)) ?? null : null;
        updatePreferredProject(match);
        navigate(getRedirectPath(projectName));
      }}
      namespace={namespace ?? ''}
    />
  );
};

export default ProjectSelectorNavigator;
