import React from 'react';
import { Button, Flex, FlexItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { ProjectKind } from '#~/k8sTypes';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { ProjectIconWithSize } from '#~/concepts/projects/ProjectIconWithSize';
import { FontSize, IconSize } from '#~/types';

type ProjectNavigatorLinkProps = {
  project?: ProjectKind;
  fontSize?: FontSize;
  iconSize?: IconSize;
};

const ProjectNavigatorLink: React.FC<ProjectNavigatorLinkProps> = ({
  project,
  iconSize = IconSize.LG,
  fontSize = FontSize.DEFAULT,
}) => {
  const navigate = useNavigate();

  if (!project) {
    return null;
  }

  return (
    <Button
      variant="link"
      component="a"
      onClick={() => {
        navigate(`/projects/${project.metadata.name}`);
      }}
      style={{ fontSize: `var(--pf-t--global--font--size--body--${fontSize})` }}
      data-testid="project-navigator-link"
    >
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
        <FlexItem>Go to</FlexItem>
        <ProjectIconWithSize size={iconSize} />
        <FlexItem>
          <b>{getDisplayNameFromK8sResource(project)}</b>
        </FlexItem>
      </Flex>
    </Button>
  );
};

export default ProjectNavigatorLink;
