import * as React from 'react';
import { Link } from 'react-router-dom';
import { ProjectKind } from '~/k8sTypes';
import { getProjectDisplayName } from '~/concepts/projects/utils';

type ProjectLinkProps = {
  project: ProjectKind;
};

const ProjectLink: React.FC<ProjectLinkProps> = ({ project }) => {
  const projectName = getProjectDisplayName(project);

  return <Link to={`/projects/${project.metadata.name}`}>{projectName}</Link>;
};

export default ProjectLink;
