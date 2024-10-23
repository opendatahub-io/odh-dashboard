import { EmptyState, EmptyStateVariant, Spinner, Bullseye } from '@patternfly/react-core';
import * as React from 'react';

const ProjectsLoading: React.FC = () => (
  <div style={{ height: '230px' }}>
    <Bullseye>
      <EmptyState
        headingLevel="h1"
        titleText="Loading"
        variant={EmptyStateVariant.lg}
        data-id="loading-empty-state"
      >
        <Spinner size="xl" />
      </EmptyState>
    </Bullseye>
  </div>
);

export default ProjectsLoading;
