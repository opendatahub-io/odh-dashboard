import { Truncate } from '@patternfly/react-core';
import * as React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';

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
