import * as React from 'react';
import { Skeleton } from '@patternfly/react-core';

const ProjectsLoading: React.FC = () => (
  <div style={{ height: '230px' }}>
    <Skeleton height="75%" width="100%" screenreaderText="Loading projects" />
  </div>
);

export default ProjectsLoading;
