import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import * as React from 'react';

interface InvalidExperimentProps {
  productName: string;
}

function InvalidExperiment({ productName }: InvalidExperimentProps): React.JSX.Element {
  return (
    <EmptyState titleText="Experiment not found" headingLevel="h4">
      <EmptyStateBody>The {productName} experiment was not found.</EmptyStateBody>
    </EmptyState>
  );
}

export default InvalidExperiment;
