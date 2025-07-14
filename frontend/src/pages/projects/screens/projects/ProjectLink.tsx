import { Truncate } from '@patternfly/react-core';
import * as React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { ProjectKind } from '#~/k8sTypes';

type ProjectLinkProps = {
  project: ProjectKind;
};

const ProjectLink: React.FC<Omit<LinkProps, 'to'> & ProjectLinkProps> = ({ project, ...props }) => {
  const projectName = getDisplayNameFromK8sResource(project);

  return (
    <Link to={`/projects/${project.metadata.name}`} {...props}>
      <Truncate content={projectName} />
    </Link>
  );
};

export default ProjectLink;
