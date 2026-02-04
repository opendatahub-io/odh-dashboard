import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import * as React from 'react';

function InvalidPipelineRun(): React.JSX.Element {
  return (
    <EmptyState titleText="Run not found" headingLevel="h4">
      <EmptyStateBody>The AutoRAG pipeline run was not found.</EmptyStateBody>
    </EmptyState>
  );
}

export default InvalidPipelineRun;
