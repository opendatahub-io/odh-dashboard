import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import * as React from 'react';

interface InvalidPipelineRunProps {
  productName: string;
}

function InvalidPipelineRun({ productName }: InvalidPipelineRunProps): React.JSX.Element {
  return (
    <EmptyState titleText="Run not found" headingLevel="h4">
      <EmptyStateBody>The {productName} pipeline run was not found.</EmptyStateBody>
    </EmptyState>
  );
}

export default InvalidPipelineRun;
