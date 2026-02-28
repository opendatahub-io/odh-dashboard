import React from 'react';
import { Button, Flex, FlexItem } from '@patternfly/react-core';
import { ProjectIconWithSize } from '#~/concepts/projects/ProjectIconWithSize';
import { IconSize, Namespace } from '#~/types';

type ProjectNavigatorLinkProps = {
  namespace?: Namespace;
};

const ProjectNavigatorLink: React.FC<ProjectNavigatorLinkProps> = ({ namespace }) => {
  if (!namespace) {
    return null;
  }

  const href = `/projects/${namespace.name}`;

  return (
    <Button variant="link" component="a" href={href} data-testid="project-navigator-link">
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
        <FlexItem>Go to</FlexItem>
        <ProjectIconWithSize size={IconSize.LG} />
        <FlexItem>
          <strong>{namespace.displayName}</strong>
        </FlexItem>
      </Flex>
    </Button>
  );
};

export default ProjectNavigatorLink;
