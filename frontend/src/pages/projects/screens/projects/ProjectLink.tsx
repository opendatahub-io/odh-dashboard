import * as React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { ProjectKind } from '~/k8sTypes';

type ProjectLinkProps = {
  project: ProjectKind;
};

const ProjectLink: React.FC<Omit<LinkProps, 'to'> & ProjectLinkProps> = ({ project, ...props }) => {
  const projectName = getDisplayNameFromK8sResource(project);

  return (
    <Link to={`/projects/${project.metadata.name}`} {...props}>
      {projectName}
    </Link>
  );
};

export default ProjectLink;
