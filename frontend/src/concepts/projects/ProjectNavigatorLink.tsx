import React from 'react';
import { Button, Flex, FlexItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { ProjectIconWithSize } from '#~/concepts/projects/ProjectIconWithSize';
import { IconSize, Namespace } from '#~/types';

type ProjectNavigatorLinkProps = {
  namespace?: Namespace;
};

const ProjectNavigatorLink: React.FC<ProjectNavigatorLinkProps> = ({ namespace }) => {
  const navigate = useNavigate();

  if (!namespace) {
    return null;
  }

  return (
    <Button
      variant="link"
      component="a"
      onClick={() => {
        navigate(`/projects/${namespace.name}`);
      }}
      data-testid="project-navigator-link"
    >
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
