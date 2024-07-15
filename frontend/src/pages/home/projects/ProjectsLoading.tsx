import {
  EmptyState,
  EmptyStateVariant,
  Spinner,
  EmptyStateHeader,
  Bullseye,
} from '@patternfly/react-core';
import * as React from 'react';

const ProjectsLoading: React.FC = () => (
  <div style={{ height: '230px' }}>
    <Bullseye>
      <EmptyState variant={EmptyStateVariant.lg} data-id="loading-empty-state">
        <Spinner size="xl" />
        <EmptyStateHeader titleText="Loading" headingLevel="h1" />
      </EmptyState>
    </Bullseye>
  </div>
);

export default ProjectsLoading;
