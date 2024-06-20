import * as React from 'react';
import { Link } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { ProjectKind } from '~/k8sTypes';

type ProjectLinkProps = {
  project: ProjectKind;
};

const ProjectLink: React.FC<ProjectLinkProps> = ({ project }) => {
  const projectName = getDisplayNameFromK8sResource(project);

  return <Link to={`/projects/${project.metadata.name}`}>{projectName}</Link>;
};

export default ProjectLink;
