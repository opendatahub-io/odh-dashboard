import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { ProjectIcon } from '~/images/icons';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';

type ProjectLinkProps = {
  namespace?: string;
};

const ProjectLink: React.FC<ProjectLinkProps> = ({ namespace }) => {
  const { projects } = React.useContext(ProjectsContext);

  if (!namespace) {
    return null;
  }

  const project = projects.find((p) => p.metadata.name === namespace);
  if (!project) {
    return null;
  }

  const projectName = getDisplayNameFromK8sResource(project);

  return (
    <Link to={`/projects/${project.metadata.name}`} style={{ textDecoration: 'none' }}>
      <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>Go to</FlexItem>
        <FlexItem>
          <ProjectIcon />
        </FlexItem>
        <FlexItem style={{ fontWeight: 500 }}>{projectName}</FlexItem>
      </Flex>
    </Link>
  );
};

export default ProjectLink;
