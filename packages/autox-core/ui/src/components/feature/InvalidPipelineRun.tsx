import * as React from 'react';
import { ActionableEmptyState } from '../primitive';

interface InvalidPipelineRunProps {
  productName: string;
}

function InvalidPipelineRun({ productName }: InvalidPipelineRunProps): React.JSX.Element {
  return (
    <ActionableEmptyState
      titleText="Run not found"
      body={`The ${productName} pipeline run was not found.`}
    />
  );
}

export default InvalidPipelineRun;
