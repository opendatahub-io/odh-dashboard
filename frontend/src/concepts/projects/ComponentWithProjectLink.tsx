import { Divider, Flex } from '@patternfly/react-core';
import React from 'react';
import ProjectNavigatorLink from '~/concepts/projects/ProjectNavigatorLink';
import { ProjectKind } from '~/k8sTypes';

type ComponentWithProjectLinkProps = {
  children: React.ReactNode;
  project: ProjectKind;
};

const ComponentWithProjectLink: React.FC<ComponentWithProjectLinkProps> = ({
  project,
  children,
}) => (
  <Flex spaceItems={{ default: 'spaceItemsSm' }}>
    {children}
    <Divider
      orientation={{
        default: 'vertical',
      }}
      style={{ height: '1rem', alignSelf: 'center', marginRight: 0 }}
    />
    <ProjectNavigatorLink project={project} iconSize="md" fontSize="sm" />
  </Flex>
);

export default ComponentWithProjectLink;
