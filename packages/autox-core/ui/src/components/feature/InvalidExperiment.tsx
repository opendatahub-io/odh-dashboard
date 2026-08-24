import * as React from 'react';
import { ActionableEmptyState } from '../primitive';

interface InvalidExperimentProps {
  productName: string;
}

function InvalidExperiment({ productName }: InvalidExperimentProps): React.JSX.Element {
  return (
    <ActionableEmptyState
      titleText="Experiment not found"
      body={`The ${productName} experiment was not found.`}
    />
  );
}

export default InvalidExperiment;
