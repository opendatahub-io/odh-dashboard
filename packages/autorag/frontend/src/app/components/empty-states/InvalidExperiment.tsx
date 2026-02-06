import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import * as React from 'react';

function InvalidExperiment(): React.JSX.Element {
  return (
    <EmptyState titleText="Experiment not found" headingLevel="h4">
      <EmptyStateBody>The AutoRAG experiment was not found.</EmptyStateBody>
    </EmptyState>
  );
}

export default InvalidExperiment;
