import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

  return (
    <ProjectSelector
      {...projectSelectorProps}
      onSelection={(project) => {
        navigate(getRedirectPath(project.metadata.name));
      }}
      namespace={namespace ?? ''}
    />
  );
};

export default ProjectSelectorNavigator;
