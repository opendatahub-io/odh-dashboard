import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

const ProjectSharing: React.FC = () => (
  <EmptyState variant="xs">
    <EmptyStateIcon icon={CubesIcon} />
    <Title headingLevel="h5" size="lg">
      Project sharing is not enabled
    </Title>
    <EmptyStateBody>
      Add users and groups that can access the project. Edit allows users to view and make changes
      to the project. Admin allows users to also add and remove new users to the project
    </EmptyStateBody>
  </EmptyState>
);

export default ProjectSharing;
